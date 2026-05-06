import { describe, it, expect, vi } from 'vitest'
import worker from '../auth-api.js'

// Lightweight mock DB — both runD1Cleanup and runDunningCron read from env.DB.
// We don't care about the SQL contents here; this test only verifies that the
// scheduled handler routes to the right job based on the cron expression.
function noopDb() {
  return {
    prepare: () => ({
      bind: (..._a) => ({
        run: async () => ({ meta: { changes: 0 } }),
        first: async () => null,
        all: async () => ({ results: [] }),
      }),
    }),
  }
}

function makeEnv() {
  return {
    DB: noopDb(),
    JWT_SECRET: 'test',
    OTP_PEPPER: 'test',
  }
}

function makeCtx() {
  const promises = []
  return {
    promises,
    waitUntil: (p) => { promises.push(p) },
  }
}

describe('auth-api scheduled() dispatch', () => {
  it('routes the 03:00 UTC cron to runD1Cleanup', async () => {
    const env = makeEnv()
    const ctx = makeCtx()
    const dbSpy = vi.spyOn(env.DB, 'prepare')
    await worker.scheduled({ cron: '0 3 * * *', scheduledTime: Date.now() }, env, ctx)
    await Promise.all(ctx.promises)
    // runD1Cleanup issues DELETEs; runDunningCron issues SELECT FROM subscriptions.
    const sqls = dbSpy.mock.calls.map((c) => c[0])
    expect(sqls.some((s) => s.includes('DELETE FROM analytics_events'))).toBe(true)
    expect(sqls.some((s) => s.includes('DELETE FROM phone_otps'))).toBe(true)
    expect(sqls.some((s) => s.includes('DELETE FROM processed_webhooks'))).toBe(true)
    expect(sqls.some((s) => s.includes('FROM subscriptions'))).toBe(false)
  })

  it('routes the 08:00 UTC cron to runDunningCron', async () => {
    const env = makeEnv()
    const ctx = makeCtx()
    const dbSpy = vi.spyOn(env.DB, 'prepare')
    await worker.scheduled({ cron: '0 8 * * *', scheduledTime: Date.now() }, env, ctx)
    await Promise.all(ctx.promises)
    const sqls = dbSpy.mock.calls.map((c) => c[0])
    expect(sqls.some((s) => s.includes('FROM subscriptions'))).toBe(true)
    expect(sqls.some((s) => s.includes('DELETE FROM analytics_events'))).toBe(false)
  })

  it('logs a warning and runs no cleanup or dunning for an unrecognized cron expression', async () => {
    // Sentry.withSentry adds its own ctx.waitUntil for event-flush, so we
    // assert on what matters: no DB queries from either job were issued.
    const env = makeEnv()
    const ctx = makeCtx()
    const dbSpy = vi.spyOn(env.DB, 'prepare')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await worker.scheduled({ cron: '*/5 * * * *', scheduledTime: Date.now() }, env, ctx)
    await Promise.all(ctx.promises)
    expect(dbSpy).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
