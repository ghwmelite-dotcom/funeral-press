import { describe, it, expect } from 'vitest'
import worker from '../donation-api.js'
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

function makeMockDb({ donation = null, memorial = null, processedEvents = [] }) {
  const state = {
    donation: donation ? { ...donation } : null,
    memorial: memorial ? { ...memorial } : null,
    processed: new Set(processedEvents),
    inserts: [],
    updates: [],
    adminAlerts: [],
  }
  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.includes('INSERT INTO processed_webhooks')) {
            state.processed.add(args[0])
            state.inserts.push({ table: 'processed_webhooks', args })
            return { meta: { changes: 1 } }
          }
          if (sql.includes('UPDATE donations')) {
            state.updates.push({ sql, args })
            if (state.donation) {
              if (sql.includes("status = 'succeeded'")) {
                state.donation.status = 'succeeded'
                state.donation.succeeded_at = args[0]
                state.donation.paystack_fee_pesewas = args[1]
                state.donation.net_to_family_pesewas = args[2]
                state.donation.paystack_transaction_id = args[3]
              } else if (sql.includes("status = 'failed'")) {
                state.donation.status = 'failed'
                state.donation.failure_reason = args[0]
              }
            }
            return { meta: { changes: 1 } }
          }
          if (sql.includes('UPDATE memorials')) {
            state.updates.push({ sql, args })
            if (state.memorial) {
              state.memorial.total_raised_pesewas = (state.memorial.total_raised_pesewas || 0) + args[0]
              state.memorial.total_donor_count = (state.memorial.total_donor_count || 0) + 1
              state.memorial.last_donation_at = args[1]
            }
            return { meta: { changes: 1 } }
          }
          if (sql.includes('INSERT INTO admin_notifications')) {
            state.adminAlerts.push({ args })
            return { meta: { changes: 1 } }
          }
          return { meta: { changes: 0 } }
        },
        first: async () => {
          if (sql.includes('FROM processed_webhooks')) {
            return state.processed.has(args[0]) ? { event_id: args[0] } : null
          }
          if (sql.includes('FROM donations')) {
            return state.donation && state.donation.paystack_reference === args[0] ? state.donation : null
          }
          if (sql.includes('FROM memorials')) {
            return state.memorial
          }
          return null
        },
        all: async () => ({ results: [] }),
      }),
    }),
  }
}

function makeEnv({ donation = null, memorial = null, processedEvents = [], kvSeed = null } = {}) {
  const kvMap = new Map()
  if (kvSeed) kvMap.set(MEMORIAL_ID, JSON.stringify(kvSeed))
  return {
    DONATIONS_ENABLED: 'true',
    DONATIONS_GLOBAL_PAUSED: 'false',
    INTERNATIONAL_DONATIONS_ENABLED: 'true',
    JWT_SECRET: 'test-jwt-secret',
    PAYSTACK_SECRET_KEY: 'sk_test_fake',
    PAYSTACK_WEBHOOK_SECRET: SECRET,
    OTP_PEPPER: 'test-pepper',
    DB: makeMockDb({ donation, memorial, processedEvents }),
    MEMORIAL_PAGES_KV: {
      get: async (k) => kvMap.get(k) || null,
      put: async (k, v) => kvMap.set(k, v),
      delete: async (k) => kvMap.delete(k),
    },
    RATE_LIMITS: { get: async () => null, put: async () => undefined },
    OTP_KV: { get: async () => null, put: async () => undefined },
    _kv: kvMap,
  }
}

const ctx = { waitUntil: () => {} }

async function webhookReq({ event, ip = ALLOWED_IP, sig, omitSig = false, badSig = false }) {
  const body = JSON.stringify(event)
  let signature = sig
  if (!signature && !omitSig) signature = await hmacSha512Hex(SECRET, body)
  if (badSig) signature = 'a'.repeat(128)
  const headers = {
    'Content-Type': 'application/json',
    'CF-Connecting-IP': ip,
  }
  if (!omitSig) headers['x-paystack-signature'] = signature
  return new Request('https://example.com/paystack/webhook', { method: 'POST', headers, body })
}

function chargeSuccessEvent(overrides = {}) {
  return {
    event: 'charge.success',
    id: 'evt_001',
    data: {
      id: 999,
      reference: REFERENCE,
      amount: 5250,
      fees: 50,
      ...overrides,
    },
  }
}

function chargeFailedEvent() {
  return {
    event: 'charge.failed',
    id: 'evt_002',
    data: { reference: REFERENCE, gateway_response: 'card declined' },
  }
}

function pendingDonation(overrides = {}) {
  return {
    id: DONATION_ID,
    memorial_id: MEMORIAL_ID,
    paystack_reference: REFERENCE,
    amount_pesewas: 5000,
    status: 'pending',
    ...overrides,
  }
}

