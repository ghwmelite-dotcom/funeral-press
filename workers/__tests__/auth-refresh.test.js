import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from '../auth-api.js'
import { verifyJWT } from '../utils/jwt.js'

const JWT_SECRET = 'test-jwt-secret'
const USER_ID = 'user-uuid-1'
const REFRESH_RAW = 'a'.repeat(128)
const OTHER_REFRESH_RAW = 'b'.repeat(128)

// Match the SHA-256 hex hash that auth-api.js uses internally (hashToken)
async function sha256Hex(str) {
  const enc = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(str))
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function makeMockDb({ refreshRow = null, user = null } = {}) {
  const state = {
    refreshRow: refreshRow ? { ...refreshRow } : null,
    user: user ? { ...user } : null,
    deletes: [],
    inserts: [],
  }
  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.startsWith('DELETE FROM refresh_tokens')) {
            state.deletes.push({ sql, args })
            // Simulate row removal so subsequent SELECT yields nothing (replay protection by deletion)
            if (state.refreshRow && args[0] === state.refreshRow.id) {
              state.refreshRow = null
            }
            return { meta: { changes: 1 } }
          }
          if (sql.startsWith('INSERT INTO refresh_tokens')) {
            state.inserts.push({ sql, args })
            return { meta: { changes: 1 } }
          }
          return { meta: { changes: 0 } }
        },
        first: async () => {
          if (sql.includes('FROM refresh_tokens')) {
            const tokenHash = args[0]
            if (state.refreshRow && state.refreshRow.token_hash === tokenHash) {
              return state.refreshRow
            }
            return null
          }
          if (sql.includes('FROM users WHERE id = ?')) {
            if (state.user && state.user.id === args[0]) return state.user
            return null
          }
          if (sql.startsWith('SELECT credits_remaining')) {
            return { credits_remaining: 0 }
          }
          if (sql.includes('FROM user_roles')) {
            return null
          }
          return null
        },
        all: async () => ({ results: [] }),
      }),
    }),
  }
}

function makeEnv(opts = {}) {
  return {
    JWT_SECRET,
    GOOGLE_CLIENT_ID: 'fake-google',
    OTP_PEPPER: 'test-pepper',
    DB: makeMockDb(opts),
    RATE_LIMITS: { get: async () => null, put: async () => undefined },
    OTP_KV: { get: async () => null, put: async () => undefined },
    MEMORIAL_PAGES_KV: { get: async () => null, put: async () => undefined },
  }
}

function refreshReq(body) {
  return new Request('https://example.com/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '1.2.3.4',
    },
    body: JSON.stringify(body || {}),
  })
}

function userRow(overrides = {}) {
  return {
    id: USER_ID,
    email: 'u@example.com',
    name: 'Test',
    picture: null,
    is_partner: 0,
    referral_code: null,
    partner_type: null,
    partner_logo_url: null,
    partner_denomination: null,
    credits_remaining: 0,
    ...overrides,
  }
}

async function refreshRow(overrides = {}) {
  return {
    id: 'rt_id_1',
    user_id: USER_ID,
    token_hash: await sha256Hex(REFRESH_RAW),
    expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    ...overrides,
  }
}

describe('POST /auth/refresh', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('returns 400 when refresh token is missing from body', async () => {
    // NOTE: Implementation returns 400 (not 401) and reads token from JSON body, not a cookie.
    const env = makeEnv()
    const res = await worker.fetch(refreshReq({}), env)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/missing refresh token/i)
  })

  it('returns 401 for an unknown / signature-invalid refresh token', async () => {
    // Refresh tokens here are random hex (not JWT), so any unknown opaque value
    // hashes to a value not present in DB → 401 "Invalid refresh token".
    const env = makeEnv({ refreshRow: await refreshRow(), user: userRow() })
    const res = await worker.fetch(refreshReq({ refreshToken: 'totally-fake-token' }), env)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/invalid refresh token/i)
  })

  it('returns 401 and deletes the row when the refresh token is expired', async () => {
    const expired = await refreshRow({
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    })
    const env = makeEnv({ refreshRow: expired, user: userRow() })
    const res = await worker.fetch(refreshReq({ refreshToken: REFRESH_RAW }), env)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/expired/i)
    // Expired row should have been deleted
    const deleteCall = env.DB._state.deletes.find(d => d.args[0] === 'rt_id_1')
    expect(deleteCall).toBeTruthy()
  })

  it('rotates the refresh token on happy path: deletes old, inserts new, returns new accessToken+refreshToken', async () => {
    const env = makeEnv({ refreshRow: await refreshRow(), user: userRow() })
    const res = await worker.fetch(refreshReq({ refreshToken: REFRESH_RAW }), env)
    expect(res.status).toBe(200)
    const body = await res.json()

    // Returns user, new accessToken, new refreshToken
    expect(body.user).toBeTruthy()
    expect(body.user.id).toBe(USER_ID)
    expect(typeof body.accessToken).toBe('string')
    expect(typeof body.refreshToken).toBe('string')
    expect(body.refreshToken).not.toBe(REFRESH_RAW)

    // Old row deleted, new row inserted
    const deleteCall = env.DB._state.deletes.find(d => d.args[0] === 'rt_id_1')
    expect(deleteCall, 'expected DELETE for the old refresh token').toBeTruthy()
    expect(env.DB._state.inserts.length).toBe(1)
    expect(env.DB._state.inserts[0].args[1]).toBe(USER_ID) // user_id
  })

  it('issues an access token whose `sub` claim is the user id and exp ~1h in the future', async () => {
    const env = makeEnv({ refreshRow: await refreshRow(), user: userRow() })
    const before = Math.floor(Date.now() / 1000)
    const res = await worker.fetch(refreshReq({ refreshToken: REFRESH_RAW }), env)
    expect(res.status).toBe(200)
    const body = await res.json()

    const decoded = await verifyJWT(body.accessToken, JWT_SECRET)
    expect(decoded).toBeTruthy()
    expect(decoded.sub).toBe(USER_ID)
    expect(decoded.email).toBe('u@example.com')
    // ~1 hour expiry (3600s ± a few seconds tolerance)
    expect(decoded.exp).toBeGreaterThanOrEqual(before + 3590)
    expect(decoded.exp).toBeLessThanOrEqual(before + 3700)
  })

  it('rejects replay: a second refresh with the same raw token returns 401 (row was deleted on first use)', async () => {
    // The implementation does not have an explicit "used"/"rotated_at" column,
    // it deletes the row on rotation. A replay therefore looks like an unknown
    // token and yields 401 "Invalid refresh token".
    const env = makeEnv({ refreshRow: await refreshRow(), user: userRow() })

    const first = await worker.fetch(refreshReq({ refreshToken: REFRESH_RAW }), env)
    expect(first.status).toBe(200)

    const replay = await worker.fetch(refreshReq({ refreshToken: REFRESH_RAW }), env)
    expect(replay.status).toBe(401)
    const body = await replay.json()
    expect(body.error).toMatch(/invalid refresh token/i)
  })

  // Audit/alert on replay is not implemented today — track as a gap.
  it.todo('emits an audit alert (e.g. logAudit "auth.refresh_replay") when a deleted refresh token is presented again')

  it('returns 404 when user no longer exists for the refresh token row', async () => {
    const env = makeEnv({ refreshRow: await refreshRow(), user: null })
    const res = await worker.fetch(refreshReq({ refreshToken: REFRESH_RAW }), env)
    expect(res.status).toBe(404)
  })
})
