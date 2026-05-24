import { describe, it, expect, vi, afterEach } from 'vitest'
import worker from '../auth-api.js'
import { signJWT } from '../utils/jwt.js'

const JWT_SECRET = 'test-jwt-secret'
const USER_ID = 'user-1'
const BASE = 'https://api.example.com'
const PAYSTACK_IP = '52.31.139.75'

// Mock DB modeling the memorial_premium table + a single user. Branches on the
// exact SQL the premium handlers + webhook run.
function makeMockDb({ premium = [], user = { id: USER_ID, email: 'buyer@example.com' } } = {}) {
  const state = { premium: premium.map((p) => ({ ...p })), user }
  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.startsWith('INSERT INTO memorial_premium')) {
            state.premium.push({
              id: args[0], memorial_id: args[1], paystack_reference: args[2],
              amount_pesewas: args[3], buyer_user_id: args[4], created_at: args[5],
              tier: 'tribute', status: 'pending',
            })
            return { meta: { changes: 1 } }
          }
          if (sql.startsWith('UPDATE memorial_premium') && sql.includes("'succeeded'")) {
            const row = state.premium.find((p) => p.id === args[1] && p.status === 'pending')
            if (row) { row.status = 'succeeded'; row.succeeded_at = args[0]; return { meta: { changes: 1 } } }
            return { meta: { changes: 0 } }
          }
          if (sql.startsWith('UPDATE memorial_premium') && sql.includes("'failed'")) {
            const row = state.premium.find((p) => p.id === args[0])
            if (row) row.status = 'failed'
            return { meta: { changes: 1 } }
          }
          return { meta: { changes: 0 } } // audit_log etc.
        },
        first: async () => {
          if (sql.includes('FROM memorial_premium') && sql.includes('memorial_id = ?') && sql.includes("status = 'succeeded'")) {
            return state.premium.find((p) => p.memorial_id === args[0] && p.status === 'succeeded') || null
          }
          if (sql.includes('FROM memorial_premium') && sql.includes('paystack_reference = ?') && sql.includes('buyer_user_id = ?')) {
            return state.premium.find((p) => p.paystack_reference === args[0] && p.buyer_user_id === args[1]) || null
          }
          if (sql.includes('FROM memorial_premium') && sql.includes('paystack_reference = ?')) {
            return state.premium.find((p) => p.paystack_reference === args[0]) || null
          }
          if (sql.includes('FROM users WHERE id = ?')) return state.user
          if (sql.includes('FROM orders WHERE paystack_reference = ?')) return null
          return null
        },
        all: async () => ({ results: [] }),
      }),
    }),
  }
}

function makeEnv(dbOpts) {
  return {
    JWT_SECRET,
    PAYSTACK_SECRET_KEY: 'sk_test_fake',
    CORS_ORIGIN: 'https://funeralpress.org',
    ENVIRONMENT: 'dev',
    DB: makeMockDb(dbOpts),
    RATE_LIMITS: { get: async () => null, put: async () => undefined },
    OTP_KV: { get: async () => null, put: async () => undefined },
    MEMORIAL_PAGES_KV: { get: async () => null, put: async () => undefined },
  }
}

async function authedReq(path, body) {
  const token = await signJWT({ sub: USER_ID, email: 'buyer@example.com', exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET)
  return new Request(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'CF-Connecting-IP': '1.2.3.4' },
    body: JSON.stringify(body),
  })
}

async function hmacHex(body, secret) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

afterEach(() => { vi.restoreAllMocks() })

describe('GET /memorial-premium/:id (status)', () => {
  it('returns premium:true for a succeeded entitlement', async () => {
    const env = makeEnv({ premium: [{ id: 'p1', memorial_id: 'mem1', status: 'succeeded', tier: 'tribute' }] })
    const res = await worker.fetch(new Request(`${BASE}/memorial-premium/mem1`, { headers: { 'CF-Connecting-IP': '1.2.3.4' } }), env)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ premium: true, tier: 'tribute' })
  })

  it('returns premium:false when none', async () => {
    const env = makeEnv({ premium: [] })
    const res = await worker.fetch(new Request(`${BASE}/memorial-premium/memX`, { headers: { 'CF-Connecting-IP': '1.2.3.4' } }), env)
    expect(await res.json()).toEqual({ premium: false, tier: null })
  })

  it('ignores pending rows (not yet paid)', async () => {
    const env = makeEnv({ premium: [{ id: 'p1', memorial_id: 'mem1', status: 'pending', tier: 'tribute' }] })
    const res = await worker.fetch(new Request(`${BASE}/memorial-premium/mem1`, { headers: { 'CF-Connecting-IP': '1.2.3.4' } }), env)
    expect((await res.json()).premium).toBe(false)
  })
})

