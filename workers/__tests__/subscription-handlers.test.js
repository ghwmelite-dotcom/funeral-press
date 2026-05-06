import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from '../auth-api.js'
import { signJWT } from '../utils/jwt.js'

const JWT_SECRET = 'test-jwt-secret'
const USER_ID = 'user-uuid-1'
const SUB_ID = 'sub-uuid-1'

// ─── DB mock ────────────────────────────────────────────────────────────────
//
// `getUserSubscription` runs:
//   SELECT * FROM subscriptions
//   WHERE user_id = ? AND status IN ('active', 'past_due')
//   ORDER BY created_at DESC LIMIT 1
//
// We model this by storing an array of subscription rows and applying the
// same WHERE/ORDER-BY/LIMIT in JS so tests can reason about filtering.

function makeMockDb({ subscriptions = [], user = null } = {}) {
  const state = {
    subscriptions: subscriptions.map(s => ({ ...s })),
    user,
    inserts: [],
    updates: [],
    deletes: [],
  }

  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.startsWith('INSERT INTO subscriptions')) {
            state.inserts.push({ sql, args })
            return { meta: { changes: 1 } }
          }
          if (sql.startsWith('UPDATE subscriptions')) {
            state.updates.push({ sql, args })
            return { meta: { changes: 1 } }
          }
          if (sql.startsWith('INSERT INTO subscription_events') || sql.startsWith('INSERT INTO audit_log')) {
            state.inserts.push({ sql, args })
            return { meta: { changes: 1 } }
          }
          return { meta: { changes: 0 } }
        },
        first: async () => {
          // getUserSubscription: WHERE user_id = ? AND status IN ('active','past_due') ORDER BY created_at DESC LIMIT 1
          if (sql.includes('FROM subscriptions') && sql.includes('user_id')) {
            const userId = args[0]
            const rows = state.subscriptions
              .filter(s => s.user_id === userId && ['active', 'past_due'].includes(s.status))
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            return rows[0] || null
          }
          if (sql.includes('FROM users WHERE id = ?')) {
            return state.user
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
    PAYSTACK_SECRET_KEY: 'sk_test_fake',
    PAYSTACK_PLAN_MONTHLY: 'PLN_test_monthly',
    PAYSTACK_PLAN_ANNUAL: 'PLN_test_annual',
    CORS_ORIGIN: 'https://funeralpress.org',
    OTP_PEPPER: 'test-pepper',
    DB: makeMockDb(opts),
    RATE_LIMITS: { get: async () => null, put: async () => undefined },
    OTP_KV: { get: async () => null, put: async () => undefined },
    MEMORIAL_PAGES_KV: { get: async () => null, put: async () => undefined },
  }
}

async function makeJwt(sub = USER_ID) {
  return signJWT({ sub: String(sub), email: 'u@example.com', exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET)
}

function createReq(body, jwt) {
  return new Request('https://example.com/subscriptions/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      'CF-Connecting-IP': '1.2.3.4',
    },
    body: JSON.stringify(body || {}),
  })
}

function statusReq(jwt) {
  return new Request('https://example.com/subscriptions/status', {
    method: 'GET',
    headers: {
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      'CF-Connecting-IP': '1.2.3.4',
    },
  })
}

