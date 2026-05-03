import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker, { queueDonationReceipt } from '../donation-api.js'
import { PAYSTACK_WEBHOOK_IPS } from '../utils/paystack.js'

const SECRET = 'whsec_fake'
const ALLOWED_IP = PAYSTACK_WEBHOOK_IPS[0]
const MEMORIAL_ID = 'mem_abc'
const DONATION_ID = 'don_xyz'
const REFERENCE = `FP_${DONATION_ID}`

async function hmacSha512Hex(secret, body) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function makeMockDb({ donation = null, memorial = null }) {
  const state = {
    donation: donation ? { ...donation } : null,
    memorial: memorial ? { ...memorial } : null,
    processed: new Set(),
    inserts: [],
    updates: [],
    adminAlerts: [],
    auditRows: [],
  }
  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.includes('INSERT INTO processed_webhooks')) { state.processed.add(args[0]); return { meta: { changes: 1 } } }
          if (sql.includes('UPDATE donations')) {
            state.updates.push({ sql, args })
            if (state.donation) {
              if (sql.includes("status = 'refunded'")) { state.donation.status = 'refunded'; state.donation.refunded_at = args[0] }
              else if (sql.includes("status = 'disputed'")) { state.donation.status = 'disputed' }
              else if (sql.includes('receipt_sent_at')) { state.donation.receipt_sent_at = args[0] }
            }
            return { meta: { changes: 1 } }
          }
          if (sql.includes('UPDATE memorials')) {
            state.updates.push({ sql, args })
            if (state.memorial) {
              state.memorial.total_raised_pesewas = (state.memorial.total_raised_pesewas || 0) - args[0]
              state.memorial.total_donor_count = (state.memorial.total_donor_count || 0) - 1
            }
            return { meta: { changes: 1 } }
          }
          if (sql.includes('INSERT INTO admin_notifications')) { state.adminAlerts.push({ args }); return { meta: { changes: 1 } } }
          if (sql.includes('INSERT INTO donation_audit')) { state.auditRows.push({ args }); return { meta: { changes: 1 } } }
          return { meta: { changes: 0 } }
        },
        first: async () => {
          if (sql.includes('FROM processed_webhooks')) return state.processed.has(args[0]) ? { event_id: args[0] } : null
          if (sql.includes('FROM donations')) {
            // refund/dispute query: WHERE paystack_reference = ?
            // queueDonationReceipt query: JOIN memorials with WHERE d.id = ?
            if (!state.donation) return null
            if (sql.includes('JOIN memorials')) {
              if (state.donation.id !== args[0]) return null
              return {
                ...state.donation,
                memorial_id: MEMORIAL_ID,
                slug: 'akua-mensah',
              }
            }
            return state.donation.paystack_reference === args[0] ? state.donation : null
          }
          return null
        },
        all: async () => ({ results: [] }),
      }),
    }),
  }
}

function makeEnv({ donation = null, memorial = null, kvSeed = null, envOverrides = {} } = {}) {
  const kv = new Map()
  if (kvSeed) kv.set(MEMORIAL_ID, JSON.stringify(kvSeed))
  return {
    DONATIONS_ENABLED: 'true',
    DONATIONS_GLOBAL_PAUSED: 'false',
    INTERNATIONAL_DONATIONS_ENABLED: 'true',
    JWT_SECRET: 'test-jwt-secret',
    PAYSTACK_SECRET_KEY: 'sk_test_fake',
    PAYSTACK_WEBHOOK_SECRET: SECRET,
    OTP_PEPPER: 'test-pepper',
    DB: makeMockDb({ donation, memorial }),
    MEMORIAL_PAGES_KV: {
      get: async (k) => kv.get(k) || null,
      put: async (k, v) => kv.set(k, v),
      delete: async (k) => kv.delete(k),
    },
    RATE_LIMITS: { get: async () => null, put: async () => undefined },
    OTP_KV: { get: async () => null, put: async () => undefined },
    _kv: kv,
    ...envOverrides,
  }
}

const ctx = { waitUntil: () => {} }

async function webhookReq(eventBody) {
  const body = JSON.stringify(eventBody)
  const sig = await hmacSha512Hex(SECRET, body)
  return new Request('https://example.com/paystack/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': ALLOWED_IP,
      'x-paystack-signature': sig,
    },
    body,
  })
}

function refundEvent(refOverride) {
  return {
    event: 'refund.processed',
    id: 'evt_refund_001',
    data: {
      transaction: { reference: refOverride || REFERENCE },
    },
  }
}

function disputeEvent() {
  return {
    event: 'charge.dispute.create',
    id: 'evt_dispute_001',
    data: { transaction: { reference: REFERENCE } },
  }
}

function succeededDonation(overrides = {}) {
  return {
    id: DONATION_ID,
    memorial_id: MEMORIAL_ID,
    paystack_reference: REFERENCE,
    amount_pesewas: 5000,
    status: 'succeeded',
    ...overrides,
  }
}

