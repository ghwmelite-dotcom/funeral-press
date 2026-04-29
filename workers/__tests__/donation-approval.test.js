import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from '../donation-api.js'
import { signJWT } from '../utils/jwt.js'
import { hashOtp } from '../utils/otp.js'

const PEPPER = 'test-pepper'
const JWT_SECRET = 'test-jwt-secret'
const PHONE = '+233207777777'
const MEMORIAL_ID = 'mem_abc'

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function makeMockDb({ memorial, otp, user = null }) {
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
          // UPDATE phone_otps SET attempts = attempts + 1
          if (sql.includes('UPDATE phone_otps SET attempts')) {
            if (state.otp && state.otp.id === args[0]) state.otp.attempts += 1
            return { meta: { changes: 1, last_row_id: 0 } }
          }
          // UPDATE phone_otps SET consumed_at
          if (sql.includes('UPDATE phone_otps SET consumed_at')) {
            if (state.otp && state.otp.id === args[1]) state.otp.consumed_at = args[0]
            return { meta: { changes: 1, last_row_id: 0 } }
          }
          // INSERT INTO users
          if (sql.includes('INSERT INTO users')) {
            const id = (state.user?.id || 0) + 100
            state.user = { id, phone_e164: args[2] }
            state.inserts.push({ table: 'users', args })
            return { meta: { last_row_id: id } }
          }
          // UPDATE memorials ... WHERE id = ? AND approval_status = 'pending'
          if (sql.includes('UPDATE memorials')) {
            state.updates.push({ sql, args })
            if (!state.memorial || state.memorial.approval_status !== 'pending') {
              return { meta: { changes: 0, last_row_id: 0 } }
            }
            if (sql.includes("approval_status = 'approved'")) {
              state.memorial.approval_status = 'approved'
              state.memorial.approved_at = args[0]
              state.memorial.family_head_user_id = args[1]
              state.memorial.approval_token_hash = null
            } else if (sql.includes("approval_status = 'rejected'")) {
              state.memorial.approval_status = 'rejected'
              state.memorial.rejected_at = args[0]
              state.memorial.rejection_reason = args[1]
              state.memorial.approval_token_hash = null
            }
            return { meta: { changes: 1, last_row_id: 0 } }
          }
          // INSERT INTO donation_audit
          if (sql.includes('INSERT INTO donation_audit')) {
            state.auditRows.push({ args })
            return { meta: { last_row_id: 1 } }
          }
          return { meta: { changes: 0, last_row_id: 0 } }
        },
        first: async () => {
          // SELECT * FROM memorials WHERE id = ? AND approval_status = 'pending' AND approval_token_hash = ?
          if (sql.includes('FROM memorials')) {
            const m = state.memorial
            if (!m) return null
            if (m.id !== args[0]) return null
            if (m.approval_status !== 'pending') return null
            if (m.approval_token_hash !== args[1]) return null
            return m
          }
          // SELECT id, code_hash, ... FROM phone_otps WHERE phone_e164 = ? AND purpose = ? AND consumed_at IS NULL ...
          if (sql.includes('FROM phone_otps')) {
            const o = state.otp
            if (!o) return null
            if (o.phone_e164 !== args[0]) return null
            if (o.purpose !== args[1]) return null
            if (o.consumed_at !== null) return null
            return o
          }
          // SELECT id FROM users WHERE phone_e164 = ?
          if (sql.includes('FROM users')) {
            if (!state.user) return null
            if (state.user.phone_e164 !== args[0]) return null
            return { id: state.user.id }
          }
          return null
        },
        all: async () => ({ results: [] }),
      }),
    }),
  }
}

