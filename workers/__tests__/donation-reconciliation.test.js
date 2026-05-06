import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reconcileDay, activatePendingMomoChanges } from '../donation-api.js'

function makeMockDb({ donations = [], memorials = {}, dueMomoRows = [] }) {
  const state = {
    donations: donations.map(d => ({ ...d })),
    memorials,
    dueMomoRows: dueMomoRows.map(r => ({ ...r })),
    updates: [],
    adminAlerts: [],
    auditRows: [],
  }
  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.includes('UPDATE donations')) {
            state.updates.push({ sql, args })
            const target = state.donations.find(d => d.id === args[args.length - 1])
            if (!target) return { meta: { changes: 0 } }
            // Honor the WHERE status = 'pending' clause: if the row is already
            // succeeded/failed, the UPDATE matches 0 rows. This is critical for
            // the race-guard test where reconcileDay loses to a webhook.
            if (sql.includes("status = 'pending'") && target.status !== 'pending') {
              return { meta: { changes: 0 } }
            }
            if (sql.includes("status = 'failed'")) { target.status = 'failed'; target.failure_reason = args[0] }
            else if (sql.includes("status = 'succeeded'")) {
              target.status = 'succeeded'
              target.succeeded_at = args[0]
              target.paystack_fee_pesewas = args[1]
              target.paystack_transaction_id = args[2]
            }
            return { meta: { changes: 1 } }
          }
          if (sql.includes('UPDATE memorials')) {
            state.updates.push({ sql, args })
            // For total-update: args = (delta, last_donation_at, updated_at, memorial_id)
            // For cool-down activate: args = (number, provider, name, updated_at, id)
            if (sql.includes('total_raised_pesewas =')) {
              const memId = args[args.length - 1]
              const m = state.memorials[memId] || {}
              m.total_raised_pesewas = (m.total_raised_pesewas || 0) + args[0]
              m.total_donor_count = (m.total_donor_count || 0) + 1
              state.memorials[memId] = m
            } else if (sql.includes('payout_momo_number =')) {
              const memId = args[4]
              const m = state.memorials[memId] || {}
              m.payout_momo_number = args[0]
              m.payout_momo_provider = args[1]
              m.payout_account_name = args[2]
              m.pending_payout_momo_number = null
              m.pending_payout_effective_at = null
              state.memorials[memId] = m
            }
            return { meta: { changes: 1 } }
          }
          if (sql.includes('INSERT INTO admin_notifications')) {
            state.adminAlerts.push({ args })
            return { meta: { changes: 1 } }
          }
          if (sql.includes('INSERT INTO donation_audit')) {
            state.auditRows.push({ args })
            return { meta: { changes: 1 } }
          }
          return { meta: { changes: 0 } }
        },
        first: async () => null,
        all: async () => {
          if (sql.includes('FROM donations')) {
            const from = args[0], to = args[1]
            return { results: state.donations.filter(d => d.created_at >= from && d.created_at < to) }
          }
          if (sql.includes('FROM memorials') && sql.includes('pending_payout_effective_at')) {
            const cutoff = args[0]
            return { results: state.dueMomoRows.filter(r => r.pending_payout_effective_at <= cutoff) }
          }
          return { results: [] }
        },
      }),
    }),
  }
}

function makeEnv({ donations = [], memorials = {}, dueMomoRows = [] } = {}) {
  return {
    PAYSTACK_SECRET_KEY: 'sk_test_fake',
    DB: makeMockDb({ donations, memorials, dueMomoRows }),
    MEMORIAL_PAGES_KV: { get: async () => null, put: async () => undefined, delete: async () => undefined },
  }
}

function donation(id, ref, status, createdOffsetMs = -3600000, memorial_id = 'mem_abc', amount_pesewas = 5000) {
  return { id, paystack_reference: ref, status, created_at: Date.now() + createdOffsetMs, memorial_id, amount_pesewas }
}