describe('POST /paystack/webhook', () => {
  it('rejects from non-allowlisted IP', async () => {
    const env = makeEnv()
    const req = await webhookReq({ event: chargeSuccessEvent(), ip: '8.8.8.8' })
    const res = await worker.fetch(req, env, ctx)
    expect(res.status).toBe(401)
  })

  it('rejects when signature header missing', async () => {
    const env = makeEnv()
    const req = await webhookReq({ event: chargeSuccessEvent(), omitSig: true })
    const res = await worker.fetch(req, env, ctx)
    expect(res.status).toBe(401)
  })

  it('rejects when signature is wrong', async () => {
    const env = makeEnv()
    const req = await webhookReq({ event: chargeSuccessEvent(), badSig: true })
    const res = await worker.fetch(req, env, ctx)
    expect(res.status).toBe(401)
  })

  it('rejects malformed JSON body', async () => {
    const env = makeEnv()
    const body = '{not json'
    const sig = await hmacSha512Hex(SECRET, body)
    const req = new Request('https://example.com/paystack/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': ALLOWED_IP,
        'x-paystack-signature': sig,
      },
      body,
    })
    const res = await worker.fetch(req, env, ctx)
    expect(res.status).toBe(400)
  })

  it('processes charge.success: marks donation succeeded and updates memorial totals', async () => {
    const env = makeEnv({
      donation: pendingDonation(),
      memorial: { id: MEMORIAL_ID, total_raised_pesewas: 0, total_donor_count: 0, goal_amount_pesewas: null },
    })
    const req = await webhookReq({ event: chargeSuccessEvent() })
    const res = await worker.fetch(req, env, ctx)
    expect(res.status).toBe(200)
    expect(env.DB._state.donation.status).toBe('succeeded')
    expect(env.DB._state.donation.paystack_fee_pesewas).toBe(50)
    expect(env.DB._state.donation.net_to_family_pesewas).toBe(4950)
    expect(env.DB._state.memorial.total_raised_pesewas).toBe(5000)
    expect(env.DB._state.memorial.total_donor_count).toBe(1)
  })

  it('is idempotent on duplicate event_id', async () => {
    const env = makeEnv({
      donation: pendingDonation(),
      memorial: { id: MEMORIAL_ID, total_raised_pesewas: 0, total_donor_count: 0 },
      processedEvents: ['evt_001'],
    })
    const req = await webhookReq({ event: chargeSuccessEvent() })
    const res = await worker.fetch(req, env, ctx)
    expect(res.status).toBe(200)
    // No update happened
    expect(env.DB._state.donation.status).toBe('pending')
  })

  it('processes charge.failed: marks donation failed', async () => {
    const env = makeEnv({ donation: pendingDonation() })
    const req = await webhookReq({ event: chargeFailedEvent() })
    const res = await worker.fetch(req, env, ctx)
    expect(res.status).toBe(200)
    expect(env.DB._state.donation.status).toBe('failed')
    expect(env.DB._state.donation.failure_reason).toBe('card declined')
  })

  it('returns 200 silently when donation reference is unknown (not ours)', async () => {
    const env = makeEnv({ donation: null })
    const req = await webhookReq({ event: chargeSuccessEvent({ reference: 'FP_unknown' }) })
    const res = await worker.fetch(req, env, ctx)
    expect(res.status).toBe(200)
  })

  it('writes through to KV memorial cache', async () => {
    const env = makeEnv({
      donation: pendingDonation(),
      memorial: { id: MEMORIAL_ID, total_raised_pesewas: 0, total_donor_count: 0 },
      kvSeed: { slug: 'a', donation: { total_raised_pesewas: 0, total_donor_count: 0, enabled: true } },
    })
    const req = await webhookReq({ event: chargeSuccessEvent() })
    await worker.fetch(req, env, ctx)
    const kv = JSON.parse(env._kv.get(MEMORIAL_ID))
    expect(kv.donation.total_raised_pesewas).toBe(5000)
    expect(kv.donation.total_donor_count).toBe(1)
  })

  it('invalidates wall:totals KV cache after success', async () => {
    const env = makeEnv({
      donation: pendingDonation(),
      memorial: { id: MEMORIAL_ID, total_raised_pesewas: 0, total_donor_count: 0 },
    })
    env._kv.set(`wall:totals:${MEMORIAL_ID}`, JSON.stringify({ stale: true }))
    const req = await webhookReq({ event: chargeSuccessEvent() })
    await worker.fetch(req, env, ctx)
    expect(env._kv.has(`wall:totals:${MEMORIAL_ID}`)).toBe(false)
  })

  it('triggers admin alert when memorial crosses goal threshold', async () => {
    const env = makeEnv({
      donation: pendingDonation({ amount_pesewas: 5000 }),
      memorial: { id: MEMORIAL_ID, total_raised_pesewas: 4000, total_donor_count: 0, goal_amount_pesewas: 8000 },
    })
    const req = await webhookReq({ event: chargeSuccessEvent({ amount: 5250 }) })
    await worker.fetch(req, env, ctx)
    expect(env.DB._state.adminAlerts.length).toBe(1)
    expect(env.DB._state.adminAlerts[0].args[0]).toBe('donation.goal_crossed')
  })

  it('does not trigger admin alert when goal not crossed', async () => {
    const env = makeEnv({
      donation: pendingDonation({ amount_pesewas: 5000 }),
      memorial: { id: MEMORIAL_ID, total_raised_pesewas: 0, total_donor_count: 0, goal_amount_pesewas: 100000 },
    })
    const req = await webhookReq({ event: chargeSuccessEvent() })
    await worker.fetch(req, env, ctx)
    expect(env.DB._state.adminAlerts.length).toBe(0)
  })

  it('ignores unknown event types but acks 200', async () => {
    const env = makeEnv({ donation: pendingDonation() })
    const req = await webhookReq({ event: { event: 'subscription.create', id: 'evt_other', data: {} } })
    const res = await worker.fetch(req, env, ctx)
    expect(res.status).toBe(200)
    expect(env.DB._state.donation.status).toBe('pending')
  })
})
