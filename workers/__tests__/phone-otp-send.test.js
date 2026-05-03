import { describe, it, expect, vi, beforeEach } from 'vitest'

import worker from '../auth-api.js'

function mockEnv(overrides = {}) {
  const kvStore = new Map()
  const dbRows = []
  return {
    PHONE_AUTH_ENABLED: 'true',
    HUBTEL_CLIENT_ID: 'fake-client-id',
    HUBTEL_CLIENT_SECRET: 'fake-client-secret',
    HUBTEL_SENDER_ID: 'FuneralPress',
    TWILIO_ACCOUNT_SID: 'AC_fake',
    TWILIO_AUTH_TOKEN: 'fake',
    TWILIO_FROM_NUMBER: '+15005550006',
    OTP_PEPPER: 'test-pepper-32-bytes-of-entropy-here',
    JWT_SECRET: 'test-jwt-secret',
    GOOGLE_CLIENT_ID: 'fake-google',
    CORS_ORIGIN: 'http://localhost:5173',
    OTP_KV: {
      get: async (k) => kvStore.get(k) || null,
      put: async (k, v, _opts) => { kvStore.set(k, v); return undefined },
    },
    RATE_LIMITS: {
      get: async (k) => kvStore.get(`rl:${k}`) || null,
      put: async (k, v, _opts) => { kvStore.set(`rl:${k}`, v) },
    },
    DB: {
      prepare: (sql) => ({
        bind: (...args) => ({
          run: async () => { dbRows.push({ sql, args }); return { meta: { last_row_id: dbRows.length } } },
          first: async () => null,
          all: async () => ({ results: [] }),
        }),
      }),
      _rows: dbRows,
    },
    ...overrides,
  }
}

function makeReq(body, headers = {}) {
  return new Request('https://example.com/auth/phone/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4', 'Origin': 'http://localhost:5173', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /auth/phone/send-otp', () => {
  beforeEach(() => {
    // Hubtel responds with Status: 0 + MessageId on success.
    // Twilio responds with sid; Hubtel mock works for both since the worker only
    // checks sendResult.ok which both helpers normalize to true on 2xx + Status=0.
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Status: 0, MessageId: 'm_1', sid: 'VE_fake' }),
    })
  })

  it('returns 503 when feature flag is off', async () => {
    const env = mockEnv({ PHONE_AUTH_ENABLED: 'false' })
    const res = await worker.fetch(makeReq({ phone: '+233241234567', purpose: 'login' }), env)
    expect(res.status).toBe(503)
  })

  it('rejects invalid E.164 phone', async () => {
    const env = mockEnv()
    const res = await worker.fetch(makeReq({ phone: 'abc', purpose: 'login' }), env)
    expect(res.status).toBe(400)
  })

  it('rejects unknown purpose', async () => {
    const env = mockEnv()
    const res = await worker.fetch(makeReq({ phone: '+233241234567', purpose: 'mystery' }), env)
    expect(res.status).toBe(400)
  })

  it('routes Ghana phone to Hubtel', async () => {
    const env = mockEnv()
    const res = await worker.fetch(makeReq({ phone: '+233241234567', purpose: 'login' }), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.provider).toBe('hubtel')
    expect(body.expires_in).toBe(600)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('hubtel'),
      expect.any(Object)
    )
  })

  it('routes UK phone to Twilio', async () => {
    const env = mockEnv()
    const res = await worker.fetch(makeReq({ phone: '+447700900000', purpose: 'login' }), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.provider).toBe('twilio')
  })

  it('rate limits per phone after 3 sends in 10 min', async () => {
    const env = mockEnv()
    for (let i = 0; i < 3; i++) {
      await worker.fetch(makeReq({ phone: '+233241234567', purpose: 'login' }), env)
    }
    const res = await worker.fetch(makeReq({ phone: '+233241234567', purpose: 'login' }), env)
    expect(res.status).toBe(429)
  })

  it('returns generic error on provider failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'provider down' }),
    })
    const env = mockEnv()
    const res = await worker.fetch(makeReq({ phone: '+233241234567', purpose: 'login' }), env)
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).not.toContain('provider down')
  })
})
