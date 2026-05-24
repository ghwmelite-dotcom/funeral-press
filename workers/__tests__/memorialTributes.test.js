import { describe, it, expect, vi, afterEach } from 'vitest'
import worker from '../auth-api.js'

const BASE = 'https://api.example.com'
const PAYSTACK_IP = '52.31.139.75'
const PAYSTACK_SECRET = 'sk_test_fake'

// ─── Mock DB ─────────────────────────────────────────────────────────────────

function makeMockDb({ tributes = [] } = {}) {
  const state = { tributes: tributes.map((t) => ({ ...t })) }
  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.startsWith('INSERT INTO memorial_tributes')) {
            state.tributes.push({
              id: args[0],
              memorial_id: args[1],
              type: args[2],
              author_name: args[3],
              message: args[4],
              amount_pesewas: args[5],
              paystack_reference: args[6],
              status: 'pending',
              created_at: args[7],
              paid_at: null,
            })
            return { meta: { changes: 1 } }
          }
          if (
            sql.includes("UPDATE memorial_tributes SET status='paid'") ||
            sql.includes('UPDATE memorial_tributes SET status=')
          ) {
            // args: paid_at, id (AND status='pending' guard)
            const row = state.tributes.find((t) => t.id === args[1] && t.status === 'pending')
            if (row) { row.status = 'paid'; row.paid_at = args[0] }
            return { meta: { changes: row ? 1 : 0 } }
          }
          return { meta: { changes: 0 } }
        },
        first: async () => {
          if (sql.includes('FROM memorial_tributes') && sql.includes('paystack_reference = ?')) {
            return state.tributes.find((t) => t.paystack_reference === args[0]) || null
          }
          // Fallback: orders / premium / users lookups return null (not relevant here)
          return null
        },
        all: async () => {
          if (
            sql.includes('FROM memorial_tributes') &&
            sql.includes('memorial_id = ?') &&
            sql.includes("status = 'paid'")
          ) {
            const paid = state.tributes.filter((t) => t.memorial_id === args[0] && t.status === 'paid')
            return { results: paid }
          }
          return { results: [] }
        },
      }),
    }),
  }
}

