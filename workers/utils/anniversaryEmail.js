// ============================================================
// Anniversary reminder email builder
// ------------------------------------------------------------
// Used by runAnniversarySweep (auth-api.js scheduled cron) to
// build per-occasion reminder emails sent via Resend.
//
// Occasions:
//   'birthday'         — matches birth_md for today
//   'death_anniversary'— matches death_md for today
//   'remembrance'      — holiday sweep (All Souls' Day, Christmas, …)
//
// NOTE: Africa/Accra is UTC+0 year-round (no DST), so "today's
// MM-DD" is simply the UTC date's month/day. No tz library needed.
// ============================================================

import { escapeHtml } from './sanitize.js'

const MEMORIAL_BASE = 'https://funeralpress.org/memorial'
const RESEND_FROM = 'FuneralPress <notifications@funeralpress.org>'

/**
 * Build the subject + html for an anniversary/remembrance email.
 *
 * @param {object} opts
 * @param {string} opts.deceasedName
 * @param {'birthday'|'death_anniversary'|'remembrance'} opts.occasion
 * @param {string} opts.memorialId
 * @param {string} opts.unsubscribeToken
 * @returns {{ subject: string, html: string }}
 */
export function buildAnniversaryEmail({ deceasedName, occasion, memorialId, unsubscribeToken }) {
  const name = deceasedName || 'your loved one'
  const safeName = escapeHtml(name)
  const memorialUrl = `${MEMORIAL_BASE}/${encodeURIComponent(memorialId)}`
  const unsubscribeUrl = `https://funeralpress.org/reminders/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`

  let subject, intro, body

  if (occasion === 'birthday') {
    subject = `Remembering ${name} today`
    intro = `Today marks the birthday of <strong>${safeName}</strong>.`
    body = 'On this day, we remember them with love and gratitude for the life they shared with us. You are receiving this because you chose to follow their memorial page.'
  } else if (occasion === 'death_anniversary') {
    subject = `Remembering ${name} today`
    intro = `Today is the anniversary of the passing of <strong>${safeName}</strong>.`
    body = 'On this day of remembrance, we hold their memory close and honour the mark they left on all who knew them. You are receiving this because you chose to follow their memorial page.'
  } else {
    // remembrance — holiday context
    subject = `Remembering ${name} today`
    intro = `On this day of remembrance, we think of <strong>${safeName}</strong>.`
    body = 'Today is a time to honour those who have gone before us. You are receiving this because you chose to follow their memorial page.'
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9f7f5;font-family:Georgia,'Times New Roman',serif;color:#2d2d2d;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0dbd5;border-radius:6px;padding:40px 48px;max-width:560px;">
        <tr><td>
          <!-- Header -->
          <p style="margin:0 0 8px;font-size:13px;color:#8a7f74;letter-spacing:0.08em;text-transform:uppercase;">FuneralPress</p>
          <hr style="border:none;border-top:1px solid #e0dbd5;margin:0 0 32px;">

          <!-- Intro -->
          <p style="margin:0 0 20px;font-size:18px;line-height:1.6;color:#2d2d2d;">${intro}</p>

          <!-- Body -->
          <p style="margin:0 0 32px;font-size:15px;line-height:1.7;color:#4a4440;">${body}</p>

          <!-- CTAs -->
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr>
              <td style="padding-right:12px;">
                <a href="${memorialUrl}"
                   style="display:inline-block;padding:12px 24px;background:#2d2d2d;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;border-radius:4px;">Visit the memorial page</a>
              </td>
              <td>
                <a href="${memorialUrl}#light-a-candle"
                   style="display:inline-block;padding:12px 24px;background:#ffffff;color:#2d2d2d;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;border-radius:4px;border:1px solid #2d2d2d;">Light a candle</a>
              </td>
            </tr>
          </table>

          <!-- Divider -->
          <hr style="border:none;border-top:1px solid #e0dbd5;margin:0 0 20px;">

          <!-- Footer -->
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#8a7f74;line-height:1.6;">
            You are receiving this because you followed a memorial on
            <a href="https://funeralpress.org" style="color:#8a7f74;">funeralpress.org</a>.<br>
            <a href="${unsubscribeUrl}" style="color:#8a7f74;">Unsubscribe from reminders for this memorial</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, html }
}

// ─── Resend dispatcher (shared across reminders sweep) ──────────────────────

/**
 * Send a single email via Resend. Returns true on success, false on failure.
 * Never throws — one bad address must not abort the entire sweep.
 *
 * @param {object} env  — Worker env binding (needs RESEND_API_KEY)
 * @param {string} to
 * @param {{ subject: string, html: string }} email
 * @returns {Promise<boolean>}
 */
export async function sendReminderEmail(env, to, { subject, html }) {
  if (!env.RESEND_API_KEY) {
    console.warn('[anniversary] RESEND_API_KEY missing; skipping email to', to)
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
      }),
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.error('[anniversary] Resend non-2xx:', res.status, errBody.slice(0, 200))
      return false
    }
    return true
  } catch (e) {
    console.error('[anniversary] Resend send failed:', e?.message || e)
    return false
  }
}

