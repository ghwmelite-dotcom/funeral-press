import { describe, it, expect } from 'vitest'
import worker from '../auth-api.js'
import { hashOtp } from '../utils/otp.js'

function mockEnv(overrides = {}) {
  const kvStore = new Map()
  const dbState = { rows: [], otpRow: null, userRow: null, refreshRow: null }
  return {
    PHONE_AUTH_ENABLED: 'true',
    OTP_PEPPER: 'test-pepper-32-bytes-of-entropy-here',
    JWT_SECRET: 'test-jwt-secret',
    GOOGLE_CLIENT_ID: 'fake-google',
    CORS_ORIGIN: 'http://localhost:5173',
    OTP_KV: { get: async (k) => kvStore.get(k) || null, put: async (k, v) => kvStore.set(k, v) },
    RATE_LIMITS: {
      get: async (k) => kvStore.get(`rl:${k}`) || null,
      put: async (k, v) => kvStore.set(`rl:${k}`, v),
    },
    DB: makeMockDb(dbState),
    _state: dbState,
    ...overrides,
  }
}

function makeMockDb(state) {
  return {
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.includes('UPDATE phone_otps SET attempts')) return { meta: {} }
          if (sql.includes('UPDATE phone_otps SET consumed_at')) return { meta: {} }
          if (sql.includes('INSERT INTO users')) {
            state.userRow = { id: 999, email: args[0], name: args[1], phone_e164: args[2], auth_methods: args[4] }
            return { meta: { last_row_id: 999 } }
          }
          if (sql.includes('INSERT INTO refresh_tokens')) {
            state.refreshRow = { args }
            return { meta: { last_row_id: 1 } }
          }
          if (sql.includes('INSERT INTO audit_log') || sql.includes('INSERT INTO phone_otps')) return { meta: {} }
          return { meta: {} }
        },
        first: async () => {
          if (sql.includes('FROM phone_otps')) return state.otpRow
          if (sql.includes('FROM users WHERE phone_e164')) return state.userRow
          return null
        },
        all: async () => ({ results: [] }),
      }),
    }),
  }
}

async function seedOtp(state, code, pepper, _purpose = 'login', overrides = {}) {
  state.otpRow = {
    id: 1,
    code_hash: await hashOtp(code, pepper),
    expires_at: Date.now() + 5 * 60 * 1000,
    attempts: 0,
    consumed_at: null,
    ...overrides,
  }
}

function makeReq(body) {
  return new Request('https://example.com/auth/phone/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4', 'Origin': 'http://localhost:5173' },
    body: JSON.stringify(body),
  })
}

describe('POST /auth/phone/verify', () => {
  it('rejects when feature flag off', async () => {
    const env = mockEnv({ PHONE_AUTH_ENABLED: 'false' })
    const res = await worker.fetch(makeReq({ phone: '+233241234567', code: '123456', purpose: 'login' }), env)
    expect(res.status).toBe(503)
  })

  it('rejects malformed code', async () => {
    const env = mockEnv()
    const res = await worker.fetch(makeReq({ phone: '+233241234567', code: 'abc', purpose: 'login' }), env)
    expect(res.status).toBe(400)
  })

  it('rejects when no pending OTP', async () => {
    const env = mockEnv()
    const res = await worker.fetch(makeReq({ phone: '+233241234567', code: '123456', purpose: 'login' }), env)
    expect(res.status).toBe(401)
  })

  it('rejects expired OTP', async () => {
    const env = mockEnv()
    await seedOtp(env._state, '123456', env.OTP_PEPPER, 'login', { expires_at: Date.now() - 1000 })
    const res = await worker.fetch(makeReq({ phone: '+233241234567', code: '123456', purpose: 'login' }), env)
    expect(res.status).toBe(401)
  })

  it('rejects wrong code', async () => {
    const env = mockEnv()
    await seedOtp(env._state, '123456', env.OTP_PEPPER, 'login')
    const res = await worker.fetch(makeReq({ phone: '+233241234567', code: '999999', purpose: 'login' }), env)
    expect(res.status).toBe(401)
  })

  it('locks phone after 5 failed attempts', async () => {
    const env = mockEnv()
    await seedOtp(env._state, '123456', env.OTP_PEPPER, 'login', { attempts: 5 })
    const res = await worker.fetch(makeReq({ phone: '+233241234567', code: '999999', purpose: 'login' }), env)
    expect(res.status).toBe(429)
  })

  it('login purpose with correct code creates new user and returns JWT', async () => {
    const env = mockEnv()
    await seedOtp(env._state, '123456', env.OTP_PEPPER, 'login')
    const res = await worker.fetch(makeReq({ phone: '+233241234567', code: '123456', purpose: 'login' }), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBeTruthy()
    expect(body.user.phone_e164).toBe('+233241234567')
    expect(body.user.auth_methods).toBe('phone')
  })

  it('non-login purpose returns ok without JWT', async () => {
    const env = mockEnv()
    await seedOtp(env._state, '123456', env.OTP_PEPPER, 'family_head_approval')
    const res = await worker.fetch(makeReq({ phone: '+233241234567', code: '123456', purpose: 'family_head_approval' }), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.verified).toBe(true)
    expect(body.token).toBeUndefined()
  })
})