function subRow(overrides = {}) {
  return {
    id: SUB_ID,
    user_id: USER_ID,
    plan: 'pro_monthly',
    status: 'active',
    monthly_credits_remaining: 12,
    paystack_subscription_code: 'SUB_xyz',
    paystack_email_token: 'tok_xyz',
    cancel_at_period_end: 0,
    current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

// ─── handleSubscriptionCreate ───────────────────────────────────────────────

describe('POST /subscriptions/create', () => {
  beforeEach(() => {
    // Default Paystack stub: success with hosted authorization URL
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/abc123',
          access_code: 'access_code_xyz',
          reference: 'ref_xyz',
        },
      }),
    })
  })

  it('returns 401 when unauthenticated', async () => {
    const env = makeEnv({ user: { id: USER_ID, email: 'u@example.com' } })
    const res = await worker.fetch(createReq({ plan: 'pro_monthly' }, null), env)
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid plan', async () => {
    const env = makeEnv({ user: { id: USER_ID, email: 'u@example.com' } })
    const jwt = await makeJwt()
    const res = await worker.fetch(createReq({ plan: 'bogus_plan' }, jwt), env)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/invalid plan/i)
  })

  it('returns 400 when no plan provided', async () => {
    const env = makeEnv({ user: { id: USER_ID, email: 'u@example.com' } })
    const jwt = await makeJwt()
    const res = await worker.fetch(createReq({}, jwt), env)
    expect(res.status).toBe(400)
  })

  it('returns 400 when user already has an active subscription', async () => {
    const env = makeEnv({
      subscriptions: [subRow({ status: 'active' })],
      user: { id: USER_ID, email: 'u@example.com' },
    })
    const jwt = await makeJwt()
    const res = await worker.fetch(createReq({ plan: 'pro_monthly' }, jwt), env)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/already have an active subscription/i)
  })

  it('initializes Paystack and returns the hosted authorization URL on happy path', async () => {
    const env = makeEnv({
      subscriptions: [],
      user: { id: USER_ID, email: 'u@example.com' },
    })
    const jwt = await makeJwt()
    const res = await worker.fetch(createReq({ plan: 'pro_monthly' }, jwt), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.authorization_url).toBe('https://checkout.paystack.com/abc123')
    expect(body.access_code).toBe('access_code_xyz')
    expect(body.reference).toBe('ref_xyz')

    // Verify Paystack was called with the right plan code, email, and metadata
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.paystack.co/transaction/initialize')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer sk_test_fake')
    const payload = JSON.parse(init.body)
    expect(payload.email).toBe('u@example.com')
    expect(payload.plan).toBe('PLN_test_monthly')
    expect(payload.metadata).toEqual({ userId: USER_ID, plan: 'pro_monthly' })
    expect(payload.callback_url).toBe('https://funeralpress.org/subscription/callback')
  })

  it('uses the annual plan code for plan=pro_annual', async () => {
    const env = makeEnv({
      subscriptions: [],
      user: { id: USER_ID, email: 'u@example.com' },
    })
    const jwt = await makeJwt()
    const res = await worker.fetch(createReq({ plan: 'pro_annual' }, jwt), env)
    expect(res.status).toBe(200)
    const payload = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(payload.plan).toBe('PLN_test_annual')
  })

  it('returns 500 when Paystack returns status:false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: false, message: 'Plan not found' }),
    })
    const env = makeEnv({
      subscriptions: [],
      user: { id: USER_ID, email: 'u@example.com' },
    })
    const jwt = await makeJwt()
    const res = await worker.fetch(createReq({ plan: 'pro_monthly' }, jwt), env)
    expect(res.status).toBe(500)
  })

  // The current handler does NOT pre-insert a `pending` subscriptions row;
  // rows are written by the Paystack webhook on subscription.create. Track as
  // a possible future enhancement so test intent is preserved.
  it.todo('inserts a pending subscriptions row before redirecting to Paystack (currently row is created from the webhook)')
})

// ─── getUserSubscription (exercised through GET /subscriptions/status) ──────

describe('getUserSubscription via GET /subscriptions/status', () => {
  beforeEach(() => { global.fetch = vi.fn() })

  it('returns hasSubscription:false when the user has no rows at all', async () => {
    const env = makeEnv({ subscriptions: [], user: { id: USER_ID, email: 'u@example.com' } })
    const jwt = await makeJwt()
    const res = await worker.fetch(statusReq(jwt), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.hasSubscription).toBe(false)
  })

  it('returns hasSubscription:false when the only row is cancelled', async () => {
    const env = makeEnv({
      subscriptions: [subRow({ status: 'cancelled' })],
      user: { id: USER_ID, email: 'u@example.com' },
    })
    const jwt = await makeJwt()
    const res = await worker.fetch(statusReq(jwt), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.hasSubscription).toBe(false)
  })

  it('returns the active row when one exists', async () => {
    const env = makeEnv({
      subscriptions: [subRow({ status: 'active', plan: 'pro_monthly' })],
      user: { id: USER_ID, email: 'u@example.com' },
    })
    const jwt = await makeJwt()
    const res = await worker.fetch(statusReq(jwt), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.hasSubscription).toBe(true)
    expect(body.plan).toBe('pro_monthly')
    expect(body.status).toBe('active')
  })

  it('also surfaces past_due subscriptions (status IN active, past_due)', async () => {
    const env = makeEnv({
      subscriptions: [subRow({ status: 'past_due' })],
      user: { id: USER_ID, email: 'u@example.com' },
    })
    const jwt = await makeJwt()
    const res = await worker.fetch(statusReq(jwt), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.hasSubscription).toBe(true)
    expect(body.status).toBe('past_due')
  })

  it('prefers the most recently created row when several active rows exist', async () => {
    const older = subRow({
      id: 'sub-old',
      status: 'active',
      plan: 'pro_monthly',
      created_at: new Date(Date.now() - 86400_000).toISOString(),
    })
    const newer = subRow({
      id: 'sub-new',
      status: 'active',
      plan: 'pro_annual',
      created_at: new Date().toISOString(),
    })
    const env = makeEnv({
      subscriptions: [older, newer],
      user: { id: USER_ID, email: 'u@example.com' },
    })
    const jwt = await makeJwt()
    const res = await worker.fetch(statusReq(jwt), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.plan).toBe('pro_annual')
  })

  it('ignores cancelled rows even if they are newer than an active row', async () => {
    const olderActive = subRow({
      id: 'sub-old',
      status: 'active',
      plan: 'pro_monthly',
      created_at: new Date(Date.now() - 86400_000).toISOString(),
    })
    const newerCancelled = subRow({
      id: 'sub-cancel',
      status: 'cancelled',
      plan: 'pro_annual',
      created_at: new Date().toISOString(),
    })
    const env = makeEnv({
      subscriptions: [olderActive, newerCancelled],
      user: { id: USER_ID, email: 'u@example.com' },
    })
    const jwt = await makeJwt()
    const res = await worker.fetch(statusReq(jwt), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.hasSubscription).toBe(true)
    expect(body.plan).toBe('pro_monthly') // active wins despite being older
  })
})
