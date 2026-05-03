import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from '../donation-api.js'

const MEMORIAL_ID = 'mem_abc'

function makeMockDb({ memorial = null }) {
  const state = { memorial, donations: [], updates: [] }
  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.includes('INSERT INTO donations')) {
            state.donations.push({ args })
            return { meta: { last_row_id: 1 } }
          }
          if (sql.includes('UPDATE donations')) {
            state.updates.push({ sql, args })
            return { meta: { changes: 1 } }
          }
          if (sql.includes('INSERT INTO donation_audit')) {
            return { meta: { last_row_id: 1 } }
          }
          return { meta: { changes: 0 } }
        },
        first: async () => {
          if (sql.includes('FROM memorials')) return state.memorial
          return null
        },
        all: async () => ({ results: [] }),
      }),
    }),
  }
}

function approvedMemorial(overrides = {}) {
  return {
    id: MEMORIAL_ID,
    paystack_subaccount_code: 'ACCT_xyz',
    approval_status: 'approved',
    donation_paused: 0,
    wall_mode: 'full',
    deleted_at: null,
    ...overrides,
  }
}

function makeEnv({ memorial = approvedMemorial(), envOverrides = {}, rateSeed = {} } = {}) {
  const rateLimits = new Map(Object.entries(rateSeed))
  return {
    DONATIONS_ENABLED: 'true',
    DONATIONS_GLOBAL_PAUSED: 'false',
    INTERNATIONAL_DONATIONS_ENABLED: 'true',
    JWT_SECRET: 'test-jwt-secret',
    PAYSTACK_SECRET_KEY: 'sk_test_fake',
    PAYSTACK_WEBHOOK_SECRET: 'whsec_fake',
    OTP_PEPPER: 'test-pepper',
    TIP_DEFAULT_PERCENT: '5',
    OXR_APP_ID: 'fake-oxr',
    DB: makeMockDb({ memorial }),
    MEMORIAL_PAGES_KV: { get: async () => null, put: async () => undefined },
    RATE_LIMITS: {
      get: async (k) => rateLimits.get(k) || null,
      put: async (k, v) => rateLimits.set(k, v),
    },
    OTP_KV: { get: async () => null, put: async () => undefined },
    _state: { rateLimits },
    ...envOverrides,
  }
}