async function setupApprovalCtx({ phoneOnToken = PHONE, expiredOtp = false, otpPurpose = 'family_head_approval' } = {}) {
  // Build approval JWT
  const tokenPayload = {
    sub: phoneOnToken,
    memorial_id: MEMORIAL_ID,
    scope: 'family_head_approval',
    jti: 'jti_test',
    exp: Math.floor(Date.now() / 1000) + 24 * 3600,
  }
  const token = await signJWT(tokenPayload, JWT_SECRET)
  const tokenHash = await sha256Hex(token)

  const code = '123456'
  const codeHash = await hashOtp(code, PEPPER)

  const memorial = {
    id: MEMORIAL_ID,
    slug: 'akua-mensah',
    creator_user_id: 42,
    family_head_phone: phoneOnToken,
    family_head_name: 'Akosua',
    family_head_user_id: null,
    paystack_subaccount_code: 'ACCT_xyz',
    payout_momo_number: '+233244111222',
    payout_momo_provider: 'mtn',
    payout_account_name: 'Akosua Mensah',
    wall_mode: 'full',
    goal_amount_pesewas: null,
    approval_status: 'pending',
    approval_token_hash: tokenHash,
    approval_token_expires_at: tokenPayload.exp * 1000,
  }
  const otp = {
    id: 1,
    phone_e164: phoneOnToken,
    code_hash: codeHash,
    expires_at: expiredOtp ? Date.now() - 1000 : Date.now() + 5 * 60 * 1000,
    attempts: 0,
    consumed_at: null,
    purpose: otpPurpose,
  }

  return { token, code, memorial, otp }
}

function makeEnv({ memorial, otp, user = null, kvSeed = null }) {
  const memorialKv = new Map()
  if (kvSeed) memorialKv.set(MEMORIAL_ID, JSON.stringify(kvSeed))
  return {
    DONATIONS_ENABLED: 'true',
    DONATIONS_GLOBAL_PAUSED: 'false',
    INTERNATIONAL_DONATIONS_ENABLED: 'true',
    JWT_SECRET,
    PAYSTACK_SECRET_KEY: 'sk_test_fake',
    PAYSTACK_WEBHOOK_SECRET: 'whsec_fake',
    OTP_PEPPER: PEPPER,
    TIP_DEFAULT_PERCENT: '5',
    TERMII_API_KEY: 'fake-termii',
    DB: makeMockDb({ memorial, otp, user }),
    MEMORIAL_PAGES_KV: {
      get: async (k) => memorialKv.get(k) || null,
      put: async (k, v) => memorialKv.set(k, v),
    },
    RATE_LIMITS: { get: async () => null, put: async () => undefined },
    OTP_KV: { get: async () => null, put: async () => undefined },
    _kv: memorialKv,
  }
}

function approveReq(body) {
  return new Request(`https://example.com/memorials/${MEMORIAL_ID}/donation/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' },
    body: JSON.stringify(body),
  })
}

function rejectReq(body) {
  return new Request(`https://example.com/memorials/${MEMORIAL_ID}/donation/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' },
    body: JSON.stringify(body),
  })
}