describe('POST /memorial-premium/initialize', () => {
  it('creates a pending row and returns reference/amount/email', async () => {
    const env = makeEnv({})
    const res = await worker.fetch(await authedReq('/memorial-premium/initialize', { memorialId: 'mem1' }), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.amount).toBe(15000)
    expect(body.email).toBe('buyer@example.com')
    expect(body.currency).toBe('GHS')
    expect(body.reference).toMatch(/^fp-premium-/)
    expect(env.DB._state.premium).toHaveLength(1)
    expect(env.DB._state.premium[0].status).toBe('pending')
  })

  it('rejects missing memorialId', async () => {
    const env = makeEnv({})
    const res = await worker.fetch(await authedReq('/memorial-premium/initialize', {}), env)
    expect(res.status).toBe(400)
  })

  it('409s when the memorial is already premium', async () => {
    const env = makeEnv({ premium: [{ id: 'p1', memorial_id: 'mem1', status: 'succeeded' }] })
    const res = await worker.fetch(await authedReq('/memorial-premium/initialize', { memorialId: 'mem1' }), env)
    expect(res.status).toBe(409)
  })

  it('401s without auth', async () => {
    const env = makeEnv({})
    const res = await worker.fetch(new Request(`${BASE}/memorial-premium/initialize`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' }, body: JSON.stringify({ memorialId: 'mem1' }),
    }), env)
    expect(res.status).toBe(401)
  })
})

describe('POST /memorial-premium/verify', () => {
  it('marks succeeded when Paystack confirms a matching amount', async () => {
    const env = makeEnv({ premium: [{ id: 'p1', memorial_id: 'mem1', status: 'pending', paystack_reference: 'fp-premium-abc', amount_pesewas: 15000, buyer_user_id: USER_ID }] })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: true, data: { status: 'success', amount: 15000 } }), { status: 200 }))
    const res = await worker.fetch(await authedReq('/memorial-premium/verify', { reference: 'fp-premium-abc' }), env)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ verified: true, premium: true })
    expect(env.DB._state.premium[0].status).toBe('succeeded')
  })

  it('400s on amount mismatch', async () => {
    const env = makeEnv({ premium: [{ id: 'p1', memorial_id: 'mem1', status: 'pending', paystack_reference: 'fp-premium-abc', amount_pesewas: 15000, buyer_user_id: USER_ID }] })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: true, data: { status: 'success', amount: 100 } }), { status: 200 }))
    const res = await worker.fetch(await authedReq('/memorial-premium/verify', { reference: 'fp-premium-abc' }), env)
    expect(res.status).toBe(400)
    expect(env.DB._state.premium[0].status).toBe('pending')
  })

  it('is idempotent for an already-succeeded entitlement', async () => {
    const env = makeEnv({ premium: [{ id: 'p1', memorial_id: 'mem1', status: 'succeeded', paystack_reference: 'fp-premium-abc', amount_pesewas: 15000, buyer_user_id: USER_ID }] })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const res = await worker.fetch(await authedReq('/memorial-premium/verify', { reference: 'fp-premium-abc' }), env)
    expect(await res.json()).toMatchObject({ verified: true, premium: true })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('POST /payments/webhook (fp-premium- branch)', () => {
  it('grants entitlement on charge.success for a premium reference', async () => {
    const env = makeEnv({ premium: [{ id: 'p1', memorial_id: 'mem1', status: 'pending', paystack_reference: 'fp-premium-abc', amount_pesewas: 15000, buyer_user_id: USER_ID }] })
    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'fp-premium-abc', amount: 15000 } })
    const sig = await hmacHex(body, 'sk_test_fake')
    const res = await worker.fetch(new Request(`${BASE}/payments/webhook`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': PAYSTACK_IP, 'x-paystack-signature': sig }, body,
    }), env)
    expect(res.status).toBe(200)
    expect(env.DB._state.premium[0].status).toBe('succeeded')
  })
})
