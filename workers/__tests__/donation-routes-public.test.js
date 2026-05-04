import { describe, it, expect } from 'vitest'
import worker from '../donation-api.js'
import { signJWT } from '../utils/jwt.js'

const JWT_SECRET = 'test-jwt-secret'
const ADMIN_USER_ID = 'admin-uuid'
const PLAIN_USER_ID = 'plain-uuid'
const MEMORIAL_ID = 'mem_xyz'
const SLUG = 'akua-mensah'

// Lightweight DB mock that returns a predetermined memorial / donation / user
// row. SQL inspection picks the right answer per call.
function makeMockDb({ memorialBySlug = null, memorialById = null, donationByRef = null, userIsAdmin = false, creator = null }) {
  const state = { auditRows: [], userIsAdmin, queries: [] }
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
          state.queries.push({ sql, args })
          if (sql.includes('FROM user_roles')) {
            return state.userIsAdmin ? { 1: 1 } : null
          }
          if (sql.includes('FROM users') && sql.includes('WHERE id = ?')) {
            return creator
          }
          if (sql.includes('FROM memorials WHERE slug = ?')) {
            return memorialBySlug
          }
          if (sql.includes('FROM donations d JOIN memorials m')) {
            return donationByRef
          }
          if (sql.includes('FROM memorials WHERE id = ?')) {
            return memorialById
          }
          return null
        },
        all: async () => ({ results: [] }),
      }),
    }),
  }
}

function makeKv(seed = {}) {
  const map = new Map(Object.entries(seed))
  return {
    _map: map,
    get: async (k) => map.get(k) ?? null,
    put: async (k, v) => map.set(k, v),
    delete: async (k) => map.delete(k),
  }
}

function makeEnv(opts = {}) {
  return {
    DONATIONS_ENABLED: 'true',
    DONATIONS_GLOBAL_PAUSED: 'false',
    INTERNATIONAL_DONATIONS_ENABLED: 'true',
    JWT_SECRET,
    PAYSTACK_SECRET_KEY: 'sk_test_fake',
    OTP_PEPPER: 'test-pepper',
    DB: makeMockDb(opts),
    MEMORIAL_PAGES_KV: makeKv(opts.kvSeed || {}),
    RATE_LIMITS: opts.rateLimits || makeKv(),
    OTP_KV: makeKv(),
  }
}

function getReq(path) {
  return new Request(`https://example.com${path}`, {
    method: 'GET',
    headers: { 'CF-Connecting-IP': '1.2.3.4' },
  })
}

async function makeJwt(sub, extra = {}) {
  return signJWT({ sub: String(sub), exp: Math.floor(Date.now() / 1000) + 3600, ...extra }, JWT_SECRET)
}

function adminReq(path, method = 'POST', body = null, jwt = null) {
  const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' }
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`
  return new Request(`https://example.com${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ==========================================================================
// GET /memorials/by-slug/:slug
// ==========================================================================
describe('GET /memorials/by-slug/:slug', () => {
  it('returns memorial donation summary when slug exists', async () => {
    const env = makeEnv({
      memorialBySlug: {
        id: MEMORIAL_ID, slug: SLUG, approval_status: 'approved', wall_mode: 'full',
        goal_amount_pesewas: 100000, payout_momo_provider: 'mtn',
        payout_momo_number: '+233244111222', payout_account_name: 'Akosua',
        donation_paused: 0, total_raised_pesewas: 5000, total_donor_count: 3,
      },
      kvSeed: {
        [MEMORIAL_ID]: JSON.stringify({ deceased_name: 'Akua Mensah', dates: '1948 — 2025' }),
      },
    })
    const res = await worker.fetch(getReq(`/memorials/by-slug/${SLUG}`), env)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.id).toBe(MEMORIAL_ID)
    expect(j.slug).toBe(SLUG)
    expect(j.deceased_name).toBe('Akua Mensah')
    expect(j.dates).toBe('1948 — 2025')
    expect(j.donation.enabled).toBe(true)
    expect(j.donation.approval_status).toBe('approved')
    expect(j.donation.wall_mode).toBe('full')
    expect(j.donation.total_raised_pesewas).toBe(5000)
    expect(j.donation.total_donor_count).toBe(3)
  })

  it('returns 404 when slug does not exist', async () => {
    const env = makeEnv({ memorialBySlug: null })
    const res = await worker.fetch(getReq('/memorials/by-slug/nope'), env)
    expect(res.status).toBe(404)
  })

  it('reports donation.enabled = false when donation_paused is set', async () => {
    const env = makeEnv({
      memorialBySlug: {
        id: MEMORIAL_ID, slug: SLUG, approval_status: 'approved', wall_mode: 'full',
        donation_paused: 1, total_raised_pesewas: 0, total_donor_count: 0,
      },
    })
    const res = await worker.fetch(getReq(`/memorials/by-slug/${SLUG}`), env)
    const j = await res.json()
    expect(j.donation.enabled).toBe(false)
  })
})