describe('POST /paystack/webhook — refund.processed', () => {
  it('decrements memorial totals and marks donation refunded for a previously-succeeded donation', async () => {
    const env = makeEnv({
      donation: succeededDonation(),
      memorial: { id: MEMORIAL_ID, total_raised_pesewas: 12000, total_donor_count: 3 },
      kvSeed: { donation: { total_raised_pesewas: 12000, total_donor_count: 3, enabled: true } },
    })
    const req = await webhookReq(refundEvent())
    const res = await worker.fetch(req, env, ctx)
    expect(res.status).toBe(200)
    expect(env.DB._state.donation.status).toBe('refunded')
    expect(env.DB._state.memorial.total_raised_pesewas).toBe(7000)
    expect(env.DB._state.memorial.total_donor_count).toBe(2)
    // KV write-through
    const kv = JSON.parse(env._kv.get(MEMORIAL_ID))
    expect(kv.donation.total_raised_pesewas).toBe(7000)
    expect(kv.donation.total_donor_count).toBe(2)
    // Audit + admin
    expect(env.DB._state.auditRows.length).toBe(1)
    expect(env.DB._state.adminAlerts.some(a => a.args[0] === 'donation.refunded')).toBe(true)
  })

  it('marks pending donation refunded WITHOUT decrementing totals', async () => {
    const env = makeEnv({
      donation: succeededDonation({ status: 'pending' }),
      memorial: { id: MEMORIAL_ID, total_raised_pesewas: 12000, total_donor_count: 3 },
    })
    const req = await webhookReq(refundEvent())
    await worker.fetch(req, env, ctx)
    expect(env.DB._state.donation.status).toBe('refunded')
    // Not decremented
    expect(env.DB._state.memorial.total_raised_pesewas).toBe(12000)
    expect(env.DB._state.memorial.total_donor_count).toBe(3)
  })

  it('returns 200 silently when donation reference is unknown', async () => {
    const env = makeEnv({ donation: null })
    const req = await webhookReq(refundEvent('FP_unknown'))
    const res = await worker.fetch(req, env, ctx)
    expect(res.status).toBe(200)
  })

  it('clamps KV writethrough at 0 (no negative totals)', async () => {
    const env = makeEnv({
      donation: succeededDonation({ amount_pesewas: 99999 }),
      memorial: { id: MEMORIAL_ID, total_raised_pesewas: 1000, total_donor_count: 0 },
      kvSeed: { donation: { total_raised_pesewas: 1000, total_donor_count: 0 } },
    })
    const req = await webhookReq(refundEvent())
    await worker.fetch(req, env, ctx)
    const kv = JSON.parse(env._kv.get(MEMORIAL_ID))
    expect(kv.donation.total_raised_pesewas).toBe(0)
    expect(kv.donation.total_donor_count).toBe(0)
  })
})

describe('POST /paystack/webhook — charge.dispute.create', () => {
  it('marks succeeded donation as disputed and writes admin alert', async () => {
    const env = makeEnv({ donation: succeededDonation() })
    const req = await webhookReq(disputeEvent())
    const res = await worker.fetch(req, env, ctx)
    expect(res.status).toBe(200)
    expect(env.DB._state.donation.status).toBe('disputed')
    expect(env.DB._state.adminAlerts.some(a => a.args[0] === 'donation.disputed')).toBe(true)
  })
})

describe('queueDonationReceipt', () => {
  beforeEach(() => { global.fetch = vi.fn() })

  it('sends Resend email and marks receipt_sent_at when donor_email present', async () => {
    const env = makeEnv({
      donation: {
        id: DONATION_ID,
        donor_email: 'donor@example.com',
        donor_display_name: 'Akua',
        display_amount_minor: 5000,
        display_currency: 'GHS',
        amount_pesewas: 5000,
        tip_pesewas: 250,
        created_at: 1700000000000,
        paystack_reference: REFERENCE,
      },
      kvSeed: { deceased_name: 'Kofi Mensah' },
      envOverrides: { RESEND_API_KEY: 'resend-fake' },
    })
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'em_1' }) })
    await queueDonationReceipt(env, DONATION_ID)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ method: 'POST' })
    )
    // Resend body contains deceased name + reference + tip
    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(callBody.to).toBe('donor@example.com')
    expect(callBody.subject).toContain('Kofi Mensah')
    expect(callBody.html).toContain(REFERENCE)
    expect(callBody.html).toContain('GHS')
    // receipt_sent_at marked
    expect(env.DB._state.donation.receipt_sent_at).toBeTruthy()
  })

  it('skips when donor_email is null', async () => {
    const env = makeEnv({
      donation: { id: DONATION_ID, donor_email: null, paystack_reference: REFERENCE, donor_display_name: 'X', amount_pesewas: 100, tip_pesewas: 0, display_amount_minor: 100, display_currency: 'GHS', created_at: 1 },
      envOverrides: { RESEND_API_KEY: 'resend-fake' },
    })
    global.fetch.mockResolvedValueOnce({ ok: true })
    await queueDonationReceipt(env, DONATION_ID)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('no-op when RESEND_API_KEY is unset', async () => {
    const env = makeEnv({
      donation: { id: DONATION_ID, donor_email: 'x@y.z', paystack_reference: REFERENCE },
    })
    global.fetch.mockResolvedValueOnce({ ok: true })
    await queueDonationReceipt(env, DONATION_ID)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
