import { describe, it, expect } from 'vitest'
import worker from '../auth-api.js'
import { hashOtp } from '../utils/otp.js'
import { signJWT } from '../utils/jwt.js'

function mockEnv(overrides = {}) {
  const dbState = { otpRow: null, conflictUser: null, currentUser: null }
  const kvStore = new Map()
  return {
    PHONE_AUTH_ENABLED: 'true',
    OTP_PEPPER: 'test-pepper-32-bytes-of-entropy-here',
    JWT_SECRET: 'test-jwt-secret',
    GOOGLE_CLIENT_ID: 'fake-google',
    CORS_ORIGIN: 'http://localhost:5173',
    OTP_KV: { get: async () => null, put: async () => undefined },
    RATE_LIMITS: {
      get: async (k) => kvStore.get(`rl:${k}`) || null,
      put: async (k, v) => kvStore.set(`rl:${k}`, v),
    },
    DB: {
      prepare: (sql) => ({
        bind: (..._args) => ({
          run: async () => ({ meta: {} }),
          first: async () => {
            if (sql.includes('FROM phone_otps')) return dbState.otpRow
            if (sql.includes('FROM users WHERE phone_e164 = ? AND id != ?')) return dbState.conflictUser
            if (sql.includes('SELECT auth_methods FROM users WHERE id = ?')) return dbState.currentUser
            return null
          },
          all: async () => ({ results: [] }),
        }),
      }),
    },
    _state: dbState,
    ...overrides,
  }
}

async function makeJwtAuth(env, userId = 42) {
  return signJWT({ sub: String(userId), email: 'a@b.c', exp: Math.floor(Date.now() / 1000) + 3600 }, env.JWT_SECRET)
}

function makeReq(path, body, jwt) {
  const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4', 'Origin': 'http://localhost:5173' }
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`
  return new Request(`https://example.com${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
}

describe('POST /auth/phone/link', () => {
  it('rejects unauthenticated', async () => {
    const env = mockEnv()
    const res = await worker.fetch(makeReq('/auth/phone/link', { phone: '+233241234567', code: '123456' }), env)
    expect(res.status).toBe(401)
  })

  it('rejects when phone already linked to another account', async () => {
    const env = mockEnv()
    env._state.conflictUser = { id: 99 }
    const jwt = await makeJwtAuth(env, 42)
    const res = await worker.fetch(makeReq('/auth/phone/link', { phone: '+233241234567', code: '123456' }, jwt), env)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('phone_already_linked')
  })

  it('succeeds for valid OTP', async () => {
    const env = mockEnv()
    env._state.otpRow = {
      id: 1,
      code_hash: await hashOtp('123456', env.OTP_PEPPER),
      expires_at: Date.now() + 60000,
      attempts: 0,
      consumed_at: null,
    }
    env._state.currentUser = { auth_methods: 'google' }
    const jwt = await makeJwtAuth(env, 42)
    const res = await worker.fetch(makeReq('/auth/phone/link', { phone: '+233241234567', code: '123456' }, jwt), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.phone_e164).toBe('+233241234567')
    expect(body.auth_methods).toBe('google,phone')
  })
})

describe('POST /auth/phone/unlink', () => {
  it('rejects unauthenticated', async () => {
    const env = mockEnv()
    const res = await worker.fetch(makeReq('/auth/phone/unlink', {}), env)
    expect(res.status).toBe(401)
  })

  it('rejects if user has no Google linked (would leave no auth method)', async () => {
    const env = mockEnv()
    env._state.currentUser = { auth_methods: 'phone' }
    const jwt = await makeJwtAuth(env, 42)
    const res = await worker.fetch(makeReq('/auth/phone/unlink', {}, jwt), env)
    expect(res.status).toBe(400)
  })

  it('succeeds when google still linked', async () => {
    const env = mockEnv()
    env._state.currentUser = { auth_methods: 'google,phone' }
    const jwt = await makeJwtAuth(env, 42)
    const res = await worker.fetch(makeReq('/auth/phone/unlink', {}, jwt), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.auth_methods).toBe('google')
  })
})