describe('POST /memorials/:id/donation/approve', () => {
  beforeEach(() => { global.fetch = vi.fn() })

  it('succeeds with valid token + verified OTP, flips KV to approved+enabled', async () => {
    const ctx = await setupApprovalCtx()
    const env = makeEnv({
      memorial: ctx.memorial,
      otp: ctx.otp,
      kvSeed: { slug: 'a', deceased_name: 'Akua', donation: { enabled: false, approval_status: 'pending' } },
    })
    const res = await worker.fetch(approveReq({ token: ctx.token, otp_code: ctx.code, phone: PHONE }), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.approval_status).toBe('approved')
    // memorial state flipped
    expect(env.DB._state.memorial.approval_status).toBe('approved')
    expect(env.DB._state.memorial.family_head_user_id).toBeTruthy()
    // KV flipped
    const kv = JSON.parse(env._kv.get(MEMORIAL_ID))
    expect(kv.donation.enabled).toBe(true)
    expect(kv.donation.approval_status).toBe('approved')
    // audit row written
    expect(env.DB._state.auditRows.length).toBe(1)
  })

  it('creates a user when phone is not yet in users table', async () => {
    const ctx = await setupApprovalCtx()
    const env = makeEnv({ memorial: ctx.memorial, otp: ctx.otp, user: null })
    const res = await worker.fetch(approveReq({ token: ctx.token, otp_code: ctx.code, phone: PHONE }), env)
    expect(res.status).toBe(200)
    expect(env.DB._state.inserts.some(i => i.table === 'users')).toBe(true)
    expect(env.DB._state.user.phone_e164).toBe(PHONE)
  })

  it('reuses existing user when phone is already in users table', async () => {
    const ctx = await setupApprovalCtx()
    const existingUser = { id: 7, phone_e164: PHONE }
    const env = makeEnv({ memorial: ctx.memorial, otp: ctx.otp, user: existingUser })
    const res = await worker.fetch(approveReq({ token: ctx.token, otp_code: ctx.code, phone: PHONE }), env)
    expect(res.status).toBe(200)
    expect(env.DB._state.inserts.some(i => i.table === 'users')).toBe(false)
    expect(env.DB._state.memorial.family_head_user_id).toBe(7)
  })

  it('rejects when token + body phone mismatch', async () => {
    const ctx = await setupApprovalCtx()
    const env = makeEnv({ memorial: ctx.memorial, otp: ctx.otp })
    const res = await worker.fetch(approveReq({ token: ctx.token, otp_code: ctx.code, phone: '+233200000000' }), env)
    expect(res.status).toBe(401)
  })

  it('rejects already-consumed token (memorial no longer pending or hash cleared)', async () => {
    const ctx = await setupApprovalCtx()
    const consumed = { ...ctx.memorial, approval_status: 'approved', approval_token_hash: null }
    const env = makeEnv({ memorial: consumed, otp: ctx.otp })
    const res = await worker.fetch(approveReq({ token: ctx.token, otp_code: ctx.code, phone: PHONE }), env)
    expect(res.status).toBe(401)
  })

  it('rejects wrong OTP code', async () => {
    const ctx = await setupApprovalCtx()
    const env = makeEnv({ memorial: ctx.memorial, otp: ctx.otp })
    const res = await worker.fetch(approveReq({ token: ctx.token, otp_code: '999999', phone: PHONE }), env)
    expect(res.status).toBe(401)
  })

  it('rejects when no OTP row pending for that phone', async () => {
    const ctx = await setupApprovalCtx()
    const env = makeEnv({ memorial: ctx.memorial, otp: null })
    const res = await worker.fetch(approveReq({ token: ctx.token, otp_code: ctx.code, phone: PHONE }), env)
    expect(res.status).toBe(401)
  })

  it('rejects with 400 on missing fields', async () => {
    const env = makeEnv({ memorial: null, otp: null })
    const res = await worker.fetch(approveReq({ token: 'x' }), env)
    expect(res.status).toBe(400)
  })
})

describe('POST /memorials/:id/donation/reject', () => {
  beforeEach(() => { global.fetch = vi.fn() })

  it('flips memorial to rejected with reason and updates KV', async () => {
    const ctx = await setupApprovalCtx()
    const env = makeEnv({
      memorial: ctx.memorial, otp: ctx.otp,
      kvSeed: { slug: 'a', donation: { enabled: false, approval_status: 'pending' } },
    })
    const res = await worker.fetch(
      rejectReq({ token: ctx.token, otp_code: ctx.code, phone: PHONE, reason: 'Not the family head' }),
      env
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.approval_status).toBe('rejected')
    expect(env.DB._state.memorial.approval_status).toBe('rejected')
    expect(env.DB._state.memorial.rejection_reason).toBe('Not the family head')
    const kv = JSON.parse(env._kv.get(MEMORIAL_ID))
    expect(kv.donation.approval_status).toBe('rejected')
    expect(kv.donation.enabled).toBe(false)
  })

  it('rejects reason longer than 500 chars', async () => {
    const ctx = await setupApprovalCtx()
    const env = makeEnv({ memorial: ctx.memorial, otp: ctx.otp })
    const res = await worker.fetch(
      rejectReq({ token: ctx.token, otp_code: ctx.code, phone: PHONE, reason: 'x'.repeat(501) }),
      env
    )
    expect(res.status).toBe(400)
  })
})
