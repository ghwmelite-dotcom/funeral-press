// ============================================================
// Subscription dunning email helper
// ------------------------------------------------------------
// Cron-driven daily sweep that walks past_due subscriptions
// through 3 stages:
//   stage 0 → 1 : Day 1 retry email (sent immediately when entering past_due)
//   stage 1 → 2 : Day 3 warning email (≥ 2 days after stage 1)
//   stage 2 → 3 : Day 7 downgrade — clear monthly_credits_remaining
//                 and send "downgraded" email (≥ 4 days after stage 2)
//   stage 3     : terminal, skip
//
// Designs/memorials are always preserved across downgrade — only
// the Pro entitlement (monthly credits) is revoked.
// ============================================================

const RESEND_FROM = 'FuneralPress <notifications@funeralpress.org>'
// Used when no Paystack manage link can be fetched. Points at a generic page
// so the email is never broken; per-user manage links replace this in
// runDunningCron via fetchPaystackManageLink().
const FALLBACK_PORTAL_URL = 'https://funeralpress.org'
// Min ms between Day 1 → Day 3 (2 days) and Day 3 → downgrade (4 days)
const DAY_MS = 86400000
const DAY3_DELAY_MS = 2 * DAY_MS
const DOWNGRADE_DELAY_MS = 4 * DAY_MS

function planLabel(plan) {
  return plan === 'pro_annual' ? 'annual' : 'monthly'
}

function recipientName(user) {
  if (!user) return 'there'
  return user.name || user.email?.split('@')[0] || 'there'
}

/**
 * Fetch a per-subscription Paystack-hosted "manage subscription" link so the
 * dunning email lets the user update their card without leaving the email.
 * Returns the fallback URL if Paystack rejects, the env is misconfigured, or
 * the subscription code is missing — the email must always have a usable link.
 */