function chargeReq(body, ip = '1.2.3.4') {
  return new Request(`https://example.com/memorials/${MEMORIAL_ID}/donation/charge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
    body: JSON.stringify(body),
  })
}

function ghsBody(overrides = {}) {
  return {
    display_amount_minor: 5000,        // GHS 50.00
    display_currency: 'GHS',
    tip_pesewas: 250,                  // 5% of 5000
    donor: { display_name: 'John K.', visibility: 'public', country_code: 'GH' },
    ...overrides,
  }
}

describe('POST /memorials/:id/donation/charge', () => {
  beforeEach(() => { global.fetch = vi.fn() })

  it('returns 404 when memorial not found', async () => {
    const env = makeEnv({ memorial: null })
    const res = await worker.fetch(chargeReq(ghsBody()), env)
    expect(res.status).toBe(404)
  })

  it('returns 403 when memorial not yet approved', async () => {
    const env = makeEnv({ memorial: approvedMemorial({ approval_status: 'pending' }) })
    const res = await worker.fetch(chargeReq(ghsBody()), env)
    expect(res.status).toBe(403)
  })

  it('returns 403 when memorial is paused', async () => {
    const env = makeEnv({ memorial: approvedMemorial({ donation_paused: 1 }) })
    const res = await worker.fetch(chargeReq(ghsBody()), env)
    expect(res.status).toBe(403)
  })

  it('rejects amount below 100 minor', async () => {
    const env = makeEnv()
    const res = await worker.fetch(chargeReq(ghsBody({ display_amount_minor: 50 })), env)
    expect(res.status).toBe(400)
  })

  it('rejects malformed currency', async () => {
    const env = makeEnv()
    const res = await worker.fetch(chargeReq(ghsBody({ display_currency: 'cedi' })), env)
    expect(res.status).toBe(400)
  })

  it('rejects empty/long display_name', async () => {
    const env = makeEnv()
    const longName = 'x'.repeat(61)
    const res = await worker.fetch(chargeReq(ghsBody({ donor: { display_name: longName, visibility: 'public' } })), env)
    expect(res.status).toBe(400)
  })

  it('rejects profanity in display_name', async () => {
    const env = makeEnv()
    const res = await worker.fetch(chargeReq(ghsBody({ donor: { display_name: 'You kwasea fool', visibility: 'public' } })), env)
    expect(res.status).toBe(400)
  })

  it('rejects invalid visibility', async () => {
    const env = makeEnv()
    const res = await worker.fetch(chargeReq(ghsBody({ donor: { display_name: 'X', visibility: 'shouty' } })), env)
    expect(res.status).toBe(400)
  })

  it('rejects mismatched tip (not zero, not within ±1 of expected)', async () => {
    const env = makeEnv()
    // Expected tip for 5000 @ 5% = 250. Send 999.
    const res = await worker.fetch(chargeReq(ghsBody({ tip_pesewas: 999 })), env)
    expect(res.status).toBe(400)
  })

  it('accepts tip = 0 as opt-out', async () => {
    const env = makeEnv()
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: true, data: { authorization_url: 'p', access_code: 'a' } }),
    })
    const res = await worker.fetch(chargeReq(ghsBody({ tip_pesewas: 0 })), env)
    expect(res.status).toBe(200)
  })

  it('initialises Paystack transaction for GHS donor and inserts pending donation', async () => {
    const env = makeEnv()
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: true, data: { authorization_url: 'https://paystack/x', access_code: 'ac_y' } }),
    })
    const res = await worker.fetch(chargeReq(ghsBody()), env)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.authorization_url).toContain('paystack')
    expect(j.amount_in_ghs_pesewas).toBe(5000)
    expect(j.fx_rate_used).toBe(1)
    expect(j.donation_id).toMatch(/^don_/)
    expect(j.paystack_reference).toMatch(/^FP_don_/)
    // Pending donation row written
    expect(env.DB._state.donations.length).toBe(1)
    // Rate counters set
    expect(env._state.rateLimits.get('donation:ip:10m:1.2.3.4')).toBe('1')
    expect(env._state.rateLimits.get('donation:ipmem:1h:1.2.3.4:mem_abc')).toBe('1')
  })

  it('converts GBP donor amount via FX cache hit', async () => {
    // FX cache hit at rate 20.0: £25.00 = 2500 minor → GHS 500.00 = 50000 pesewas
    const env = makeEnv({
      rateSeed: { 'fx:GBP_GHS': JSON.stringify({ rate: 20.0, fetched_at: Date.now() }) },
    })
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: true, data: { authorization_url: 'p', access_code: 'a' } }),
    })
    const res = await worker.fetch(chargeReq({
      display_amount_minor: 2500,
      display_currency: 'GBP',
      tip_pesewas: 2500,    // 5% of 50000 GHS pesewas
      donor: { display_name: 'John', visibility: 'public', country_code: 'GB' },
    }), env)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.amount_in_ghs_pesewas).toBe(50000)
    expect(j.fx_rate_used).toBe(20.0)
  })

  it('rate-limits per-IP after 5 charges in 10 min', async () => {
    const env = makeEnv({
      rateSeed: { 'donation:ip:10m:1.2.3.4': '5' },
    })
    const res = await worker.fetch(chargeReq(ghsBody()), env)
    expect(res.status).toBe(429)
  })

  it('rate-limits per-IP+memorial after 3 charges in 1h', async () => {
    const env = makeEnv({
      rateSeed: { 'donation:ipmem:1h:1.2.3.4:mem_abc': '3' },
    })
    const res = await worker.fetch(chargeReq(ghsBody()), env)
    expect(res.status).toBe(429)
  })

  it('refuses non-GHS when FX rate fetch fails and no cache', async () => {
    const env = makeEnv()
    // No fx cache seed, OXR fetch fails
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 })
    const res = await worker.fetch(chargeReq({
      display_amount_minor: 2500,
      display_currency: 'EUR',
      tip_pesewas: 0,
      donor: { display_name: 'John', visibility: 'public' },
    }), env)
    expect(res.status).toBe(503)
  })

  it('refuses non-GHS when INTERNATIONAL_DONATIONS_ENABLED=false', async () => {
    const env = makeEnv({
      envOverrides: { INTERNATIONAL_DONATIONS_ENABLED: 'false' },
    })
    const res = await worker.fetch(chargeReq({
      display_amount_minor: 2500,
      display_currency: 'GBP',
      tip_pesewas: 0,
      donor: { display_name: 'John', visibility: 'public' },
    }), env)
    expect(res.status).toBe(503)
  })

  it('marks donation row failed when Paystack init fails', async () => {
    const env = makeEnv()
    global.fetch.mockResolvedValueOnce({
      ok: false, status: 400,
      json: async () => ({ status: false, message: 'invalid subaccount' }),
    })
    const res = await worker.fetch(chargeReq(ghsBody()), env)
    expect(res.status).toBe(502)
    expect(env.DB._state.donations.length).toBe(1)
    expect(env.DB._state.updates.some(u => u.sql.includes("status = 'failed'"))).toBe(true)
  })
})