function makeEnv(dbOpts) {
  return {
    JWT_SECRET: 'test-jwt-secret',
    PAYSTACK_SECRET_KEY: PAYSTACK_SECRET,
    ENVIRONMENT: 'dev',
    DB: makeMockDb(dbOpts),
    RATE_LIMITS: { get: async () => null, put: async () => undefined },
    OTP_KV: { get: async () => null, put: async () => undefined },
    MEMORIAL_PAGES_KV: { get: async () => null, put: async () => undefined },
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function publicReq(path, method = 'GET', body) {
  const init = { method, headers: { 'CF-Connecting-IP': '1.2.3.4' } }
  if (body) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  return new Request(`${BASE}${path}`, init)
}

async function hmacHex(body, secret) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function webhookReq(reference, amount, secret = PAYSTACK_SECRET) {
  const body = JSON.stringify({ event: 'charge.success', data: { reference, amount } })
  const sig = await hmacHex(body, secret)
  return new Request(`${BASE}/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': PAYSTACK_IP,
      'x-paystack-signature': sig,
    },
    body,
  })
}

afterEach(() => { vi.restoreAllMocks() })

// ─── POST /memorial/:id/tributes — initialize ─────────────────────────────────

describe('POST /memorial/:id/tributes (initialize)', () => {
  it('inserts a pending row with the correct amount_pesewas from the catalog', async () => {
    const env = makeEnv({})
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: { authorization_url: 'https://checkout.paystack.com/abc' } }), { status: 200 })
    )
    const res = await worker.fetch(
      publicReq('/memorial/mem1/tributes', 'POST', {
        type: 'candle',
        authorName: 'Kwame',
        email: 'kwame@example.com',
        message: 'Rest in peace',
      }),
      env
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reference).toMatch(/^fp-candle-/)
    expect(body.authorization_url).toBe('https://checkout.paystack.com/abc')

    expect(env.DB._state.tributes).toHaveLength(1)
    const row = env.DB._state.tributes[0]
    expect(row.amount_pesewas).toBe(1000) // candle = 1000 pesewas
    expect(row.status).toBe('pending')
    expect(row.memorial_id).toBe('mem1')
    expect(row.type).toBe('candle')
    expect(row.paystack_reference).toMatch(/^fp-candle-/)
  })

  it('inserts correct amount for flowers (2000 pesewas)', async () => {
    const env = makeEnv({})
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: { authorization_url: 'https://checkout.paystack.com/xyz' } }), { status: 200 })
    )
    const res = await worker.fetch(
      publicReq('/memorial/mem1/tributes', 'POST', {
        type: 'flowers',
        authorName: 'Ama',
        email: 'ama@example.com',
      }),
      env
    )
    expect(res.status).toBe(200)
    expect(env.DB._state.tributes[0].amount_pesewas).toBe(2000)
  })

  it('returns 400 for unknown type', async () => {
    const env = makeEnv({})
    const res = await worker.fetch(
      publicReq('/memorial/mem1/tributes', 'POST', {
        type: 'coffin',
        authorName: 'Kwame',
        email: 'kwame@example.com',
      }),
      env
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.stringMatching(/type/i) })
    expect(env.DB._state.tributes).toHaveLength(0)
  })

  it('returns 400 for missing email', async () => {
    const env = makeEnv({})
    const res = await worker.fetch(
      publicReq('/memorial/mem1/tributes', 'POST', {
        type: 'candle',
        authorName: 'Kwame',
        email: '',
      }),
      env
    )
    expect(res.status).toBe(400)
    expect(env.DB._state.tributes).toHaveLength(0)
  })

  it('returns 400 for invalid email', async () => {
    const env = makeEnv({})
    const res = await worker.fetch(
      publicReq('/memorial/mem1/tributes', 'POST', {
        type: 'candle',
        authorName: 'Kwame',
        email: 'not-an-email',
      }),
      env
    )
    expect(res.status).toBe(400)
    expect(env.DB._state.tributes).toHaveLength(0)
  })

  it('returns 400 when authorName is missing', async () => {
    const env = makeEnv({})
    const res = await worker.fetch(
      publicReq('/memorial/mem1/tributes', 'POST', {
        type: 'candle',
        email: 'kwame@example.com',
      }),
      env
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when authorName exceeds 60 characters', async () => {
    const env = makeEnv({})
    const res = await worker.fetch(
      publicReq('/memorial/mem1/tributes', 'POST', {
        type: 'candle',
        authorName: 'A'.repeat(61),
        email: 'kwame@example.com',
      }),
      env
    )
    expect(res.status).toBe(400)
  })

  it('clamps message to maxMessage for the product', async () => {
    const env = makeEnv({})
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: { authorization_url: 'https://checkout.paystack.com/abc' } }), { status: 200 })
    )
    const longMessage = 'X'.repeat(200) // candle maxMessage = 80
    await worker.fetch(
      publicReq('/memorial/mem1/tributes', 'POST', {
        type: 'candle',
        authorName: 'Kwame',
        email: 'kwame@example.com',
        message: longMessage,
      }),
      env
    )
    expect(env.DB._state.tributes[0].message).toHaveLength(80)
  })

  it('inserts correct amount for tribute type (5000 pesewas, maxMessage 500)', async () => {
    const env = makeEnv({})
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: { authorization_url: 'https://checkout.paystack.com/trib' } }), { status: 200 })
    )
    const res = await worker.fetch(
      publicReq('/memorial/mem1/tributes', 'POST', {
        type: 'tribute',
        authorName: 'Kofi',
        email: 'kofi@example.com',
        message: 'A'.repeat(600), // should be clamped to 500
      }),
      env
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.authorization_url).toBe('https://checkout.paystack.com/trib')
    expect(env.DB._state.tributes).toHaveLength(1)
    expect(env.DB._state.tributes[0].amount_pesewas).toBe(5000)
    expect(env.DB._state.tributes[0].message).toHaveLength(500)
  })

  it('does NOT insert a row when Paystack returns a failure', async () => {
    const env = makeEnv({})
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: false, message: 'Invalid key' }), { status: 400 })
    )
    const res = await worker.fetch(
      publicReq('/memorial/mem1/tributes', 'POST', {
        type: 'candle',
        authorName: 'Kwame',
        email: 'kwame@example.com',
      }),
      env
    )
    expect(res.status).toBe(502)
    expect(env.DB._state.tributes).toHaveLength(0)
  })
})

// ─── Webhook fp-candle- branch ────────────────────────────────────────────────

describe('POST /payments/webhook (fp-candle- branch)', () => {
  it('marks a pending tribute as paid on charge.success', async () => {
    const env = makeEnv({
      tributes: [{ id: 't1', memorial_id: 'mem1', type: 'candle', author_name: 'Kwame', message: '', amount_pesewas: 1000, paystack_reference: 'fp-candle-ref1', status: 'pending', created_at: Date.now(), paid_at: null }],
    })
    const res = await worker.fetch(await webhookReq('fp-candle-ref1', 1000), env)
    expect(res.status).toBe(200)
    expect(env.DB._state.tributes[0].status).toBe('paid')
  })

  it('is idempotent — does not double-update on replay', async () => {
    const env = makeEnv({
      tributes: [{ id: 't1', memorial_id: 'mem1', type: 'candle', author_name: 'Kwame', message: '', amount_pesewas: 1000, paystack_reference: 'fp-candle-ref1', status: 'paid', created_at: Date.now(), paid_at: Date.now() }],
    })
    const res = await worker.fetch(await webhookReq('fp-candle-ref1', 1000), env)
    expect(res.status).toBe(200)
    // Still paid — no second mutation
    expect(env.DB._state.tributes[0].status).toBe('paid')
  })

  it('does NOT mark paid on amount mismatch', async () => {
    const env = makeEnv({
      tributes: [{ id: 't1', memorial_id: 'mem1', type: 'candle', author_name: 'Kwame', message: '', amount_pesewas: 1000, paystack_reference: 'fp-candle-ref1', status: 'pending', created_at: Date.now(), paid_at: null }],
    })
    const res = await worker.fetch(await webhookReq('fp-candle-ref1', 500), env) // wrong amount
    expect(res.status).toBe(200)
    expect(env.DB._state.tributes[0].status).toBe('pending')
  })
})

// ─── GET /tribute/:ref/verify — handleTributeVerify ──────────────────────────

describe('GET /tribute/:ref/verify (handleTributeVerify)', () => {
  it('happy path — pending tribute, Paystack returns success with matching amount → paid:true', async () => {
    const env = makeEnv({
      tributes: [{ id: 't1', memorial_id: 'mem1', type: 'candle', author_name: 'Kwame', message: '', amount_pesewas: 1000, paystack_reference: 'fp-candle-ref1', status: 'pending', created_at: Date.now(), paid_at: null }],
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: { status: 'success', amount: 1000 } }), { status: 200 })
    )
    const res = await worker.fetch(publicReq('/tribute/fp-candle-ref1/verify'), env)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ paid: true })
    expect(env.DB._state.tributes[0].status).toBe('paid')
    expect(env.DB._state.tributes[0].paid_at).toMatch(/^\d{4}-\d{2}-\d{2}T/) // ISO string
  })

  it('already-paid — idempotent, returns paid:true with no second write', async () => {
    const existingPaidAt = new Date().toISOString()
    const env = makeEnv({
      tributes: [{ id: 't1', memorial_id: 'mem1', type: 'candle', author_name: 'Kwame', message: '', amount_pesewas: 1000, paystack_reference: 'fp-candle-ref1', status: 'paid', created_at: Date.now(), paid_at: existingPaidAt }],
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const res = await worker.fetch(publicReq('/tribute/fp-candle-ref1/verify'), env)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ paid: true })
    // Paystack should not be called for an already-paid tribute
    expect(fetchSpy).not.toHaveBeenCalled()
    // paid_at unchanged
    expect(env.DB._state.tributes[0].paid_at).toBe(existingPaidAt)
  })

  it('Paystack returns non-success → row stays pending, response paid:false', async () => {
    const env = makeEnv({
      tributes: [{ id: 't1', memorial_id: 'mem1', type: 'candle', author_name: 'Kwame', message: '', amount_pesewas: 1000, paystack_reference: 'fp-candle-ref1', status: 'pending', created_at: Date.now(), paid_at: null }],
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: { status: 'abandoned', amount: 1000 } }), { status: 200 })
    )
    const res = await worker.fetch(publicReq('/tribute/fp-candle-ref1/verify'), env)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ paid: false })
    expect(env.DB._state.tributes[0].status).toBe('pending')
  })

  it('Paystack returns success but amount mismatch → row stays pending, response paid:false', async () => {
    const env = makeEnv({
      tributes: [{ id: 't1', memorial_id: 'mem1', type: 'candle', author_name: 'Kwame', message: '', amount_pesewas: 1000, paystack_reference: 'fp-candle-ref1', status: 'pending', created_at: Date.now(), paid_at: null }],
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: { status: 'success', amount: 500 } }), { status: 200 })
    )
    const res = await worker.fetch(publicReq('/tribute/fp-candle-ref1/verify'), env)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ paid: false })
    expect(env.DB._state.tributes[0].status).toBe('pending')
  })
})

// ─── GET /memorial/:id/tributes — list ───────────────────────────────────────

describe('GET /memorial/:id/tributes (list)', () => {
  it('returns only paid tributes with correct counts', async () => {
    const env = makeEnv({
      tributes: [
        { id: 't1', memorial_id: 'mem1', type: 'candle', author_name: 'A', message: 'hi', amount_pesewas: 1000, paystack_reference: 'fp-candle-1', status: 'paid', created_at: 1000, paid_at: 2000 },
        { id: 't2', memorial_id: 'mem1', type: 'flowers', author_name: 'B', message: '', amount_pesewas: 2000, paystack_reference: 'fp-candle-2', status: 'paid', created_at: 1001, paid_at: 2001 },
        { id: 't3', memorial_id: 'mem1', type: 'candle', author_name: 'C', message: '', amount_pesewas: 1000, paystack_reference: 'fp-candle-3', status: 'pending', created_at: 1002, paid_at: null },
      ],
    })
    const res = await worker.fetch(publicReq('/memorial/mem1/tributes'), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tributes).toHaveLength(2) // only paid
    expect(body.counts).toEqual({ candle: 1, flowers: 1, tribute: 0 })
  })

  it('returns empty list and zero counts when no paid tributes', async () => {
    const env = makeEnv({ tributes: [] })
    const res = await worker.fetch(publicReq('/memorial/memX/tributes'), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tributes).toEqual([])
    expect(body.counts).toEqual({ candle: 0, flowers: 0, tribute: 0 })
  })
})
