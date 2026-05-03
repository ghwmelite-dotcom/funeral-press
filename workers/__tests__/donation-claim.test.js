import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from '../donation-api.js'
import { signJWT } from '../utils/jwt.js'

const JWT_SECRET = 'test-jwt-secret'
const USER_ID = 'user-uuid-1'
const OTHER_USER_ID = 'user-uuid-2'
const DONATION_ID = 'don_xyz'

function makeMockDb({ donation = null, user = null }) {
  const state = { donation: donation ? { ...donation } : null, user, profileUpserts: [], updates: [] }
  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.includes('UPDATE donations')) {
            state.updates.push({ sql, args })
            if (state.donation) state.donation.donor_user_id = args[0]
            return { meta: { changes: 1 } }
          }
          if (sql.includes('INSERT INTO donor_profiles')) {
            state.profileUpserts.push({ args })
            return { meta: { changes: 1 } }
          }
          return { meta: { changes: 0 } }
        },
        first: async () => {
          if (sql.includes('FROM donations')) return state.donation
          if (sql.includes('FROM users')) return state.user
          return null
        },
        all: async () => ({ results: [] }),
      }),
    }),
  }
}

function makeEnv({ donation = null, user = null }) {
  return {
    DONATIONS_ENABLED: 'true',
    DONATIONS_GLOBAL_PAUSED: 'false',
    INTERNATIONAL_DONATIONS_ENABLED: 'true',
    JWT_SECRET,
    PAYSTACK_SECRET_KEY: 'sk_test_fake',
    OTP_PEPPER: 'test-pepper',
    DB: makeMockDb({ donation, user }),
    MEMORIAL_PAGES_KV: { get: async () => null, put: async () => undefined },
    RATE_LIMITS: { get: async () => null, put: async () => undefined },
    OTP_KV: { get: async () => null, put: async () => undefined },
  }
}

async function makeJwt(sub = USER_ID) {
  return signJWT({ sub: String(sub), exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET)
}

function claimReq(body, jwt) {
  return new Request(`https://example.com/donations/${DONATION_ID}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { 'Authorization': `Bearer ${jwt}` } : {}),
      'CF-Connecting-IP': '1.2.3.4',
    },
    body: JSON.stringify(body || {}),
  })
}

function donationRow(overrides = {}) {
  return {
    id: DONATION_ID,
    donor_user_id: null,
    donor_email: 'donor@example.com',
    amount_pesewas: 5000,
    status: 'succeeded',
    ...overrides,
  }
}

describe('POST /donations/:id/claim', () => {
  beforeEach(() => { global.fetch = vi.fn() })

  it('rejects unauthenticated', async () => {
    const env = makeEnv({ donation: donationRow() })
    const res = await worker.fetch(claimReq({}, null), env)
    expect(res.status).toBe(401)
  })

  it('returns 404 when donation not found', async () => {
    const env = makeEnv({ donation: null })
    const jwt = await makeJwt()
    const res = await worker.fetch(claimReq({}, jwt), env)
    expect(res.status).toBe(404)
  })

  it('returns 400 when donation not yet succeeded', async () => {
    const env = makeEnv({ donation: donationRow({ status: 'pending' }) })
    const jwt = await makeJwt()
    const res = await worker.fetch(claimReq({}, jwt), env)
    expect(res.status).toBe(400)
  })

  it('is idempotent when already claimed by the same user', async () => {
    const env = makeEnv({ donation: donationRow({ donor_user_id: USER_ID }) })
    const jwt = await makeJwt()
    const res = await worker.fetch(claimReq({}, jwt), env)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.already).toBe(true)
  })

  it('returns 409 when already claimed by different user', async () => {
    const env = makeEnv({ donation: donationRow({ donor_user_id: OTHER_USER_ID }) })
    const jwt = await makeJwt()
    const res = await worker.fetch(claimReq({}, jwt), env)
    expect(res.status).toBe(409)
  })

  it('claims successfully when donor_email matches user email', async () => {
    const env = makeEnv({
      donation: donationRow({ donor_email: 'donor@example.com' }),
      user: { id: USER_ID, email: 'donor@example.com' },
    })
    const jwt = await makeJwt()
    const res = await worker.fetch(claimReq({}, jwt), env)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.claimed).toBe(true)
    expect(j.donor_total_pesewas).toBe(5000)
    expect(env.DB._state.donation.donor_user_id).toBe(USER_ID)
    // donor_profiles upsert happened
    expect(env.DB._state.profileUpserts.length).toBe(1)
    expect(env.DB._state.profileUpserts[0].args[0]).toBe(USER_ID)
    expect(env.DB._state.profileUpserts[0].args[1]).toBe(5000)
  })

  it('returns 403 when email mismatched and no claim_token', async () => {
    const env = makeEnv({
      donation: donationRow({ donor_email: 'someone-else@example.com' }),
      user: { id: USER_ID, email: 'donor@example.com' },
    })
    const jwt = await makeJwt()
    const res = await worker.fetch(claimReq({}, jwt), env)
    expect(res.status).toBe(403)
  })

  it('claims successfully via claim_token override even when emails differ', async () => {
    const env = makeEnv({
      donation: donationRow({ donor_email: 'someone-else@example.com' }),
      user: { id: USER_ID, email: 'donor@example.com' },
    })
    const jwt = await makeJwt()
    const res = await worker.fetch(claimReq({ claim_token: 'opaque-from-receipt' }, jwt), env)
    expect(res.status).toBe(200)
    expect(env.DB._state.donation.donor_user_id).toBe(USER_ID)
  })

  it('claims successfully when donor_email is null (anonymous donation)', async () => {
    const env = makeEnv({
      donation: donationRow({ donor_email: null }),
      user: { id: USER_ID, email: 'donor@example.com' },
    })
    const jwt = await makeJwt()
    const res = await worker.fetch(claimReq({}, jwt), env)
    expect(res.status).toBe(200)
    expect(env.DB._state.donation.donor_user_id).toBe(USER_ID)
  })
})