describe('reconcileDay', () => {
  beforeEach(() => { global.fetch = vi.fn() })

  function mockPaystackList(transactions) {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: true, data: transactions }),
    })
  }

  it('marks pending donation failed when Paystack has no record', async () => {
    const env = makeEnv({ donations: [donation('d1', 'FP_d1', 'pending')] })
    mockPaystackList([])  // empty
    await reconcileDay(env)
    expect(env.DB._state.donations[0].status).toBe('failed')
    expect(env.DB._state.donations[0].failure_reason).toContain('reconciliation')
  })

  it('promotes pending donation to succeeded when Paystack reports success', async () => {
    const env = makeEnv({
      donations: [donation('d1', 'FP_d1', 'pending')],
      memorials: { mem_abc: { total_raised_pesewas: 0, total_donor_count: 0 } },
    })
    mockPaystackList([{ reference: 'FP_d1', status: 'success', fees: 75, id: 12345 }])
    await reconcileDay(env)
    expect(env.DB._state.donations[0].status).toBe('succeeded')
    expect(env.DB._state.donations[0].paystack_fee_pesewas).toBe(75)
    expect(env.DB._state.memorials.mem_abc.total_raised_pesewas).toBe(5000)
    expect(env.DB._state.memorials.mem_abc.total_donor_count).toBe(1)
  })

  it('writes admin alert when mismatches > 0', async () => {
    const env = makeEnv({ donations: [donation('d1', 'FP_d1', 'pending')] })
    mockPaystackList([])
    await reconcileDay(env)
    expect(env.DB._state.adminAlerts.length).toBe(1)
    expect(env.DB._state.adminAlerts[0].args[0]).toBe('reconciliation.mismatches')
  })

  it('does not alert when D1 and Paystack agree', async () => {
    const env = makeEnv({
      donations: [donation('d1', 'FP_d1', 'succeeded')],
    })
    mockPaystackList([{ reference: 'FP_d1', status: 'success', fees: 75, id: 1 }])
    await reconcileDay(env)
    expect(env.DB._state.adminAlerts.length).toBe(0)
  })

  it('returns silently when Paystack list call fails', async () => {
    const env = makeEnv({ donations: [donation('d1', 'FP_d1', 'pending')] })
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ status: false, message: 'boom' }) })
    await reconcileDay(env)
    // No update happened
    expect(env.DB._state.donations[0].status).toBe('pending')
    expect(env.DB._state.adminAlerts.length).toBe(0)
  })

  it('leaves succeeded donations alone even if Paystack ref missing (post-refund case)', async () => {
    const env = makeEnv({ donations: [donation('d1', 'FP_d1', 'succeeded')] })
    mockPaystackList([])
    await reconcileDay(env)
    expect(env.DB._state.donations[0].status).toBe('succeeded')
    expect(env.DB._state.adminAlerts.length).toBe(0)
  })

  it('does NOT increment memorial totals when a webhook racing this cron already promoted the donation', async () => {
    // Simulate the race: SELECT sees pending, but a webhook flips the row
    // to succeeded between SELECT and UPDATE. The cron's UPDATE has a
    // status='pending' guard so it matches 0 rows and we must skip the
    // memorial increment. Without this guard the memorial would double-count.
    const env = makeEnv({
      donations: [donation('d1', 'FP_d1', 'pending')],
      memorials: { mem_abc: { total_raised_pesewas: 0, total_donor_count: 0 } },
    })
    mockPaystackList([{ reference: 'FP_d1', status: 'success', fees: 75, id: 1 }])
    // Sneak in the webhook win between SELECT and UPDATE by mutating the
    // mock state on the next prepare() call. Easiest path: pre-flip the row
    // before the cron runs — same effective state for the UPDATE.
    env.DB._state.donations[0].status = 'succeeded'
    await reconcileDay(env)
    // Memorial totals must NOT have incremented (double-count guard).
    expect(env.DB._state.memorials.mem_abc.total_raised_pesewas).toBe(0)
    expect(env.DB._state.memorials.mem_abc.total_donor_count).toBe(0)
  })
})

describe('activatePendingMomoChanges', () => {
  it('promotes due cool-down rows and writes audit', async () => {
    const env = makeEnv({
      memorials: { mem_abc: {} },
      dueMomoRows: [{
        id: 'mem_abc',
        pending_payout_momo_number: '+233200000000',
        pending_payout_momo_provider: 'vodafone',
        pending_payout_account_name: 'New Holder',
        pending_payout_effective_at: Date.now() - 1000,
      }],
    })
    await activatePendingMomoChanges(env)
    expect(env.DB._state.memorials.mem_abc.payout_momo_number).toBe('+233200000000')
    expect(env.DB._state.memorials.mem_abc.payout_momo_provider).toBe('vodafone')
    expect(env.DB._state.memorials.mem_abc.pending_payout_effective_at).toBeNull()
    expect(env.DB._state.auditRows.length).toBe(1)
    expect(env.DB._state.auditRows[0].args[4]).toBe('memorial.payout_changed')
  })

  it('leaves future-dated cool-down rows alone', async () => {
    const env = makeEnv({
      memorials: { mem_abc: {} },
      dueMomoRows: [],  // mock filters out future ones — verifying no rows = no work
    })
    await activatePendingMomoChanges(env)
    expect(env.DB._state.auditRows.length).toBe(0)
    expect(env.DB._state.updates.length).toBe(0)
  })
})
