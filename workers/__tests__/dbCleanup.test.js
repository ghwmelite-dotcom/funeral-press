import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runD1Cleanup, D1_RETENTION } from '../utils/dbCleanup.js'

function makeMockDb() {
  const calls = []
  return {
    _calls: calls,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          calls.push({ sql, args })
          // Return a deterministic per-table delete count so the caller
          // tests can assert on them.
          if (sql.includes('analytics_events')) return { meta: { changes: 12 } }
          if (sql.includes('phone_otps')) return { meta: { changes: 5 } }
          if (sql.includes('processed_webhooks')) return { meta: { changes: 7 } }
          return { meta: { changes: 0 } }
        },
      }),
    }),
  }
}

describe('runD1Cleanup', () => {
  beforeEach(() => {
    // Lock the clock so the unix-ms cutoff math is deterministic.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-06T03:00:00Z'))
  })

  it('returns zero counts and skips all queries when DB binding missing', async () => {
    const out = await runD1Cleanup({})
    expect(out).toEqual({ analytics: 0, otps: 0, webhooks: 0 })
  })

  it('issues one DELETE per table with the configured retention windows', async () => {
    const env = { DB: makeMockDb() }
    const out = await runD1Cleanup(env)

    expect(env.DB._calls).toHaveLength(3)
    expect(out).toEqual({ analytics: 12, otps: 5, webhooks: 7 })
  })

  it('uses datetime("now", "-N days") for analytics_events (TEXT created_at)', async () => {
    const env = { DB: makeMockDb() }
    await runD1Cleanup(env)
    const c = env.DB._calls.find((x) => x.sql.includes('analytics_events'))
    expect(c.sql).toMatch(/created_at < datetime\('now', \?\)/)
    expect(c.args[0]).toBe(`-${D1_RETENTION.analyticsEventsDays} days`)
  })

  it('uses unix-ms cutoff for phone_otps (INTEGER created_at)', async () => {
    const env = { DB: makeMockDb() }
    await runD1Cleanup(env)
    const c = env.DB._calls.find((x) => x.sql.includes('phone_otps'))
    expect(c.sql).toMatch(/created_at < \?/)
    const expectedCutoff = Date.now() - D1_RETENTION.phoneOtpsHours * 3600 * 1000
    expect(c.args[0]).toBe(expectedCutoff)
  })

  it('uses unix-ms cutoff for processed_webhooks (INTEGER processed_at)', async () => {
    const env = { DB: makeMockDb() }
    await runD1Cleanup(env)
    const c = env.DB._calls.find((x) => x.sql.includes('processed_webhooks'))
    expect(c.sql).toMatch(/processed_at < \?/)
    const expectedCutoff = Date.now() - D1_RETENTION.processedWebhooksDays * 86400000
    expect(c.args[0]).toBe(expectedCutoff)
  })

  it('continues to subsequent tables when one DELETE throws', async () => {
    // Make the analytics DELETE throw; the phone_otps and webhooks deletes
    // must still run and report their counts. One bad table can never block
    // the others.
    const calls = []
    const env = {
      DB: {
        _calls: calls,
        prepare: (sql) => ({
          bind: (...args) => ({
            run: async () => {
              calls.push({ sql, args })
              if (sql.includes('analytics_events')) throw new Error('boom')
              if (sql.includes('phone_otps')) return { meta: { changes: 3 } }
              if (sql.includes('processed_webhooks')) return { meta: { changes: 4 } }
              return { meta: { changes: 0 } }
            },
          }),
        }),
      },
    }
    const out = await runD1Cleanup(env)
    expect(out.analytics).toBe(0)
    expect(out.otps).toBe(3)
    expect(out.webhooks).toBe(4)
    expect(env.DB._calls).toHaveLength(3)
  })

  it('honors custom retention overrides (so tests/operators can tune)', async () => {
    const env = { DB: makeMockDb() }
    await runD1Cleanup(env, {
      analyticsEventsDays: 30,
      phoneOtpsHours: 24,
      processedWebhooksDays: 7,
    })
    const a = env.DB._calls.find((x) => x.sql.includes('analytics_events'))
    expect(a.args[0]).toBe('-30 days')
    const p = env.DB._calls.find((x) => x.sql.includes('phone_otps'))
    expect(p.args[0]).toBe(Date.now() - 24 * 3600 * 1000)
    const w = env.DB._calls.find((x) => x.sql.includes('processed_webhooks'))
    expect(w.args[0]).toBe(Date.now() - 7 * 86400000)
  })
})