export async function fetchPaystackManageLink(env, subscriptionCode) {
  if (!subscriptionCode || !env?.PAYSTACK_SECRET_KEY) return FALLBACK_PORTAL_URL
  try {
    const res = await fetch(
      `https://api.paystack.co/subscription/${encodeURIComponent(subscriptionCode)}/manage/link`,
      { headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` } }
    )
    if (!res.ok) return FALLBACK_PORTAL_URL
    const data = await res.json().catch(() => null)
    return data?.data?.link || FALLBACK_PORTAL_URL
  } catch (e) {
    console.error('[dunning] Paystack manage-link fetch failed:', e?.message || e)
    return FALLBACK_PORTAL_URL
  }
}

// ─── Email templates ────────────────────────────────────────────────────────

export function dunningDay1Email(user, sub, manageUrl = FALLBACK_PORTAL_URL) {
  const name = recipientName(user)
  const plan = planLabel(sub?.plan)
  const url = manageUrl || FALLBACK_PORTAL_URL
  const subject = 'Your FuneralPress Pro payment failed'
  const text = `Hi ${name},

We couldn't process your Pro ${plan} subscription payment. We'll retry automatically over the next few days.

Update your payment method here: ${url}

Your Pro features remain active for now.

— The FuneralPress team`
  const html = `<p>Hi ${name},</p>
<p>We couldn't process your Pro ${plan} subscription payment. We'll retry automatically over the next few days.</p>
<p>Update your payment method here: <a href="${url}">${url}</a></p>
<p>Your Pro features remain active for now.</p>
<p>— The FuneralPress team</p>`
  return { subject, text, html }
}

export function dunningDay3Email(user, sub, manageUrl = FALLBACK_PORTAL_URL) {
  const name = recipientName(user)
  const plan = planLabel(sub?.plan)
  const url = manageUrl || FALLBACK_PORTAL_URL
  const subject = 'Action needed: your FuneralPress Pro access ends in 4 days'
  const text = `Hi ${name},

Your Pro ${plan} subscription is past due. We'll downgrade your account in 4 days unless payment goes through.

Your designs and memorials will be preserved.

Update payment: ${url}

— The FuneralPress team`
  const html = `<p>Hi ${name},</p>
<p>Your Pro ${plan} subscription is past due. We'll downgrade your account in 4 days unless payment goes through.</p>
<p>Your designs and memorials will be preserved.</p>
<p>Update payment: <a href="${url}">${url}</a></p>
<p>— The FuneralPress team</p>`
  return { subject, text, html }
}

export function dunningDowngradeEmail(user, sub, manageUrl = FALLBACK_PORTAL_URL) {
  const name = recipientName(user)
  const plan = planLabel(sub?.plan)
  const url = manageUrl || FALLBACK_PORTAL_URL
  const subject = 'Your FuneralPress Pro access has been downgraded'
  const text = `Hi ${name},

Your Pro ${plan} subscription has been downgraded to the free tier after multiple failed payment attempts.

All your designs and memorials are preserved.

Resubscribe anytime: ${url}

— The FuneralPress team`
  const html = `<p>Hi ${name},</p>
<p>Your Pro ${plan} subscription has been downgraded to the free tier after multiple failed payment attempts.</p>
<p>All your designs and memorials are preserved.</p>
<p>Resubscribe anytime: <a href="${url}">${url}</a></p>
<p>— The FuneralPress team</p>`
  return { subject, text, html }
}

// ─── Resend dispatcher ──────────────────────────────────────────────────────

async function sendResendEmail(env, to, { subject, html, text }) {
  if (!env.RESEND_API_KEY) {
    console.warn('[dunning] RESEND_API_KEY missing; skipping email to', to)
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject,
        html,
        text,
      }),
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.error('[dunning] Resend non-2xx:', res.status, errBody.slice(0, 200))
      return false
    }
    return true
  } catch (e) {
    console.error('[dunning] Resend send failed:', e.message)
    return false
  }
}

// ─── Memorial annual renewal reminder emails ─────────────────────────────────

// How far before expires_at to send each reminder.
const MEMORIAL_REMINDER_T14_MS = 14 * DAY_MS
const MEMORIAL_REMINDER_T3_MS = 3 * DAY_MS

export function memorialRenewalT14Email(user, memorialName, renewUrl = FALLBACK_PORTAL_URL) {
  const name = recipientName(user)
  const memorial = memorialName || 'the memorial page'
  const subject = `Renewal reminder: ${memorial}'s premium features`
  const text = `Hi ${name},

A quick heads-up: the premium features on ${memorial}'s memorial page are set to lapse in about 14 days.

Renew to keep features like unlimited photos, all themes, and tribute video active.

Renew here: ${renewUrl}

If you choose not to renew, the page will remain online and all content is preserved — only the premium features will lapse.

— The FuneralPress team`
  const html = `<p>Hi ${name},</p>
<p>A quick heads-up: the premium features on <strong>${memorial}</strong>'s memorial page are set to lapse in about 14 days.</p>
<p>Renew to keep features like unlimited photos, all themes, and tribute video active.</p>
<p><a href="${renewUrl}">Renew here</a></p>
<p style="font-size:13px;color:#666;">If you choose not to renew, the page will remain online and all content is preserved — only the premium features will lapse.</p>
<p>— The FuneralPress team</p>`
  return { subject, text, html }
}

export function memorialRenewalT3Email(user, memorialName, renewUrl = FALLBACK_PORTAL_URL) {
  const name = recipientName(user)
  const memorial = memorialName || 'the memorial page'
  const subject = `3 days left: keep ${memorial}'s premium features active`
  const text = `Hi ${name},

Just 3 days left before the premium features on ${memorial}'s memorial page lapse.

Renew now to keep everything active: ${renewUrl}

The page and all content are always preserved — only premium features change.

— The FuneralPress team`
  const html = `<p>Hi ${name},</p>
<p>Just 3 days left before the premium features on <strong>${memorial}</strong>'s memorial page lapse.</p>
<p><a href="${renewUrl}">Renew now</a> to keep everything active.</p>
<p style="font-size:13px;color:#666;">The page and all content are always preserved — only premium features change.</p>
<p>— The FuneralPress team</p>`
  return { subject, text, html }
}

// ─── Cron entry point ───────────────────────────────────────────────────────

/**
 * Daily dunning sweep. Walks past_due subscriptions through Day 1 / Day 3 /
 * Day 7 downgrade stages and sends Resend emails.
 *
 * Also sends renewal reminders for memorial annual subs nearing expires_at
 * (T-14 and T-3 days). Uses last_dunning_sent_at as the duplicate-send guard:
 * a reminder sets last_dunning_sent_at on the subscriptions row (keyed by
 * paystack_subscription_code) so the cron won't re-send within 5 days.
 *
 * Exported for direct testing.
 */
export async function runDunningCron(env) {
  if (!env?.DB) {
    console.warn('[dunning] No DB binding; skipping')
    return { processed: 0, day1: 0, day3: 0, downgraded: 0, memorialReminders: 0 }
  }

  // Pull every past_due subscription that has not yet hit terminal stage 3.
  const { results = [] } = await env.DB.prepare(
    `SELECT s.id, s.user_id, s.plan, s.status, s.dunning_stage, s.last_dunning_sent_at,
            s.paystack_subscription_code,
            u.email AS user_email, u.name AS user_name
       FROM subscriptions s
       LEFT JOIN users u ON u.id = s.user_id
      WHERE s.status = 'past_due'
        AND COALESCE(s.dunning_stage, 0) < 3`
  ).bind().all()

  const now = Date.now()
  const nowIso = new Date(now).toISOString()

  let day1 = 0, day3 = 0, downgraded = 0

  for (const row of results) {
    const stage = row.dunning_stage || 0
    const user = { email: row.user_email, name: row.user_name }
    const sub = { id: row.id, plan: row.plan }

    if (!row.user_email) {
      console.warn(`[dunning] Subscription ${row.id} has no user email; skipping`)
      continue
    }

    const lastSentMs = row.last_dunning_sent_at ? Date.parse(row.last_dunning_sent_at) : 0

    if (stage === 0) {
      // Just entered past_due → Day 1 email.
      // Fetch a per-user Paystack manage-subscription URL so the email lets
      // the customer update their card. Falls back to the homepage if
      // Paystack is unavailable — see fetchPaystackManageLink().
      const manageUrl = await fetchPaystackManageLink(env, row.paystack_subscription_code)
      const tpl = dunningDay1Email(user, sub, manageUrl)
      await sendResendEmail(env, row.user_email, tpl)
      await env.DB.prepare(
        `UPDATE subscriptions
            SET dunning_stage = 1,
                last_dunning_sent_at = ?,
                updated_at = datetime('now')
          WHERE id = ?`
      ).bind(nowIso, row.id).run()
      await env.DB.prepare(
        `INSERT INTO subscription_events (subscription_id, event_type, detail) VALUES (?, 'dunning.day1', ?)`
      ).bind(row.id, JSON.stringify({ userId: row.user_id })).run()
      day1++
    } else if (stage === 1) {
      // Already sent Day 1 → require ≥ 2 days before Day 3
      if (now - lastSentMs < DAY3_DELAY_MS) continue
      const manageUrl = await fetchPaystackManageLink(env, row.paystack_subscription_code)
      const tpl = dunningDay3Email(user, sub, manageUrl)
      await sendResendEmail(env, row.user_email, tpl)
      await env.DB.prepare(
        `UPDATE subscriptions
            SET dunning_stage = 2,
                last_dunning_sent_at = ?,
                updated_at = datetime('now')
          WHERE id = ?`
      ).bind(nowIso, row.id).run()
      await env.DB.prepare(
        `INSERT INTO subscription_events (subscription_id, event_type, detail) VALUES (?, 'dunning.day3', ?)`
      ).bind(row.id, JSON.stringify({ userId: row.user_id })).run()
      day3++
    } else if (stage === 2) {
      // Already sent Day 3 → require ≥ 4 more days before downgrade
      if (now - lastSentMs < DOWNGRADE_DELAY_MS) continue
      const manageUrl = await fetchPaystackManageLink(env, row.paystack_subscription_code)
      const tpl = dunningDowngradeEmail(user, sub, manageUrl)
      await sendResendEmail(env, row.user_email, tpl)
      await env.DB.prepare(
        `UPDATE subscriptions
            SET dunning_stage = 3,
                monthly_credits_remaining = 0,
                last_dunning_sent_at = ?,
                updated_at = datetime('now')
          WHERE id = ?`
      ).bind(nowIso, row.id).run()
      await env.DB.prepare(
        `INSERT INTO subscription_events (subscription_id, event_type, detail) VALUES (?, 'dunning.downgrade', ?)`
      ).bind(row.id, JSON.stringify({ userId: row.user_id, reason: 'multiple_failed_payments' })).run()
      downgraded++
    }
    // stage >= 3 is filtered out by the SELECT; no-op safety
  }

  // ── Memorial annual renewal reminders ─────────────────────────────────────
  // Find active annual memorial_premium rows expiring within the next 14 days.
  // We use last_dunning_sent_at on the linked subscriptions row as a duplicate-
  // send guard (avoid resending within 5 days of the last reminder).
  let memorialReminders = 0
  try {
    const t14Threshold = now + MEMORIAL_REMINDER_T14_MS  // expires within 14 days
    const { results: expiringRows = [] } = await env.DB.prepare(
      `SELECT mp.memorial_id, mp.expires_at, mp.paystack_subscription_code,
              mm.deceased_name,
              s.id AS sub_id, s.last_dunning_sent_at AS last_reminder_sent,
              u.email AS user_email, u.name AS user_name
         FROM memorial_premium mp
         LEFT JOIN subscriptions s ON s.paystack_subscription_code = mp.paystack_subscription_code
         LEFT JOIN users u ON u.id = s.user_id
         LEFT JOIN memorial_meta mm ON mm.memorial_id = mp.memorial_id
        WHERE mp.plan_type = 'annual'
          AND mp.status = 'succeeded'
          AND mp.expires_at IS NOT NULL
          AND mp.expires_at > ?
          AND mp.expires_at <= ?`
    ).bind(now, t14Threshold).all()

    for (const row of expiringRows) {
      if (!row.user_email) continue

      const expiresAtMs = Number(row.expires_at)
      const timeToExpiry = expiresAtMs - now
      const lastReminderMs = row.last_reminder_sent ? Date.parse(row.last_reminder_sent) : 0
      // Guard: don't send another reminder if we sent one within the last 5 days
      const REMINDER_DEDUP_MS = 5 * DAY_MS
      if (now - lastReminderMs < REMINDER_DEDUP_MS) continue

      const user = { email: row.user_email, name: row.user_name }
      const memorialName = row.deceased_name || null
      const renewUrl = await fetchPaystackManageLink(env, row.paystack_subscription_code)

      // T-3 reminder has priority over T-14 so we pick the right template.
      let tpl
      if (timeToExpiry <= MEMORIAL_REMINDER_T3_MS) {
        tpl = memorialRenewalT3Email(user, memorialName, renewUrl)
      } else {
        tpl = memorialRenewalT14Email(user, memorialName, renewUrl)
      }

      await sendResendEmail(env, row.user_email, tpl)

      // Mark last_dunning_sent_at on the subscriptions row to prevent re-send.
      if (row.sub_id) {
        await env.DB.prepare(
          `UPDATE subscriptions SET last_dunning_sent_at = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(nowIso, row.sub_id).run()
      }

      memorialReminders++
    }
  } catch (e) {
    console.error('[dunning] memorial renewal reminder sweep failed:', e?.message || e)
  }

  return { processed: results.length, day1, day3, downgraded, memorialReminders }
}
