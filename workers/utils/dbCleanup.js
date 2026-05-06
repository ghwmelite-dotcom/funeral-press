// Daily D1 cleanup. Deletes rows past their retention horizon from tables that
// otherwise grow unboundedly. Run from a scheduled handler at 03:00 UTC, an
// hour before the donation-api reconciliation cron, so DELETE I/O doesn't
// contend with the SELECT-heavy reconciliation pass.
//
// Retention rationale (each is independent and easy to revisit):
//   - analytics_events:    90 days. Long enough for monthly cohort analysis,
//                          short enough that the table stays well under D1
//                          row quotas at expected volume.
//   - phone_otps:          48 hours. OTPs are consumed on verify; rows past
//                          that point exist only for "OTP didn't arrive"
//                          debugging, which is rarely useful past 2 days.
//   - processed_webhooks:  30 days. Paystack retries within ~24h, so anything
//                          older than that can't dedupe anything; 30 days is a
//                          generous safety margin.
//
// Time column formats vary per table — see migration-foundation.sql /
// migration-donation-rail.sql:
//   analytics_events.created_at      TEXT   datetime('now')   → ISO string compare
//   phone_otps.created_at            INTEGER unix ms          → numeric compare
//   processed_webhooks.processed_at  INTEGER unix ms          → numeric compare

const DAY_MS = 86400000

export const D1_RETENTION = {
  analyticsEventsDays: 90,
  phoneOtpsHours: 48,
  processedWebhooksDays: 30,
}

/**
 * Run the daily cleanup. Returns a per-table summary of rows deleted so the
 * caller (scheduled handler) can log it. Errors on individual tables are
 * logged but never rethrown — one bad table must not block the others.
 */
export async function runD1Cleanup(env, retention = D1_RETENTION) {
  if (!env?.DB) {
    console.warn('[dbCleanup] No DB binding; skipping')
    return { analytics: 0, otps: 0, webhooks: 0 }
  }

  const now = Date.now()
  const result = { analytics: 0, otps: 0, webhooks: 0 }

  // analytics_events — TEXT created_at (ISO via datetime('now')).
  try {
    const r = await env.DB.prepare(
      `DELETE FROM analytics_events WHERE created_at < datetime('now', ?)`
    ).bind(`-${retention.analyticsEventsDays} days`).run()
    result.analytics = r?.meta?.changes ?? 0
  } catch (e) {
    console.error('[dbCleanup] analytics_events delete failed:', e?.message || e)
  }

  // phone_otps — INTEGER created_at (unix ms).
  try {
    const cutoff = now - retention.phoneOtpsHours * 3600 * 1000
    const r = await env.DB.prepare(
      `DELETE FROM phone_otps WHERE created_at < ?`
    ).bind(cutoff).run()
    result.otps = r?.meta?.changes ?? 0
  } catch (e) {
    console.error('[dbCleanup] phone_otps delete failed:', e?.message || e)
  }

  // processed_webhooks — INTEGER processed_at (unix ms).
  try {
    const cutoff = now - retention.processedWebhooksDays * DAY_MS
    const r = await env.DB.prepare(
      `DELETE FROM processed_webhooks WHERE processed_at < ?`
    ).bind(cutoff).run()
    result.webhooks = r?.meta?.changes ?? 0
  } catch (e) {
    console.error('[dbCleanup] processed_webhooks delete failed:', e?.message || e)
  }

  return result
}