// ==========================================================================
// GET /donations/by-ref/:reference
// ==========================================================================
describe('GET /donations/by-ref/:reference', () => {
  it('returns donation summary with deceased name from KV', async () => {
    const env = makeEnv({
      donationByRef: {
        id: 'don_1', memorial_id: MEMORIAL_ID,
        amount_pesewas: 5000, display_amount_minor: 5000, display_currency: 'GHS',
        donor_display_name: 'Kwame B.', status: 'succeeded',
        payout_momo_provider: 'mtn', slug: SLUG,
      },
      kvSeed: {
        [MEMORIAL_ID]: JSON.stringify({ deceased_name: 'Akua Mensah', dates: '1948 — 2025' }),
      },
    })
    const res = await worker.fetch(getReq('/donations/by-ref/FP_don_1'), env)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.id).toBe('don_1')
    expect(j.deceased_name).toBe('Akua Mensah')
    expect(j.donor_display_name).toBe('Kwame B.')
    expect(j.amount_display).toBe('GHS 50.00')
    expect(j.momo_provider).toBe('mtn')
  })

  it('returns 404 when reference unknown', async () => {
    const env = makeEnv({ donationByRef: null })
    const res = await worker.fetch(getReq('/donations/by-ref/FP_unknown'), env)
    expect(res.status).toBe(404)
  })
})

// ==========================================================================
// GET /memorials/approval-lookup?token=...
// ==========================================================================
describe('GET /memorials/approval-lookup', () => {
  it('returns 400 when no token query param provided', async () => {
    const env = makeEnv()
    const res = await worker.fetch(getReq('/memorials/approval-lookup'), env)
    expect(res.status).toBe(400)
  })

  it('returns 401 when JWT signature is invalid', async () => {
    const env = makeEnv()
    const res = await worker.fetch(getReq('/memorials/approval-lookup?token=not-a-jwt'), env)
    expect(res.status).toBe(401)
  })

  it('returns 401 when JWT scope is wrong', async () => {
    const badToken = await makeJwt('+233244111222', {
      memorial_id: MEMORIAL_ID,
      scope: 'something_else',
    })
    const env = makeEnv()
    const res = await worker.fetch(getReq(`/memorials/approval-lookup?token=${badToken}`), env)
    expect(res.status).toBe(401)
  })

  it('returns memorial details when token is valid and memorial pending', async () => {
    const token = await makeJwt('+233244111222', {
      memorial_id: MEMORIAL_ID,
      scope: 'family_head_approval',
    })
    const env = makeEnv({
      memorialById: {
        id: MEMORIAL_ID, slug: SLUG, family_head_name: 'Akosua',
        family_head_phone: '+233244111222', creator_user_id: 'creator-uuid',
        wall_mode: 'full', goal_amount_pesewas: 100000,
        payout_momo_provider: 'mtn', payout_momo_number: '+233244111222',
        payout_account_name: 'Akosua', approval_status: 'pending',
      },
      creator: { name: 'Kwame', email: 'kwame@example.com' },
      kvSeed: {
        [MEMORIAL_ID]: JSON.stringify({ deceased_name: 'Akua Mensah', dates: '1948 — 2025' }),
      },
    })
    const res = await worker.fetch(getReq(`/memorials/approval-lookup?token=${token}`), env)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.id).toBe(MEMORIAL_ID)
    expect(j.deceased_name).toBe('Akua Mensah')
    expect(j.family_head_name).toBe('Akosua')
    expect(j.family_head_phone).toBe('+233244111222')
    expect(j.creator_name).toBe('Kwame')
    expect(j.donation.payout_momo_provider).toBe('mtn')
  })

  it('returns 410 when approval already used', async () => {
    const token = await makeJwt('+233244111222', {
      memorial_id: MEMORIAL_ID,
      scope: 'family_head_approval',
    })
    const env = makeEnv({
      memorialById: {
        id: MEMORIAL_ID, slug: SLUG, family_head_name: 'Akosua',
        family_head_phone: '+233244111222', creator_user_id: 'creator-uuid',
        wall_mode: 'full', goal_amount_pesewas: 100000,
        payout_momo_provider: 'mtn', payout_momo_number: '+233244111222',
        payout_account_name: 'Akosua', approval_status: 'approved',
      },
    })
    const res = await worker.fetch(getReq(`/memorials/approval-lookup?token=${token}`), env)
    expect(res.status).toBe(410)
  })

  it('returns 404 when memorial id from token does not exist', async () => {
    const token = await makeJwt('+233244111222', {
      memorial_id: 'mem_missing',
      scope: 'family_head_approval',
    })
    const env = makeEnv({ memorialById: null })
    const res = await worker.fetch(getReq(`/memorials/approval-lookup?token=${token}`), env)
    expect(res.status).toBe(404)
  })
})

