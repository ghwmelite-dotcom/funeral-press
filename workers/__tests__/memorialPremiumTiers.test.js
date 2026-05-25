import { describe, it, expect, vi, afterEach } from 'vitest'
import worker from '../auth-api.js'
import { signJWT } from '../utils/jwt.js'

const JWT_SECRET = 'test-jwt-secret'
const USER_ID = 'user-tier-1'
const BASE = 'https://api.example.com'
const PAYSTACK_IP = '52.31.139.75'

// ─── Mock DB ──────────────────────────────────────────────────────────────────

function makeMockDb({ premium = [], user = { id: USER_ID, email: 'buyer@example.com' } } = {}) {
  const state = { premium: premium.map((p) => ({ ...p })), user }
  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.startsWith('INSERT INTO memorial_premium')) {
            // Bind order mirrors handlePremiumInitialize:
            // id, memorial_id, tier, reference, amount_pesewas, buyer_user_id, created_at
            // SQL: VALUES (?, ?, ?, 'pending', ?, ?, 'GHS', ?, 'lifetime', NULL, ?)
            state.premium.push({
              id: args[0],
              memorial_id: args[1],
              tier: args[2],
              paystack_reference: args[3],
              amount_pesewas: args[4],
              buyer_user_id: args[5],
              created_at: args[6],
              plan_type: 'lifetime',
              expires_at: null,
              status: 'pending',
            })
            return { meta: { changes: 1 } }
          }
          if (sql.startsWith('UPDATE memorial_premium') && sql.includes("'succeeded'")) {
            // markPremiumSucceeded: bind(Date.now(), row.id)
            const row = state.premium.find((p) => p.id === args[1] && p.status === 'pending')
            if (row) {
              row.status = 'succeeded'
              row.succeeded_at = args[0]
              return { meta: { changes: 1 } }
            }
            return { meta: { changes: 0 } }
          }
          if (sql.startsWith('UPDATE memorial_premium') && sql.includes("'failed'")) {
            const row = state.premium.find((p) => p.id === args[0])
            if (row) row.status = 'failed'
            return { meta: { changes: 1 } }
          }
          return { meta: { changes: 0 } }
        },
        first: async () => {
          if (
            sql.includes('FROM memorial_premium') &&
            sql.includes('memorial_id = ?') &&
            sql.includes("status = 'succeeded'")
          ) {
            return state.premium.find((p) => p.memorial_id === args[0] && p.status === 'succeeded') || null
          }
          if (
            sql.includes('FROM memorial_premium') &&
            sql.includes('paystack_reference = ?') &&
            sql.includes('buyer_user_id = ?')
          ) {
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
  const token = await signJWT(
    { sub: USER_ID, email: 'buyer@example.com', exp: Math.floor(Date.now() / 1000) + 3600 },
    JWT_SECRET
  )
  return new Request(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'CF-Connecting-IP': '1.2.3.4',
    },
    body: JSON.stringify(body),
  })
}

async function hmacHex(body, secret) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

afterEach(() => { vi.restoreAllMocks() })

// ─── initialize — tier routing ────────────────────────────────────────────────

