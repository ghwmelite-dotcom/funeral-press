import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from '../donation-api.js'
import { signJWT } from '../utils/jwt.js'

const JWT_SECRET = 'test-jwt-secret'
const ADMIN_USER_ID = 'admin-uuid'
const PLAIN_USER_ID = 'plain-uuid'

function makeMockDb({ donations = [], memorials = [], userIsAdmin = false, donationLookup = null }) {
  const state = {
    donations: donations.map(d => ({ ...d })),
    memorials: memorials.map(m => ({ ...m })),
    userIsAdmin,
    donationLookup: donationLookup ? { ...donationLookup } : null,
    auditRows: [],
    queries: [],
  }
  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.includes('INSERT INTO donation_audit')) {
            state.auditRows.push({ args })
            return { meta: { changes: 1 } }
          }
          return { meta: { changes: 0 } }
        },
        first: async () => {
          if (sql.includes('FROM user_roles')) {
            return state.userIsAdmin ? { 1: 1 } : null
          }
          if (sql.includes('FROM donations') && sql.includes('WHERE id = ?')) {
            return state.donationLookup
          }
          return null
        },
        all: async () => {
          state.queries.push({ sql, args })
          if (sql.includes('FROM donations')) {
            // args = [cursorTs, ...optional status, limit+1]
            const limit = args[args.length - 1]
            return { results: state.donations.slice(0, limit) }
          }
          if (sql.includes('FROM memorials')) {
            return { results: state.memorials }
          }
          return { results: [] }
        },
      }),
    }),
  }
}

function makeEnv({ donations = [], memorials = [], userIsAdmin = false, donationLookup = null } = {}) {
  return {
    DONATIONS_ENABLED: 'true',
    DONATIONS_GLOBAL_PAUSED: 'false',
    INTERNATIONAL_DONATIONS_ENABLED: 'true',
    JWT_SECRET,
    PAYSTACK_SECRET_KEY: 'sk_test_fake',
    OTP_PEPPER: 'test-pepper',
    DB: makeMockDb({ donations, memorials, userIsAdmin, donationLookup }),
    MEMORIAL_PAGES_KV: { get: async () => null, put: async () => undefined, delete: async () => undefined },
    RATE_LIMITS: { get: async () => null, put: async () => undefined },
    OTP_KV: { get: async () => null, put: async () => undefined },
  }
}