// ==========================================================================
// GET /memorials/:id/donation-status
// ==========================================================================
describe('GET /memorials/:id/donation-status', () => {
  it('returns enabled:true when memorial exists and not paused', async () => {
    const env = makeEnv({
      memorialById: {
        id: MEMORIAL_ID, slug: SLUG, approval_status: 'approved', wall_mode: 'full',
        donation_paused: 0, goal_amount_pesewas: 100000,
        total_raised_pesewas: 5000, total_donor_count: 3,
      },
    })
    const res = await worker.fetch(getReq(`/memorials/${MEMORIAL_ID}/donation-status`), env)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.donation.enabled).toBe(true)
    expect(j.donation.approval_status).toBe('approved')
    expect(j.donation.total_raised_pesewas).toBe(5000)
  })

  it('returns minimal {enabled:false} when memorial row missing', async () => {
    const env = makeEnv({ memorialById: null })
    const res = await worker.fetch(getReq(`/memorials/${MEMORIAL_ID}/donation-status`), env)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j).toEqual({ enabled: false })
  })

  it('returns enabled:false when donation_paused = 1', async () => {
    const env = makeEnv({
      memorialById: {
        id: MEMORIAL_ID, slug: SLUG, approval_status: 'approved', wall_mode: 'full',
        donation_paused: 1, total_raised_pesewas: 0, total_donor_count: 0,
      },
    })
    const res = await worker.fetch(getReq(`/memorials/${MEMORIAL_ID}/donation-status`), env)
    const j = await res.json()
    expect(j.donation.enabled).toBe(false)
  })
})

// ==========================================================================
// POST /admin/donations/kill-switch
// ==========================================================================
describe('POST /admin/donations/kill-switch', () => {
  it('rejects unauthenticated', async () => {
    const env = makeEnv()
    const res = await worker.fetch(adminReq('/admin/donations/kill-switch', 'POST', { paused: true }), env)
    expect(res.status).toBe(401)
  })

  it('rejects non-admin user', async () => {
    const env = makeEnv({ userIsAdmin: false })
    const jwt = await makeJwt(PLAIN_USER_ID)
    const res = await worker.fetch(
      adminReq('/admin/donations/kill-switch', 'POST', { paused: true }, jwt),
      env
    )
    expect(res.status).toBe(403)
  })

  it('returns 400 when body lacks boolean paused', async () => {
    const env = makeEnv({ userIsAdmin: true })
    const jwt = await makeJwt(ADMIN_USER_ID)
    const res = await worker.fetch(
      adminReq('/admin/donations/kill-switch', 'POST', { paused: 'yes' }, jwt),
      env
    )
    expect(res.status).toBe(400)
  })

  it('writes KV flag and returns paused state on success', async () => {
    const rateLimits = makeKv()
    const env = makeEnv({ userIsAdmin: true, rateLimits })
    const jwt = await makeJwt(ADMIN_USER_ID)
    const res = await worker.fetch(
      adminReq('/admin/donations/kill-switch', 'POST', { paused: true }, jwt),
      env
    )
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.ok).toBe(true)
    expect(j.paused).toBe(true)
    expect(rateLimits._map.get('kill_switch:donations_paused')).toBe('1')
    // Audit log written
    expect(env.DB._state.auditRows.length).toBe(1)
    expect(env.DB._state.auditRows[0].args[4]).toBe('admin.kill_switch')
  })
})

// ==========================================================================
// Kill-switch KV gate on /donation/charge
// ==========================================================================
describe('KV-driven global kill switch on /donation/charge', () => {
  it('returns 503 on charge when KV flag set to "1"', async () => {
    const rateLimits = makeKv({ 'kill_switch:donations_paused': '1' })
    const env = makeEnv({ rateLimits })
    const req = new Request(`https://example.com/memorials/${MEMORIAL_ID}/donation/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' },
      body: JSON.stringify({ display_amount_minor: 5000 }),
    })
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(503)
  })
})
