/**
 * Tests for Task 5: Annual recurring memorial subscription
 *
 * Covers:
 *  - POST /memorial-premium/:id/subscribe (handleMemorialSubscriptionCreate)
 *  - handleSubscriptionWebhook: memorial_annual subscription.create
 *  - handleSubscriptionWebhook: memorial_annual charge.success (renewal)
 *  - handleSubscriptionWebhook: memorial_annual subscription.disable / not_renew
 *  - handleSubscriptionWebhook: account pro_monthly smoke test (no regression)
 *  - runDunningCron memorial renewal reminder emails (T-14 / T-3)
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import worker from '../auth-api.js'
import { signJWT } from '../utils/jwt.js'
import { runDunningCron } from '../utils/dunning.js'

const JWT_SECRET = 'test-jwt-secret'
const USER_ID = 'user-annual-1'
const MEMORIAL_ID = 'mem-annual-1'
const PAYSTACK_IP = '52.31.139.75'
const BASE = 'https://api.example.com'

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function makeJwt(sub = USER_ID, email = 'buyer@example.com') {
  return signJWT(
    { sub, email, exp: Math.floor(Date.now() / 1000) + 3600 },
    JWT_SECRET
  )
}

async function authedPost(path, body, jwt) {
  return new Request(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      'CF-Connecting-IP': '1.2.3.4',
    },
    body: JSON.stringify(body),
  })
}

async function hmacHex(body, secret) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function webhookReq(eventPayload, secret = 'sk_test_fake') {
  const body = JSON.stringify(eventPayload)
  return hmacHex(body, secret).then((sig) =>
    new Request(`${BASE}/subscriptions/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': PAYSTACK_IP,
        'x-paystack-signature': sig,
      },
      body,
    })
  )
}

// ─── DB mock ─────────────────────────────────────────────────────────────────

function makeMockDb({ user = { id: USER_ID, email: 'buyer@example.com' }, premium = [], subscriptions = [] } = {}) {
  const state = {
    user,
    premium: premium.map((p) => ({ ...p })),
    subscriptions: subscriptions.map((s) => ({ ...s })),
    inserts: [],
    updates: [],
    events: [],
  }

  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          // INSERT INTO subscriptions
          if (sql.includes('INSERT INTO subscriptions')) {
            const isMemorialInsert = sql.includes('memorial_id, memorial_tier')
            const isAccountInsert = !isMemorialInsert

            if (isMemorialInsert) {
              // Memorial annual INSERT:
              // VALUES (?, ?, 'memorial_annual', 'active', ?, ?, ?, ?, ?, 0, ?, ?)
              // bind: subId[0], buyerUserId[1], subCode[2], customerCode[3],
              //       emailToken[4], now[5], periodEnd[6], memorialId[7], tier[8]
              const subCode = args[2]
              const existing = state.subscriptions.find((s) => s.paystack_subscription_code === subCode)
              if (existing && sql.includes('ON CONFLICT')) {
                existing.status = 'active'
                existing.current_period_end = args[6]
                state.updates.push({ sql, args })
                return { meta: { changes: 1 } }
              }
              const row = {
                id: args[0],
                user_id: args[1],
                plan: 'memorial_annual',
                status: 'active',
                paystack_subscription_code: args[2],
                paystack_customer_code: args[3],
                paystack_email_token: args[4],
                current_period_start: args[5],
                current_period_end: args[6],
                monthly_credits_remaining: 0,
                memorial_id: args[7],
                memorial_tier: args[8],
              }
              state.subscriptions.push(row)
              state.inserts.push({ sql, args, type: 'subscription' })
              return { meta: { changes: 1 } }
            }

            if (isAccountInsert) {
              // Account sub INSERT:
              // VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, 15)
              // bind: id[0], userId[1], plan[2], subCode[3], customerCode[4],
              //       emailToken[5], now[6], periodEnd[7]
              const row = {
                id: args[0],
                user_id: args[1],
                plan: args[2],
                status: 'active',
                paystack_subscription_code: args[3],
                paystack_customer_code: args[4],
                paystack_email_token: args[5],
                current_period_start: args[6],
                current_period_end: args[7],
                monthly_credits_remaining: 15,
                memorial_id: null,
                memorial_tier: null,
              }
              state.subscriptions.push(row)
              state.inserts.push({ sql, args, type: 'subscription' })
              return { meta: { changes: 1 } }
            }
          }

          // INSERT INTO memorial_premium (UPSERT)
          if (sql.includes('INSERT INTO memorial_premium')) {
            // VALUES (?, ?, ?, 'annual', ?, 'succeeded', ?, 'GHS', ?, ?, ?)
            // bind: id[0], memorialId[1], tier[2], subCode[3], amountPesewas[4],
            //       buyerUserId[5], periodEndMs[6], createdAt[7]
            const memId = args[1]
            const planType = 'annual'  // literal in SQL
            const existing = state.premium.find(
              (p) => p.memorial_id === memId && p.plan_type === planType
            )
            if (existing && sql.includes('ON CONFLICT')) {
              existing.tier = args[2]
              existing.paystack_subscription_code = args[3]
              existing.status = 'succeeded'
              existing.amount_pesewas = args[4]
              existing.expires_at = args[6]
              state.updates.push({ sql, args, type: 'memorial_premium_upsert' })
              return { meta: { changes: 1 } }
            }
            const row = {
              id: args[0],
              memorial_id: args[1],
              tier: args[2],
              plan_type: 'annual',
              paystack_subscription_code: args[3],
              status: 'succeeded',
              amount_pesewas: args[4],
              currency: 'GHS',
              buyer_user_id: args[5],
              expires_at: args[6],
              created_at: args[7],
            }
            state.premium.push(row)
            state.inserts.push({ sql, args, type: 'memorial_premium' })
            return { meta: { changes: 1 } }
          }

          // UPDATE memorial_premium (renewal expires_at extension)
          // Two shapes:
          //   account branch: WHERE paystack_subscription_code = ? AND plan_type = 'annual'
          //                   args = [periodEndMs, subCode]
          //   (dead) memorial branch was: WHERE memorial_id = ? AND plan_type = 'annual'
          //                   args = [periodEndMs, memorialId]
          if (sql.includes('UPDATE memorial_premium')) {
            const newExpiresAt = args[0]
            const key = args[1]
            let rows
            if (sql.includes('paystack_subscription_code = ?')) {
              rows = state.premium.filter(
                (p) => p.paystack_subscription_code === key && p.plan_type === 'annual'
              )
            } else {
              // fallback: keyed on memorial_id
              rows = state.premium.filter(
                (p) => p.memorial_id === key && p.plan_type === 'annual'
              )
            }
            for (const r of rows) r.expires_at = newExpiresAt
            state.updates.push({ sql, args, type: 'memorial_premium_update' })
            return { meta: { changes: rows.length } }
          }

          // UPDATE subscriptions
          if (sql.includes('UPDATE subscriptions')) {
            // Match by id (last arg) or by paystack_subscription_code (last arg depending on query)
            state.updates.push({ sql, args, type: 'subscription_update' })
            const idOrCode = args[args.length - 1]
            let sub = state.subscriptions.find((s) => s.id === idOrCode || s.paystack_subscription_code === idOrCode)
            if (sub) {
              if (sql.includes("status = 'active'")) sub.status = 'active'
              if (sql.includes("status = 'cancelled'")) sub.status = 'cancelled'
              if (sql.includes("status = 'past_due'")) sub.status = 'past_due'
              if (sql.includes('monthly_credits_remaining = 15')) sub.monthly_credits_remaining = 15
              if (sql.includes('dunning_stage = 0')) sub.dunning_stage = 0
              if (args[0] && sql.includes('current_period_end = ?')) sub.current_period_end = args[0]
            }
            return { meta: { changes: sub ? 1 : 0 } }
          }

          // INSERT INTO subscription_events
          // SQL has literal event_type: VALUES (?, 'created', ?) → args[0]=sub_id, args[1]=detail
          if (sql.includes('INSERT INTO subscription_events')) {
            state.events.push({ subscription_id: args[0], detail: args[1] })
            return { meta: { changes: 1 } }
          }

          // INSERT INTO audit_log
          if (sql.includes('INSERT INTO audit_log') || sql.includes('audit_log')) {
            return { meta: { changes: 1 } }
          }

          return { meta: { changes: 0 } }
        },

        first: async () => {
          if (sql.includes('FROM users WHERE id = ?')) return state.user
          if (sql.includes('FROM subscriptions WHERE paystack_subscription_code = ?')) {
            return state.subscriptions.find((s) => s.paystack_subscription_code === args[0]) || null
          }
          if (sql.includes('FROM subscriptions') && sql.includes('user_id')) {
            return state.subscriptions.find((s) => s.user_id === args[0] && ['active', 'past_due'].includes(s.status)) || null
          }
          if (sql.includes('FROM memorial_premium') && sql.includes('memorial_id = ?') && sql.includes("status = 'succeeded'")) {
            // resolveMemorialEntitlement query — return active row if present
            const nowMs = Date.now()
            return state.premium.find((p) =>
              p.memorial_id === args[0] &&
              p.status === 'succeeded' &&
              (p.expires_at == null || Number(p.expires_at) > nowMs)
            ) || null
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
    PAYSTACK_PLAN_MEMORIAL_PREMIUM_ANNUAL: 'PLN_prem_annual_test',
    PAYSTACK_PLAN_MEMORIAL_HERITAGE_ANNUAL: 'PLN_heri_annual_test',
    CORS_ORIGIN: 'https://funeralpress.org',
    DB: makeMockDb(opts),
    RATE_LIMITS: { get: async () => null, put: async () => undefined },
    OTP_KV: { get: async () => null, put: async () => undefined },
    MEMORIAL_PAGES_KV: { get: async () => null, put: async () => undefined },
  }
}

afterEach(() => { vi.restoreAllMocks() })

// ─── POST /memorial-premium/:id/subscribe ────────────────────────────────────

describe('POST /memorial-premium/:id/subscribe — handleMemorialSubscriptionCreate', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/memorial_annual_123',
          access_code: 'ac_memorial',
          reference: 'ref_memorial_annual',
        },
      }),
    })
  })

  it('authed + valid tier premium → calls Paystack initialize with premium plan code + metadata, returns authorization_url', async () => {
    const env = makeEnv({ user: { id: USER_ID, email: 'buyer@example.com' } })
    const jwt = await makeJwt()
    const res = await worker.fetch(
      await authedPost(`/memorial-premium/${MEMORIAL_ID}/subscribe`, { tier: 'premium' }, jwt),
      env
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.authorization_url).toBe('https://checkout.paystack.com/memorial_annual_123')

    // Check Paystack was called with the right plan code and metadata
    const [, fetchOpts] = globalThis.fetch.mock.calls[0]
    const sentBody = JSON.parse(fetchOpts.body)
    expect(sentBody.plan).toBe('PLN_prem_annual_test')
    expect(sentBody.metadata.kind).toBe('memorial_annual')
    expect(sentBody.metadata.memorialId).toBe(MEMORIAL_ID)
    expect(sentBody.metadata.tier).toBe('premium')
    expect(sentBody.metadata.userId).toBe(USER_ID)
    expect(sentBody.callback_url).toContain(MEMORIAL_ID)
  })

  it('authed + valid tier heritage → calls Paystack with heritage plan code', async () => {
    const env = makeEnv({ user: { id: USER_ID, email: 'buyer@example.com' } })
    const jwt = await makeJwt()
    const res = await worker.fetch(
      await authedPost(`/memorial-premium/${MEMORIAL_ID}/subscribe`, { tier: 'heritage' }, jwt),
      env
    )
    expect(res.status).toBe(200)
    const [, fetchOpts] = globalThis.fetch.mock.calls[0]
    const sentBody = JSON.parse(fetchOpts.body)
    expect(sentBody.plan).toBe('PLN_heri_annual_test')
    expect(sentBody.metadata.tier).toBe('heritage')
  })

  it('invalid tier → 400', async () => {
    const env = makeEnv({ user: { id: USER_ID, email: 'buyer@example.com' } })
    const jwt = await makeJwt()
    const res = await worker.fetch(
      await authedPost(`/memorial-premium/${MEMORIAL_ID}/subscribe`, { tier: 'diamond' }, jwt),
      env
    )
    expect(res.status).toBe(400)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('missing tier → 400', async () => {
    const env = makeEnv({ user: { id: USER_ID, email: 'buyer@example.com' } })
    const jwt = await makeJwt()
    const res = await worker.fetch(
      await authedPost(`/memorial-premium/${MEMORIAL_ID}/subscribe`, {}, jwt),
      env
    )
    expect(res.status).toBe(400)
  })

  it('tier=free → 400 (free is not a purchasable annual tier)', async () => {
    const env = makeEnv({ user: { id: USER_ID, email: 'buyer@example.com' } })
    const jwt = await makeJwt()
    const res = await worker.fetch(
      await authedPost(`/memorial-premium/${MEMORIAL_ID}/subscribe`, { tier: 'free' }, jwt),
      env
    )
    expect(res.status).toBe(400)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('unauthenticated → 401', async () => {
    const env = makeEnv({ user: { id: USER_ID, email: 'buyer@example.com' } })
    const res = await worker.fetch(
      new Request(`${BASE}/memorial-premium/${MEMORIAL_ID}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' },
        body: JSON.stringify({ tier: 'premium' }),
      }),
      env
    )
    expect(res.status).toBe(401)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})

// ─── Webhook: memorial annual subscription.create ────────────────────────────

describe('POST /subscriptions/webhook — memorial_annual subscription.create', () => {
  it('inserts a subscriptions row (memorial_id, memorial_tier) AND a memorial_premium row (plan_type=annual, tier, expires_at, status=succeeded, amount from catalog)', async () => {
    const env = makeEnv()
    const nextPaymentDate = new Date(Date.now() + 365 * 86400000).toISOString()
    const event = {
      event: 'subscription.create',
      data: {
        subscription_code: 'SUB_ann_001',
        plan: { plan_code: 'PLN_prem_annual_test' },
        customer: { customer_code: 'CUS_001' },
        email_token: 'tok_001',
        next_payment_date: nextPaymentDate,
        reference: 'ref_create_001',
        metadata: {
          kind: 'memorial_annual',
          memorialId: MEMORIAL_ID,
          tier: 'premium',
          userId: USER_ID,
        },
      },
    }

    const req = await webhookReq(event)
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(200)

    // subscriptions row - memorial INSERT binds: subId[0], buyerUserId[1], subCode[2], ..., memorialId[7], tier[8]
    const subInsert = env.DB._state.inserts.find((i) => i.type === 'subscription')
    expect(subInsert).toBeDefined()
    expect(subInsert.args[7]).toBe(MEMORIAL_ID)   // memorial_id
    expect(subInsert.args[8]).toBe('premium')      // memorial_tier

    // memorial_premium row
    const premInsert = env.DB._state.inserts.find((i) => i.type === 'memorial_premium')
    expect(premInsert).toBeDefined()
    const premRow = env.DB._state.premium[0]
    expect(premRow.plan_type).toBe('annual')
    expect(premRow.tier).toBe('premium')
    expect(premRow.status).toBe('succeeded')
    expect(premRow.amount_pesewas).toBe(12000)   // TIERS.premium.annualPesewas
    expect(premRow.paystack_subscription_code).toBe('SUB_ann_001')
    // expires_at should be the period end in milliseconds
    const expectedExpiresAt = new Date(nextPaymentDate).getTime()
    expect(premRow.expires_at).toBe(expectedExpiresAt)
  })

  it('heritage subscription.create → amount_pesewas=28000 (catalog), tier=heritage', async () => {
    const env = makeEnv()
    const nextPaymentDate = new Date(Date.now() + 365 * 86400000).toISOString()
    const event = {
      event: 'subscription.create',
      data: {
        subscription_code: 'SUB_heri_001',
        plan: { plan_code: 'PLN_heri_annual_test' },
        customer: { customer_code: 'CUS_heri' },
        email_token: 'tok_heri',
        next_payment_date: nextPaymentDate,
        reference: 'ref_heri_001',
        metadata: {
          kind: 'memorial_annual',
          memorialId: MEMORIAL_ID,
          tier: 'heritage',
          userId: USER_ID,
        },
      },
    }

    const req = await webhookReq(event)
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(200)

    const premRow = env.DB._state.premium[0]
    expect(premRow.tier).toBe('heritage')
    expect(premRow.amount_pesewas).toBe(28000)   // TIERS.heritage.annualPesewas
  })
})

// ─── Webhook: memorial annual charge.success (renewal) ───────────────────────
//
// Real-world renewal events do NOT carry metadata — Paystack only echoes
// metadata on the initial subscription.create / first charge.success pair.
// Auto-generated renewal charge.success events have no metadata.kind, so
// isMemorialAnnual is false and they fall through to the account charge.success
// branch which identifies the memorial sub via the stored subscriptions row
// (plan = 'memorial_annual') and extends memorial_premium.expires_at via
// paystack_subscription_code.

describe('POST /subscriptions/webhook — memorial_annual charge.success (renewal)', () => {
  it('realistic renewal (NO metadata): routes via account charge.success branch, extends memorial_premium.expires_at via subscription_code lookup, clears dunning', async () => {
    const originalExpiry = Date.now() + 5 * 86400000  // 5 days from now — about to lapse
    const env = makeEnv({
      premium: [{
        id: 'mp-01',
        memorial_id: MEMORIAL_ID,
        plan_type: 'annual',
        tier: 'premium',
        paystack_subscription_code: 'SUB_ren_001',
        status: 'succeeded',
        expires_at: originalExpiry,
        amount_pesewas: 12000,
      }],
      subscriptions: [{
        id: 'sub-ren-01',
        user_id: USER_ID,
        plan: 'memorial_annual',       // identifies this as a memorial sub
        status: 'active',
        paystack_subscription_code: 'SUB_ren_001',
        dunning_stage: 1,
        last_dunning_sent_at: new Date().toISOString(),
        memorial_id: MEMORIAL_ID,
        memorial_tier: 'premium',
      }],
    })

    const newPeriodEnd = new Date(Date.now() + 365 * 86400000).toISOString()
    // Realistic renewal event — NO metadata field at all
    const event = {
      event: 'charge.success',
      data: {
        subscription_code: 'SUB_ren_001',
        plan: { plan_code: 'PLN_prem_annual_test' },
        next_payment_date: newPeriodEnd,
        reference: 'ref_renewal_001',
        // metadata intentionally absent — Paystack does not echo it for renewals
      },
    }

    const req = await webhookReq(event)
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(200)

    // memorial_premium.expires_at must be extended to the new period end
    const premRow = env.DB._state.premium[0]
    const expectedExpiresAt = new Date(newPeriodEnd).getTime()
    expect(premRow.expires_at).toBe(expectedExpiresAt)
    expect(premRow.expires_at).toBeGreaterThan(originalExpiry)

    // The UPDATE used paystack_subscription_code, not memorial_id
    const mpUpdate = env.DB._state.updates.find(
      (u) => u.type === 'memorial_premium_update'
    )
    expect(mpUpdate).toBeDefined()
    expect(mpUpdate.args[1]).toBe('SUB_ren_001')   // keyed on subscription code

    // subscriptions row dunning must be cleared
    const subUpdateCall = env.DB._state.updates.find(
      (u) => u.type === 'subscription_update' && u.sql.includes('dunning_stage = 0')
    )
    expect(subUpdateCall).toBeDefined()
  })
})

// ─── Webhook: memorial annual disable/not_renew ───────────────────────────────

describe('POST /subscriptions/webhook — memorial_annual subscription.disable / not_renew', () => {
  it('subscription.disable → marks subscriptions row cancelled but does NOT delete or modify memorial_premium row', async () => {
    const expiresAt = Date.now() + 30 * 86400000
    const env = makeEnv({
      premium: [{
        id: 'mp-dis',
        memorial_id: MEMORIAL_ID,
        plan_type: 'annual',
        tier: 'premium',
        paystack_subscription_code: 'SUB_dis_001',
        status: 'succeeded',
        expires_at: expiresAt,
        amount_pesewas: 12000,
      }],
      subscriptions: [{
        id: 'sub-dis-01',
        user_id: USER_ID,
        plan: 'memorial_annual',
        status: 'active',
        paystack_subscription_code: 'SUB_dis_001',
        memorial_id: MEMORIAL_ID,
        memorial_tier: 'premium',
      }],
    })

    const event = {
      event: 'subscription.disable',
      data: {
        subscription_code: 'SUB_dis_001',
        metadata: {
          kind: 'memorial_annual',
          memorialId: MEMORIAL_ID,
          tier: 'premium',
          userId: USER_ID,
        },
      },
    }

    const req = await webhookReq(event)
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(200)

    // memorial_premium row must NOT be deleted
    expect(env.DB._state.premium).toHaveLength(1)
    // memorial_premium row must NOT have its status changed
    expect(env.DB._state.premium[0].status).toBe('succeeded')
    // expires_at unchanged
    expect(env.DB._state.premium[0].expires_at).toBe(expiresAt)

    // subscriptions row should be marked cancelled
    const subUpdateCall = env.DB._state.updates.find(
      (u) => u.type === 'subscription_update' && u.sql.includes("'cancelled'")
    )
    expect(subUpdateCall).toBeDefined()
  })

  it('subscription.not_renew → same as disable: memorial_premium row preserved, page never deleted', async () => {
    const expiresAt = Date.now() + 30 * 86400000
    const env = makeEnv({
      premium: [{
        id: 'mp-nr',
        memorial_id: MEMORIAL_ID,
        plan_type: 'annual',
        tier: 'premium',
        paystack_subscription_code: 'SUB_nr_001',
        status: 'succeeded',
        expires_at: expiresAt,
        amount_pesewas: 12000,
      }],
      subscriptions: [{
        id: 'sub-nr-01',
        user_id: USER_ID,
        plan: 'memorial_annual',
        status: 'active',
        paystack_subscription_code: 'SUB_nr_001',
        memorial_id: MEMORIAL_ID,
        memorial_tier: 'premium',
      }],
    })

    const event = {
      event: 'subscription.not_renew',
      data: {
        subscription_code: 'SUB_nr_001',
        metadata: {
          kind: 'memorial_annual',
          memorialId: MEMORIAL_ID,
          tier: 'premium',
          userId: USER_ID,
        },
      },
    }

    const req = await webhookReq(event)
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(200)

    expect(env.DB._state.premium).toHaveLength(1)
    expect(env.DB._state.premium[0].status).toBe('succeeded')
    expect(env.DB._state.premium[0].expires_at).toBe(expiresAt)
  })

  it('after disable, resolveMemorialEntitlement would revert to free once expires_at passes', () => {
    // Simulate what happens post-expiry: a row with expires_at in the past
    // should not grant the premium tier. We test the logic inline (the
    // resolver itself is tested in memorialEntitlement.test.js).
    const expiresAt = Date.now() - 86400000  // already expired
    const row = { tier: 'premium', plan_type: 'annual', expires_at: expiresAt, status: 'succeeded' }
    const active = row.expires_at == null || row.expires_at > Date.now()
    expect(active).toBe(false)
  })
})

// ─── Regression: account pro_monthly webhook event still works ────────────────

describe('POST /subscriptions/webhook — account pro_monthly regression smoke test', () => {
  it('subscription.create for pro_monthly (no memorial metadata) still inserts an account subscriptions row', async () => {
    const env = makeEnv({
      user: { id: USER_ID, email: 'acct@example.com' },
    })

    const event = {
      event: 'subscription.create',
      data: {
        subscription_code: 'SUB_acct_001',
        plan: { plan_code: 'PLN_test_monthly' },
        customer: { customer_code: 'CUS_acct' },
        email_token: 'tok_acct',
        next_payment_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        reference: 'ref_acct_001',
        metadata: {
          userId: USER_ID,
          plan: 'pro_monthly',
          // NO kind: 'memorial_annual'
        },
      },
    }

    const req = await webhookReq(event)
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(200)

    // A subscription row should have been inserted
    const subInsert = env.DB._state.inserts.find((i) => i.type === 'subscription')
    expect(subInsert).toBeDefined()
    // No memorial_premium row should have been created
    expect(env.DB._state.premium).toHaveLength(0)
    // monthly_credits_remaining should be 15 (account sub)
    const subRow = env.DB._state.subscriptions.find((s) => s.paystack_subscription_code === 'SUB_acct_001')
    expect(subRow).toBeDefined()
    expect(subRow.monthly_credits_remaining).toBe(15)
  })

  it('charge.success for pro_monthly renewal (no memorial metadata, plan=pro_monthly) does NOT touch memorial_premium', async () => {
    const env = makeEnv({
      user: { id: USER_ID, email: 'acct@example.com' },
      subscriptions: [{
        id: 'sub-pm-01',
        user_id: USER_ID,
        plan: 'pro_monthly',
        status: 'active',
        paystack_subscription_code: 'SUB_pm_001',
        dunning_stage: 0,
        memorial_id: null,
        memorial_tier: null,
        monthly_credits_remaining: 0,
      }],
      premium: [],
    })

    const newPeriodEnd = new Date(Date.now() + 30 * 86400000).toISOString()
    const event = {
      event: 'charge.success',
      data: {
        subscription_code: 'SUB_pm_001',
        plan: { plan_code: 'PLN_test_monthly' },
        next_payment_date: newPeriodEnd,
        reference: 'ref_pm_ren_001',
        // no metadata
      },
    }

    const req = await webhookReq(event)
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(200)

    // No memorial_premium rows should have been touched
    expect(env.DB._state.premium).toHaveLength(0)
    const mpUpdate = env.DB._state.updates.find((u) => u.type === 'memorial_premium_update')
    expect(mpUpdate).toBeUndefined()

    // But the subscription should have been updated (credits reset)
    const subUpdateCall = env.DB._state.updates.find(
      (u) => u.type === 'subscription_update' && u.sql.includes('monthly_credits_remaining = 15')
    )
    expect(subUpdateCall).toBeDefined()
  })
})

// ─── runDunningCron: memorial renewal reminders ───────────────────────────────

// Minimal dunning DB mock for the memorial reminder sweep only.
function makeDunningDb({ memorialRows = [], pastDueSubs = [] } = {}) {
  const state = {
    memorialRows: memorialRows.map((r) => ({ ...r })),
    pastDueSubs: pastDueSubs.map((s) => ({ ...s })),
    subUpdates: [],
    eventInserts: [],
  }

  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.includes('UPDATE subscriptions') && sql.includes('last_dunning_sent_at')) {
            state.subUpdates.push({ sql, args })
            return { meta: { changes: 1 } }
          }
          if (sql.includes('INSERT INTO subscription_events')) {
            state.eventInserts.push({ sql, args })
            return { meta: { changes: 1 } }
          }
          return { meta: { changes: 0 } }
        },
        first: async () => null,
        all: async () => {
          // past_due account/memorial subscriptions (dunning sweep)
          if (sql.includes('FROM subscriptions') && sql.includes("status = 'past_due'")) {
            return {
              results: state.pastDueSubs
                .filter((s) => s.status === 'past_due' && (s.dunning_stage || 0) < 3)
                .map((s) => ({
                  id: s.id,
                  user_id: s.user_id,
                  plan: s.plan,
                  status: s.status,
                  dunning_stage: s.dunning_stage || 0,
                  last_dunning_sent_at: s.last_dunning_sent_at || null,
                  paystack_subscription_code: s.paystack_subscription_code || null,
                  user_email: s.user_email,
                  user_name: s.user_name,
                })),
            }
          }
          // memorial_premium expiring-soon query
          if (sql.includes('FROM memorial_premium') && sql.includes("plan_type = 'annual'")) {
            return { results: state.memorialRows }
          }
          return { results: [] }
        },
      }),
    }),
  }
}

function makeDunningEnv({ memorialRows = [], pastDueSubs = [], resendKey = 'rs_test' } = {}) {
  return {
    RESEND_API_KEY: resendKey,
    PAYSTACK_SECRET_KEY: 'sk_test_fake',
    DB: makeDunningDb({ memorialRows, pastDueSubs }),
  }
}

describe('runDunningCron — memorial annual renewal reminders', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ data: { link: null } }) })
  })

  it('sends a T-14 reminder email when expires_at is 10 days away and no recent reminder sent', async () => {
    const expiresAt = Date.now() + 10 * 86400000  // 10 days → within T-14 window
    const env = makeDunningEnv({
      memorialRows: [{
        memorial_id: 'mem-1',
        expires_at: expiresAt,
        paystack_subscription_code: 'SUB_r_001',
        deceased_name: 'Grandma Rose',
        sub_id: 'sub-r-01',
        last_reminder_sent: null,
        user_email: 'family@example.com',
        user_name: 'Family User',
      }],
    })

    const result = await runDunningCron(env)
    expect(result.memorialReminders).toBe(1)
    // Resend was called
    const resendCall = globalThis.fetch.mock.calls.find(
      ([url]) => typeof url === 'string' && url.includes('resend.com')
    )
    expect(resendCall).toBeDefined()
    const sentBody = JSON.parse(resendCall[1].body)
    expect(sentBody.subject).toContain('Grandma Rose')
    expect(sentBody.to).toEqual(['family@example.com'])
  })

  it('sends a T-3 reminder when expires_at is 2 days away', async () => {
    const expiresAt = Date.now() + 2 * 86400000  // 2 days → within T-3 window
    const env = makeDunningEnv({
      memorialRows: [{
        memorial_id: 'mem-2',
        expires_at: expiresAt,
        paystack_subscription_code: 'SUB_r_002',
        deceased_name: 'Grandpa Joe',
        sub_id: 'sub-r-02',
        last_reminder_sent: null,
        user_email: 'son@example.com',
        user_name: 'The Son',
      }],
    })

    const result = await runDunningCron(env)
    expect(result.memorialReminders).toBe(1)
    const resendCall = globalThis.fetch.mock.calls.find(
      ([url]) => typeof url === 'string' && url.includes('resend.com')
    )
    expect(resendCall).toBeDefined()
    const sentBody = JSON.parse(resendCall[1].body)
    // T-3 template has "3 days left" in the subject
    expect(sentBody.subject).toMatch(/3 days/i)
  })

  it('does NOT send when a reminder was already sent within 5 days', async () => {
    const expiresAt = Date.now() + 10 * 86400000
    const recentlySent = new Date(Date.now() - 2 * 86400000).toISOString()  // 2 days ago
    const env = makeDunningEnv({
      memorialRows: [{
        memorial_id: 'mem-3',
        expires_at: expiresAt,
        paystack_subscription_code: 'SUB_r_003',
        deceased_name: 'Someone',
        sub_id: 'sub-r-03',
        last_reminder_sent: recentlySent,
        user_email: 'email@example.com',
        user_name: 'Person',
      }],
    })

    const result = await runDunningCron(env)
    expect(result.memorialReminders).toBe(0)
    const resendCalls = globalThis.fetch.mock.calls.filter(
      ([url]) => typeof url === 'string' && url.includes('resend.com')
    )
    expect(resendCalls).toHaveLength(0)
  })

  it('does NOT send when memorial row has no user_email', async () => {
    const expiresAt = Date.now() + 10 * 86400000
    const env = makeDunningEnv({
      memorialRows: [{
        memorial_id: 'mem-4',
        expires_at: expiresAt,
        paystack_subscription_code: 'SUB_r_004',
        deceased_name: 'Ghost',
        sub_id: 'sub-r-04',
        last_reminder_sent: null,
        user_email: null,   // no email
        user_name: null,
      }],
    })

    const result = await runDunningCron(env)
    expect(result.memorialReminders).toBe(0)
  })

  it('framing: email body does NOT say "delete" — only premium features lapse', async () => {
    const expiresAt = Date.now() + 10 * 86400000
    const env = makeDunningEnv({
      memorialRows: [{
        memorial_id: 'mem-5',
        expires_at: expiresAt,
        paystack_subscription_code: 'SUB_r_005',
        deceased_name: 'Beloved',
        sub_id: 'sub-r-05',
        last_reminder_sent: null,
        user_email: 'care@example.com',
        user_name: 'Caregiver',
      }],
    })

    await runDunningCron(env)
    const resendCall = globalThis.fetch.mock.calls.find(
      ([url]) => typeof url === 'string' && url.includes('resend.com')
    )
    expect(resendCall).toBeDefined()
    const sentBody = JSON.parse(resendCall[1].body)
    // Must never threaten deletion
    expect(sentBody.text.toLowerCase()).not.toContain('delete')
    expect(sentBody.html.toLowerCase()).not.toContain('delete')
    // Must mention the page is preserved
    expect(sentBody.text.toLowerCase()).toContain('preserved')
  })
})