describe('POST /memorial-premium/initialize — tier-aware lifetime', () => {
  it('premium lifetime → inserts row with tier=premium, amount_pesewas=30000, plan_type=lifetime, expires_at=null; response amount=30000, currency=GHS', async () => {
    const env = makeEnv({})
    const res = await worker.fetch(
      await authedReq('/memorial-premium/initialize', { memorialId: 'mem-prem', tier: 'premium', planType: 'lifetime' }),
      env
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.amount).toBe(30000)
    expect(body.currency).toBe('GHS')
    expect(body.email).toBe('buyer@example.com')
    expect(body.reference).toMatch(/^fp-premium-/)

    expect(env.DB._state.premium).toHaveLength(1)
    const row = env.DB._state.premium[0]
    expect(row.tier).toBe('premium')
    expect(row.amount_pesewas).toBe(30000)
    expect(row.plan_type).toBe('lifetime')
    expect(row.expires_at).toBeNull()
    expect(row.paystack_reference).toMatch(/^fp-premium-/)
    expect(row.status).toBe('pending')
  })

  it('heritage lifetime → inserts row with tier=heritage, amount_pesewas=70000', async () => {
    const env = makeEnv({})
    const res = await worker.fetch(
      await authedReq('/memorial-premium/initialize', { memorialId: 'mem-heri', tier: 'heritage', planType: 'lifetime' }),
      env
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.amount).toBe(70000)
    expect(body.currency).toBe('GHS')
    expect(body.reference).toMatch(/^fp-premium-/)

    const row = env.DB._state.premium[0]
    expect(row.tier).toBe('heritage')
    expect(row.amount_pesewas).toBe(70000)
    expect(row.plan_type).toBe('lifetime')
    expect(row.expires_at).toBeNull()
  })

  it('default (no tier / no planType) → premium lifetime (backward-compatible)', async () => {
    const env = makeEnv({})
    const res = await worker.fetch(
      await authedReq('/memorial-premium/initialize', { memorialId: 'mem-default' }),
      env
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.amount).toBe(30000)

    const row = env.DB._state.premium[0]
    expect(row.tier).toBe('premium')
    expect(row.plan_type).toBe('lifetime')
  })

  it('tier=free → 400 (free tier is not purchasable)', async () => {
    const env = makeEnv({})
    const res = await worker.fetch(
      await authedReq('/memorial-premium/initialize', { memorialId: 'mem-bad', tier: 'free' }),
      env
    )
    expect(res.status).toBe(400)
    expect(env.DB._state.premium).toHaveLength(0)
  })

  it('unknown tier → 400', async () => {
    const env = makeEnv({})
    const res = await worker.fetch(
      await authedReq('/memorial-premium/initialize', { memorialId: 'mem-bad', tier: 'diamond' }),
      env
    )
    expect(res.status).toBe(400)
    expect(env.DB._state.premium).toHaveLength(0)
  })

  it('planType=annual → 400 (annual not yet supported in this handler)', async () => {
    const env = makeEnv({})
    const res = await worker.fetch(
      await authedReq('/memorial-premium/initialize', { memorialId: 'mem-annual', tier: 'premium', planType: 'annual' }),
      env
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/annual/i)
    expect(env.DB._state.premium).toHaveLength(0)
  })

  it('amount is always server-side — client-supplied amount is ignored', async () => {
    // Attacker sends an absurdly low amount; server must use TIERS catalog
    const env = makeEnv({})
    const res = await worker.fetch(
      await authedReq('/memorial-premium/initialize', { memorialId: 'mem-hack', tier: 'heritage', amount: 1 }),
      env
    )
    expect(res.status).toBe(200)
    expect((await res.json()).amount).toBe(70000)
    expect(env.DB._state.premium[0].amount_pesewas).toBe(70000)
  })
})

// ─── markPremiumSucceeded preserves tier + plan_type ─────────────────────────

describe('markPremiumSucceeded — preserves tier + plan_type', () => {
  it('after verify succeeds, row keeps tier=premium and plan_type=lifetime, status=succeeded', async () => {
    const env = makeEnv({
      premium: [{
        id: 'p-preserve',
        memorial_id: 'mem-preserve',
        status: 'pending',
        paystack_reference: 'fp-premium-preserve',
        amount_pesewas: 30000,
        tier: 'premium',
        plan_type: 'lifetime',
        expires_at: null,
        buyer_user_id: USER_ID,
      }],
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: { status: 'success', amount: 30000 } }), { status: 200 })
    )
    const res = await worker.fetch(
      await authedReq('/memorial-premium/verify', { reference: 'fp-premium-preserve' }),
      env
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ verified: true, premium: true })

    const row = env.DB._state.premium[0]
    expect(row.status).toBe('succeeded')
    expect(row.tier).toBe('premium')       // must not be overwritten
    expect(row.plan_type).toBe('lifetime') // must not be overwritten
    expect(row.expires_at).toBeNull()
  })

  it('after verify succeeds for heritage, row keeps tier=heritage and plan_type=lifetime', async () => {
    const env = makeEnv({
      premium: [{
        id: 'p-heri',
        memorial_id: 'mem-heri',
        status: 'pending',
        paystack_reference: 'fp-premium-heri',
        amount_pesewas: 70000,
        tier: 'heritage',
        plan_type: 'lifetime',
        expires_at: null,
        buyer_user_id: USER_ID,
      }],
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: { status: 'success', amount: 70000 } }), { status: 200 })
    )
    const res = await worker.fetch(
      await authedReq('/memorial-premium/verify', { reference: 'fp-premium-heri' }),
      env
    )
    expect(res.status).toBe(200)

    const row = env.DB._state.premium[0]
    expect(row.status).toBe('succeeded')
    expect(row.tier).toBe('heritage')
    expect(row.plan_type).toBe('lifetime')
  })
})

