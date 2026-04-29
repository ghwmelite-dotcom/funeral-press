import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from '../donation-api.js'
import { signJWT } from '../utils/jwt.js'
import { hashOtp } from '../utils/otp.js'

const PEPPER = 'test-pepper'
const JWT_SECRET = 'test-jwt-secret'
const PHONE = '+233207777777'
const MEMORIAL_ID = 'mem_abc'
const FAMILY_HEAD_USER_ID = 7

function makeMockDb({ memorial, otp = null, user = null }) {
  const state = {
    memorial: memorial ? { ...memorial } : null,
    otp: otp ? { ...otp } : null,
    user,
    inserts: [],
    updates: [],
    auditRows: [],
  }
  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.includes('UPDATE phone_otps SET attempts')) {
            if (state.otp && state.otp.id === args[0]) state.otp.attempts += 1
            return { meta: { changes: 1 } }
          }
          if (sql.includes('UPDATE phone_otps SET consumed_at')) {
            if (state.otp && state.otp.id === args[1]) state.otp.consumed_at = args[0]
            return { meta: { changes: 1 } }
          }
          if (sql.includes('UPDATE memorials')) {
            state.updates.push({ sql, args })
            // Apply each "col = ?" assignment in order. The last arg is memorialId (WHERE id = ?).
            const setClauses = sql.replace(/^[\s\S]*?SET\s+/i, '').replace(/\s+WHERE[\s\S]*$/i, '')
            const cols = setClauses.split(',').map(c => c.trim().split('=')[0].trim())
            cols.forEach((col, i) => {
              if (state.memorial) state.memorial[col] = args[i]
            })
            return { meta: { changes: state.memorial ? 1 : 0 } }
          }
          if (sql.includes('INSERT INTO donation_audit')) {
            state.auditRows.push({ args })
            return { meta: { last_row_id: 1 } }
          }
          return { meta: { changes: 0 } }
        },
        first: async () => {
          if (sql.includes('FROM memorials')) {
            const m = state.memorial
            if (!m) return null
            if (m.id !== args[0]) return null
            return m
          }
          if (sql.includes('FROM phone_otps')) {
            const o = state.otp
            if (!o) return null
            if (o.phone_e164 !== args[0]) return null
            if (o.consumed_at !== null) return null
            return o
          }
          if (sql.includes('FROM users')) {
            if (!state.user) return null
            return { id: state.user.id }
          }
          return null
        },
        all: async () => ({ results: [] }),
      }),
    }),
  }
}

function makeEnv({ memorial, otp = null, kvSeed = null }) {
  const memorialKv = new Map()
  if (kvSeed) memorialKv.set(MEMORIAL_ID, JSON.stringify(kvSeed))
  return {
    DONATIONS_ENABLED: 'true',
    DONATIONS_GLOBAL_PAUSED: 'false',
    INTERNATIONAL_DONATIONS_ENABLED: 'true',
    JWT_SECRET,
    PAYSTACK_SECRET_KEY: 'sk_test_fake',
    OTP_PEPPER: PEPPER,
    DB: makeMockDb({ memorial, otp }),
    MEMORIAL_PAGES_KV: {
      get: async (k) => memorialKv.get(k) || null,
      put: async (k, v) => memorialKv.set(k, v),
    },
    RATE_LIMITS: { get: async () => null, put: async () => undefined },
    OTP_KV: { get: async () => null, put: async () => undefined },
    _kv: memorialKv,
  }
}

