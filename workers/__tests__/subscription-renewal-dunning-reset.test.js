import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from '../auth-api.js'

const SECRET = 'whsec_fake'
const PAYSTACK_IP = '52.31.139.75'
const SUB_CODE = 'SUB_renewal_xyz'

async function hmacSha512Hex(secret, body) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function makeMockDb({ subId = 'sub-1' } = {}) {
  const updates = []
  const inserts = []
  return {
    _updates: updates,
    _inserts: inserts,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.includes('UPDATE subscriptions')) {
            updates.push({ sql, args })
            return { meta: { changes: 1 } }
          }
          if (sql.includes('INSERT INTO subscription_events') || sql.includes('INSERT INTO audit_log')) {
            inserts.push({ sql, args })
            return { meta: { changes: 1 } }
          }
          return { meta: { changes: 0 } }
        },
        first: async () => {
          if (sql.includes('SELECT id FROM subscriptions WHERE paystack_subscription_code')) {
            return { id: subId }
          }
          return null
        },
        all: async () => ({ results: [] }),
      }),
    }),
  }
}

function makeEnv({ subId = 'sub-1' } = {}) {
  return {
    JWT_SECRET: 'test-jwt-secret',
    PAYSTACK_SECRET_KEY: SECRET,
    PAYSTACK_PLAN_MONTHLY: 'PLN_M',
    PAYSTACK_PLAN_ANNUAL: 'PLN_A',
    OTP_PEPPER: 'test-pepper',
    DB: makeMockDb({ subId }),
    MEMORIAL_PAGES_KV: { get: async () => null, put: async () => undefined },
    RATE_LIMITS: { get: async () => null, put: async () => undefined },
    OTP_KV: { get: async () => null, put: async () => undefined },
  }
}

async function webhookReq(event) {
  const body = JSON.stringify(event)
  const signature = await hmacSha512Hex(SECRET, body)
  return new Request('https://example.com/subscriptions/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': PAYSTACK_IP,
      'x-paystack-signature': signature,
    },
    body,
  })
}

function chargeSuccessRenewal() {
  return {
    event: 'charge.success',
    id: 'evt_renewal_001',
    data: {
      reference: 'ref_renewal_001',
      subscription_code: SUB_CODE,
      plan: { plan_code: 'PLN_M' },
      next_payment_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    },
  }
}

describe('subscription.create renewal — dunning state reset', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('resets dunning_stage and last_dunning_sent_at on charge.success renewal', async () => {
    const env = makeEnv({ subId: 'sub-1' })
    const res = await worker.fetch(await webhookReq(chargeSuccessRenewal()), env)
    expect(res.status).toBe(200)

    const renewalUpdate = env.DB._updates.find((u) =>
      u.sql.includes('monthly_credits_remaining = 15') && u.sql.includes("status = 'active'")
    )
    expect(renewalUpdate, 'expected the renewal UPDATE to fire').toBeTruthy()
    expect(renewalUpdate.sql).toMatch(/dunning_stage\s*=\s*0/)
    expect(renewalUpdate.sql).toMatch(/last_dunning_sent_at\s*=\s*NULL/)
  })

  it('still records the renewed event in subscription_events', async () => {
    const env = makeEnv({ subId: 'sub-1' })
    await worker.fetch(await webhookReq(chargeSuccessRenewal()), env)
    const renewedEvent = env.DB._inserts.find((i) => i.sql.includes("'renewed'"))
    expect(renewedEvent).toBeTruthy()
  })
})