// ─── verify amount-check uses row amount (not a fixed constant) ───────────────

describe('handlePremiumVerify — amount check uses row.amount_pesewas', () => {
  it('heritage row (70000) verifies against 70000, not the old 15000 constant', async () => {
    const env = makeEnv({
      premium: [{
        id: 'p-h2',
        memorial_id: 'mem-h2',
        status: 'pending',
        paystack_reference: 'fp-premium-h2',
        amount_pesewas: 70000,
        tier: 'heritage',
        plan_type: 'lifetime',
        expires_at: null,
        buyer_user_id: USER_ID,
      }],
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: { status: 'success', amount: 70000 } }), { status: 200 })
    )
    const res = await worker.fetch(
      await authedReq('/memorial-premium/verify', { reference: 'fp-premium-h2' }),
      env
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ verified: true })
    expect(env.DB._state.premium[0].status).toBe('succeeded')
  })

  it('heritage row (70000) with Paystack amount=15000 → amount mismatch 400', async () => {
    const env = makeEnv({
      premium: [{
        id: 'p-h3',
        memorial_id: 'mem-h3',
        status: 'pending',
        paystack_reference: 'fp-premium-h3',
        amount_pesewas: 70000,
        tier: 'heritage',
        plan_type: 'lifetime',
        expires_at: null,
        buyer_user_id: USER_ID,
      }],
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: { status: 'success', amount: 15000 } }), { status: 200 })
    )
    const res = await worker.fetch(
      await authedReq('/memorial-premium/verify', { reference: 'fp-premium-h3' }),
      env
    )
    expect(res.status).toBe(400)
    expect(env.DB._state.premium[0].status).toBe('pending')
  })
})

// ─── webhook backstop handles tiered rows ────────────────────────────────────

describe('POST /payments/webhook (fp-premium- branch) — tiered rows', () => {
  it('grants heritage entitlement on charge.success with correct amount', async () => {
    const env = makeEnv({
      premium: [{
        id: 'p-wh',
        memorial_id: 'mem-wh',
        status: 'pending',
        paystack_reference: 'fp-premium-wh',
        amount_pesewas: 70000,
        tier: 'heritage',
        plan_type: 'lifetime',
        buyer_user_id: USER_ID,
      }],
    })
    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'fp-premium-wh', amount: 70000 } })
    const sig = await hmacHex(body, 'sk_test_fake')
    const res = await worker.fetch(new Request(`${BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': PAYSTACK_IP,
        'x-paystack-signature': sig,
      },
      body,
    }), env)
    expect(res.status).toBe(200)
    expect(env.DB._state.premium[0].status).toBe('succeeded')
    expect(env.DB._state.premium[0].tier).toBe('heritage') // preserved by markPremiumSucceeded
  })

  it('does NOT grant heritage entitlement when webhook amount mismatches row amount', async () => {
    const env = makeEnv({
      premium: [{
        id: 'p-wh2',
        memorial_id: 'mem-wh2',
        status: 'pending',
        paystack_reference: 'fp-premium-wh2',
        amount_pesewas: 70000,
        tier: 'heritage',
        plan_type: 'lifetime',
        buyer_user_id: USER_ID,
      }],
    })
    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'fp-premium-wh2', amount: 30000 } })
    const sig = await hmacHex(body, 'sk_test_fake')
    const res = await worker.fetch(new Request(`${BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': PAYSTACK_IP,
        'x-paystack-signature': sig,
      },
      body,
    }), env)
    expect(res.status).toBe(200)
    expect(env.DB._state.premium[0].status).toBe('pending')
  })
})