async function makeJwt(sub) {
  return signJWT({ sub: String(sub), exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET)
}

function patchReq(body, jwt) {
  return new Request(`https://example.com/memorials/${MEMORIAL_ID}/donation/settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
      'CF-Connecting-IP': '1.2.3.4',
    },
    body: JSON.stringify(body),
  })
}

function baseMemorial(overrides = {}) {
  return {
    id: MEMORIAL_ID,
    family_head_user_id: FAMILY_HEAD_USER_ID,
    payout_momo_number: '+233244111222',
    payout_momo_provider: 'mtn',
    payout_account_name: 'Akosua Mensah',
    deleted_at: null,
    ...overrides,
  }
}

describe('PATCH /memorials/:id/donation/settings', () => {
  beforeEach(() => { global.fetch = vi.fn() })

  it('rejects unauthenticated request', async () => {
    const env = makeEnv({ memorial: baseMemorial() })
    const res = await worker.fetch(
      new Request(`https://example.com/memorials/${MEMORIAL_ID}/donation/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wall_mode: 'private' }),
      }),
      env
    )
    expect(res.status).toBe(401)
  })

  it('rejects when caller is not the family head', async () => {
    const env = makeEnv({ memorial: baseMemorial() })
    const jwt = await makeJwt(99)  // different from family_head_user_id
    const res = await worker.fetch(patchReq({ wall_mode: 'private' }, jwt), env)
    expect(res.status).toBe(403)
  })

  it('returns 404 when memorial not found', async () => {
    const env = makeEnv({ memorial: null })
    const jwt = await makeJwt(FAMILY_HEAD_USER_ID)
    const res = await worker.fetch(patchReq({ wall_mode: 'private' }, jwt), env)
    expect(res.status).toBe(404)
  })

  it('updates wall_mode + KV cache', async () => {
    const env = makeEnv({
      memorial: baseMemorial(),
      kvSeed: { donation: { wall_mode: 'full' } },
    })
    const jwt = await makeJwt(FAMILY_HEAD_USER_ID)
    const res = await worker.fetch(patchReq({ wall_mode: 'private' }, jwt), env)
    expect(res.status).toBe(200)
    const kv = JSON.parse(env._kv.get(MEMORIAL_ID))
    expect(kv.donation.wall_mode).toBe('private')
    expect(env.DB._state.auditRows.some(r => JSON.parse(r.args[5]).new_mode === 'private')).toBe(true)
  })

  it('rejects invalid wall_mode', async () => {
    const env = makeEnv({ memorial: baseMemorial() })
    const jwt = await makeJwt(FAMILY_HEAD_USER_ID)
    const res = await worker.fetch(patchReq({ wall_mode: 'bogus' }, jwt), env)
    expect(res.status).toBe(400)
  })

  it('updates donation_paused and writes audit row', async () => {
    const env = makeEnv({ memorial: baseMemorial() })
    const jwt = await makeJwt(FAMILY_HEAD_USER_ID)
    const res = await worker.fetch(patchReq({ donation_paused: true }, jwt), env)
    expect(res.status).toBe(200)
    expect(env.DB._state.memorial.donation_paused).toBe(1)
    expect(env.DB._state.auditRows.some(r => r.args[4] === 'memorial.pause')).toBe(true)
  })

  it('updates goal_amount_pesewas and rejects invalid', async () => {
    const env = makeEnv({ memorial: baseMemorial() })
    const jwt = await makeJwt(FAMILY_HEAD_USER_ID)
    const ok = await worker.fetch(patchReq({ goal_amount_pesewas: 100000 }, jwt), env)
    expect(ok.status).toBe(200)
    const env2 = makeEnv({ memorial: baseMemorial() })
    const bad = await worker.fetch(patchReq({ goal_amount_pesewas: 50 }, jwt), env2)
    expect(bad.status).toBe(400)
  })

  it('returns 400 when no updates provided', async () => {
    const env = makeEnv({ memorial: baseMemorial() })
    const jwt = await makeJwt(FAMILY_HEAD_USER_ID)
    const res = await worker.fetch(patchReq({}, jwt), env)
    expect(res.status).toBe(400)
  })

  it('payout change without OTP returns 401 with otp_required code', async () => {
    const env = makeEnv({ memorial: baseMemorial() })
    const jwt = await makeJwt(FAMILY_HEAD_USER_ID)
    const res = await worker.fetch(
      patchReq({ payout_momo_number: '+233200000000', payout_momo_provider: 'mtn', payout_account_name: 'New' }, jwt),
      env
    )
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('otp_required')
  })

  it('payout change with valid OTP sets pending_payout_* and effective_at 24h ahead', async () => {
    const code = '123456'
    const codeHash = await hashOtp(code, PEPPER)
    const otp = {
      id: 1,
      phone_e164: PHONE,
      code_hash: codeHash,
      expires_at: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      consumed_at: null,
      purpose: 'link',
    }
    const env = makeEnv({ memorial: baseMemorial(), otp })
    const jwt = await makeJwt(FAMILY_HEAD_USER_ID)
    const before = Date.now()
    const res = await worker.fetch(
      patchReq({
        payout_momo_number: '+233200000000',
        payout_momo_provider: 'vodafone',
        payout_account_name: 'New Holder',
        otp_code: code,
        phone: PHONE,
      }, jwt),
      env
    )
    expect(res.status).toBe(200)
    expect(env.DB._state.memorial.pending_payout_momo_number).toBe('+233200000000')
    expect(env.DB._state.memorial.pending_payout_momo_provider).toBe('vodafone')
    expect(env.DB._state.memorial.pending_payout_effective_at).toBeGreaterThanOrEqual(before + 24 * 3600 * 1000 - 1000)
    // OTP consumed
    expect(env.DB._state.otp.consumed_at).not.toBe(null)
    // payout_changed audit row
    expect(env.DB._state.auditRows.some(r => r.args[4] === 'memorial.payout_changed')).toBe(true)
  })

  it('payout change with wrong OTP code returns 401', async () => {
    const codeHash = await hashOtp('123456', PEPPER)
    const otp = {
      id: 1,
      phone_e164: PHONE,
      code_hash: codeHash,
      expires_at: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      consumed_at: null,
      purpose: 'link',
    }
    const env = makeEnv({ memorial: baseMemorial(), otp })
    const jwt = await makeJwt(FAMILY_HEAD_USER_ID)
    const res = await worker.fetch(
      patchReq({
        payout_momo_number: '+233200000000',
        payout_momo_provider: 'vodafone',
        payout_account_name: 'New',
        otp_code: '999999',
        phone: PHONE,
      }, jwt),
      env
    )
    expect(res.status).toBe(401)
    expect(env.DB._state.memorial.pending_payout_momo_number).toBeUndefined()
  })
})