async function makeJwt(sub) {
  return signJWT({ sub: String(sub), exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET)
}

function adminReq(path, method = 'GET', body = null, jwt = null) {
  const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' }
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`
  return new Request(`https://example.com${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

function donationRow(id, status = 'succeeded', overrides = {}) {
  return {
    id, memorial_id: 'mem_1', donor_display_name: `Donor ${id}`,
    amount_pesewas: 5000, tip_pesewas: 250,
    display_currency: 'GHS', display_amount_minor: 5000,
    status, created_at: 1700000000000 + parseInt(id.replace(/\D/g, ''), 10) || 0,
    succeeded_at: status === 'succeeded' ? 1700000000001 : null,
    refunded_at: null,
    paystack_reference: `FP_${id}`,
    ...overrides,
  }
}

describe('GET /admin/donations', () => {
  it('rejects unauthenticated', async () => {
    const env = makeEnv()
    const res = await worker.fetch(adminReq('/admin/donations'), env)
    expect(res.status).toBe(401)
  })

  it('rejects non-admin user', async () => {
    const env = makeEnv({ userIsAdmin: false })
    const jwt = await makeJwt(PLAIN_USER_ID)
    const res = await worker.fetch(adminReq('/admin/donations', 'GET', null, jwt), env)
    expect(res.status).toBe(403)
  })

  it('returns donation list to admin', async () => {
    const env = makeEnv({
      donations: [donationRow('d1'), donationRow('d2', 'pending')],
      userIsAdmin: true,
    })
    const jwt = await makeJwt(ADMIN_USER_ID)
    const res = await worker.fetch(adminReq('/admin/donations', 'GET', null, jwt), env)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.donations.length).toBe(2)
  })

  it('passes status filter into the SQL bindings', async () => {
    const env = makeEnv({
      donations: [donationRow('d1', 'failed')],
      userIsAdmin: true,
    })
    const jwt = await makeJwt(ADMIN_USER_ID)
    const res = await worker.fetch(adminReq('/admin/donations?status=failed', 'GET', null, jwt), env)
    expect(res.status).toBe(200)
    const lastQuery = env.DB._state.queries.at(-1)
    expect(lastQuery.args.includes('failed')).toBe(true)
  })
})

describe('GET /admin/memorials/donation', () => {
  it('rejects non-admin', async () => {
    const env = makeEnv({ userIsAdmin: false })
    const jwt = await makeJwt(PLAIN_USER_ID)
    const res = await worker.fetch(adminReq('/admin/memorials/donation', 'GET', null, jwt), env)
    expect(res.status).toBe(403)
  })

  it('returns memorial donation rows', async () => {
    const env = makeEnv({
      memorials: [
        { id: 'mem_1', slug: 'akua', approval_status: 'approved', total_raised_pesewas: 5000 },
        { id: 'mem_2', slug: 'kofi', approval_status: 'pending', total_raised_pesewas: 0 },
      ],
      userIsAdmin: true,
    })
    const jwt = await makeJwt(ADMIN_USER_ID)
    const res = await worker.fetch(adminReq('/admin/memorials/donation', 'GET', null, jwt), env)
    const j = await res.json()
    expect(j.memorials.length).toBe(2)
    expect(j.memorials[0].slug).toBe('akua')
  })
})

describe('POST /admin/donations/:id/refund', () => {
  beforeEach(() => { global.fetch = vi.fn() })

  it('rejects non-admin', async () => {
    const env = makeEnv({ userIsAdmin: false })
    const jwt = await makeJwt(PLAIN_USER_ID)
    const res = await worker.fetch(adminReq('/admin/donations/d1/refund', 'POST', {}, jwt), env)
    expect(res.status).toBe(403)
  })

  it('returns 404 when donation not found', async () => {
    const env = makeEnv({ userIsAdmin: true, donationLookup: null })
    const jwt = await makeJwt(ADMIN_USER_ID)
    const res = await worker.fetch(adminReq('/admin/donations/missing/refund', 'POST', {}, jwt), env)
    expect(res.status).toBe(404)
  })

  it('returns 400 when donation not in succeeded state', async () => {
    const env = makeEnv({
      userIsAdmin: true,
      donationLookup: { id: 'd1', paystack_reference: 'FP_d1', status: 'pending' },
    })
    const jwt = await makeJwt(ADMIN_USER_ID)
    const res = await worker.fetch(adminReq('/admin/donations/d1/refund', 'POST', {}, jwt), env)
    expect(res.status).toBe(400)
  })

  it('returns 502 when Paystack refund fails', async () => {
    const env = makeEnv({
      userIsAdmin: true,
      donationLookup: { id: 'd1', paystack_reference: 'FP_d1', status: 'succeeded' },
    })
    global.fetch.mockResolvedValueOnce({
      ok: false, status: 422,
      json: async () => ({ status: false, message: 'Refund window expired' }),
    })
    const jwt = await makeJwt(ADMIN_USER_ID)
    const res = await worker.fetch(adminReq('/admin/donations/d1/refund', 'POST', {}, jwt), env)
    expect(res.status).toBe(502)
  })

  it('returns 200 + writes audit when Paystack refund accepts the request', async () => {
    const env = makeEnv({
      userIsAdmin: true,
      donationLookup: { id: 'd1', paystack_reference: 'FP_d1', status: 'succeeded' },
    })
    global.fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ status: true, data: { id: 999, status: 'pending' } }),
    })
    const jwt = await makeJwt(ADMIN_USER_ID)
    const res = await worker.fetch(adminReq('/admin/donations/d1/refund', 'POST', {}, jwt), env)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.refund_pending).toBe(true)
    expect(env.DB._state.auditRows.length).toBe(1)
    expect(env.DB._state.auditRows[0].args[4]).toBe('donation.refund_requested')
  })
})