// ─── Holiday table ───────────────────────────────────────────────────────────
// Keyed by 'MM-DD' (UTC). Expand as needed.
export const HOLIDAYS = {
  '11-02': "All Souls' Day",
  '12-25': 'Christmas',
}

// ─── Anniversary sweep ───────────────────────────────────────────────────────

/**
 * Daily anniversary sweep — run at 07:00 UTC.
 *
 * Africa/Accra is UTC+0 year-round (no DST), so UTC date == local date there.
 * We use plain UTC month/day — no tz library needed.
 *
 * 1. Birthday / death anniversary: SELECT memorial_meta rows whose birth_md or
 *    death_md matches today AND whose last_reminder_md is not already today
 *    (double-send guard). For each row, determine the occasion(s), SELECT
 *    followers, send an email per follower, then UPDATE last_reminder_md.
 *
 * 2. Holidays: if today is a known holiday, also send a 'remembrance' email to
 *    followers of any memorial NOT already swept today. This guard reuses
 *    last_reminder_md so a memorial whose anniversary and a holiday coincide
 *    receives only one email (already marked by the birthday/death pass above).
 *
 * @param {object} env — Worker env (DB, RESEND_API_KEY)
 * @returns {Promise<{ birthday: number, deathAnniversary: number, remembrance: number, errors: number }>}
 */
export async function runAnniversarySweep(env) {
  if (!env?.DB) {
    console.warn('[anniversary] No DB binding; skipping')
    return { birthday: 0, deathAnniversary: 0, remembrance: 0, errors: 0 }
  }

  // Africa/Accra is UTC+0 year-round — UTC month/day equals local date.
  const now = new Date()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const todayMd = `${mm}-${dd}` // e.g. '03-12'

  let birthday = 0, deathAnniversary = 0, remembrance = 0, errors = 0

  // ── Pass 1: birthday / death anniversary ──────────────────────────────────
  const { results: metaRows = [] } = await env.DB.prepare(
    `SELECT * FROM memorial_meta
      WHERE (birth_md = ? OR death_md = ?)
        AND (last_reminder_md IS NULL OR last_reminder_md != ?)`
  ).bind(todayMd, todayMd, todayMd).all()

  for (const meta of metaRows) {
    const { memorial_id, deceased_name, birth_md, death_md } = meta

    // Determine which occasion(s) match today (could be both on the same day,
    // though rare — send both emails in that case).
    const occasions = []
    if (birth_md === todayMd) occasions.push('birthday')
    if (death_md === todayMd) occasions.push('death_anniversary')
    if (occasions.length === 0) continue

    // Fetch followers for this memorial
    const { results: followers = [] } = await env.DB.prepare(
      `SELECT email, unsubscribe_token FROM memorial_followers WHERE memorial_id = ?`
    ).bind(memorial_id).all()

    for (const follower of followers) {
      for (const occasion of occasions) {
        try {
          const email = buildAnniversaryEmail({
            deceasedName: deceased_name,
            occasion,
            memorialId: memorial_id,
            unsubscribeToken: follower.unsubscribe_token,
          })
          const ok = await sendReminderEmail(env, follower.email, email)
          if (!ok) errors++
          else if (occasion === 'birthday') birthday++
          else deathAnniversary++
        } catch (e) {
          console.error('[anniversary] Failed sending to', follower.email, ':', e?.message || e)
          errors++
        }
      }
    }

    // Mark swept — prevents double-send if cron fires twice or a holiday also
    // falls on today for this memorial.
    await env.DB.prepare(
      `UPDATE memorial_meta SET last_reminder_md = ? WHERE memorial_id = ?`
    ).bind(todayMd, memorial_id).run()
  }

  // ── Pass 2: holiday remembrance ───────────────────────────────────────────
  const holidayName = HOLIDAYS[todayMd]
  if (holidayName) {
    // Select memorials NOT already swept today so we don't double-email a
    // memorial whose anniversary also matched today (last_reminder_md guards it).
    const { results: holidayMeta = [] } = await env.DB.prepare(
      `SELECT * FROM memorial_meta
        WHERE (last_reminder_md IS NULL OR last_reminder_md != ?)`
    ).bind(todayMd).all()

    for (const meta of holidayMeta) {
      const { memorial_id, deceased_name } = meta

      const { results: followers = [] } = await env.DB.prepare(
        `SELECT email, unsubscribe_token FROM memorial_followers WHERE memorial_id = ?`
      ).bind(memorial_id).all()

      for (const follower of followers) {
        try {
          const email = buildAnniversaryEmail({
            deceasedName: deceased_name,
            occasion: 'remembrance',
            memorialId: memorial_id,
            unsubscribeToken: follower.unsubscribe_token,
          })
          const ok = await sendReminderEmail(env, follower.email, email)
          if (!ok) errors++
          else remembrance++
        } catch (e) {
          console.error('[anniversary] Holiday send failed for', follower.email, ':', e?.message || e)
          errors++
        }
      }

      await env.DB.prepare(
        `UPDATE memorial_meta SET last_reminder_md = ? WHERE memorial_id = ?`
      ).bind(todayMd, memorial_id).run()
    }
  }

  return { birthday, deathAnniversary, remembrance, errors }
}
