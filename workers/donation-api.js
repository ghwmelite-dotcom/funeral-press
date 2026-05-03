// FuneralPress Donation API Worker
// Owns: donations, donor wall, family-head approval, Paystack webhooks.
// Bindings: DB (D1), MEMORIAL_PAGES_KV, RATE_LIMITS, OTP_KV
// Secrets: PAYSTACK_SECRET_KEY, PAYSTACK_WEBHOOK_SECRET, JWT_SECRET, OTP_PEPPER,
//          TERMII_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER,
//          RESEND_API_KEY, OXR_APP_ID

import * as Sentry from '@sentry/cloudflare'
import { withSecurityHeaders } from './utils/securityHeaders.js'
import { sanitizeInput } from './utils/sanitize.js'
import { logDonationAudit, getClientIP } from './utils/auditLog.js'
import { verifyJWT, signJWT } from './utils/jwt.js'
import { featureFlag } from './utils/featureFlag.js'
import { createSubaccount, resolveAccount, initialiseTransaction, verifyWebhookSignature, listTransactions, refundTransaction, PAYSTACK_WEBHOOK_IPS } from './utils/paystack.js'
import { verifyOtp } from './utils/otp.js'
import { getFxRate } from './utils/fxRate.js'
import { containsProfanity } from './utils/profanity.js'

const PROD_ORIGINS = [
  'https://funeral-brochure-app.pages.dev',
  'https://funeralpress.org',
  'https://www.funeralpress.org',
]
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4173']

function allowedOrigins(env) {
  return env?.ENVIRONMENT === 'dev' ? [...PROD_ORIGINS, ...DEV_ORIGINS] : PROD_ORIGINS
}

function corsOrigin(req) {
  const o = req.headers.get('Origin') || ''
  const env = req.__env
  if (allowedOrigins(env).includes(o) || o.endsWith('.funeral-brochure-app.pages.dev')) return o
  return PROD_ORIGINS[0]
}

function corsHeaders(req) {
  return {
    'Access-Control-Allow-Origin': corsOrigin(req),
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

function json(data, status = 200, request) {
  return withSecurityHeaders(new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  }))
}

function error(message, status = 400, request, code = null) {
  return json(code ? { error: message, code } : { error: message }, status, request)
}

async function authenticate(request, env) {
  const h = request.headers.get('Authorization') || ''
  if (!h.startsWith('Bearer ')) return null
  const payload = await verifyJWT(h.slice(7), env.JWT_SECRET)
  return payload
}

// Returns { userId } on success or { error: Response } when caller lacks admin/manager role.
async function requireAdmin(request, env) {
  const auth = await authenticate(request, env)
  if (!auth) return { error: error('Auth required', 401, request) }
  const row = await env.DB.prepare(
    `SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND r.name IN ('admin', 'manager')`
  ).bind(auth.sub).first()
  if (!row) return { error: error('Admin only', 403, request) }
  return { userId: auth.sub }
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function maskMomo(num) {
  if (!num) return ''
  return num.slice(0, 4) + '*'.repeat(Math.max(0, num.length - 7)) + num.slice(-3)
}

// Token + OTP gate shared by approve and reject. Returns { ok: true, memRow, user } or
// { ok: false, response } where response is a finalised error Response.
async function verifyApprovalRequest(env, request, memorialId, token, otpCode, phone) {
  const tokenPayload = await verifyJWT(token, env.JWT_SECRET)
  if (!tokenPayload) return { ok: false, response: error('Invalid or expired approval link', 401, request) }
  if (tokenPayload.scope !== 'family_head_approval') return { ok: false, response: error('Wrong token scope', 401, request) }
  if (tokenPayload.memorial_id !== memorialId) return { ok: false, response: error('Token does not match memorial', 401, request) }
  if (tokenPayload.sub !== phone) return { ok: false, response: error('Phone does not match invite', 401, request) }

  const tokenHash = await sha256Hex(token)

  const memRow = await env.DB.prepare(
    `SELECT * FROM memorials WHERE id = ? AND approval_status = 'pending' AND approval_token_hash = ?`
  ).bind(memorialId, tokenHash).first()
  if (!memRow) return { ok: false, response: error('Approval link is no longer valid', 401, request) }
  if (memRow.approval_token_expires_at < Date.now()) return { ok: false, response: error('Approval link expired', 401, request) }

  const otpRow = await env.DB.prepare(
    `SELECT id, code_hash, expires_at, attempts, consumed_at
     FROM phone_otps
     WHERE phone_e164 = ? AND purpose = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`
  ).bind(phone, 'family_head_approval').first()

  if (!otpRow) return { ok: false, response: error('No verification code pending', 401, request) }
  if (otpRow.expires_at < Date.now()) return { ok: false, response: error('Verification code expired', 401, request) }
  if (otpRow.attempts >= 5) return { ok: false, response: error('Too many wrong attempts', 429, request) }

  await env.DB.prepare(`UPDATE phone_otps SET attempts = attempts + 1 WHERE id = ?`).bind(otpRow.id).run()

  const codeOk = await verifyOtp(otpCode, otpRow.code_hash, env.OTP_PEPPER)
  if (!codeOk) return { ok: false, response: error('Wrong code', 401, request) }

  await env.DB.prepare(`UPDATE phone_otps SET consumed_at = ? WHERE id = ?`).bind(Date.now(), otpRow.id).run()

  // Find or create user for this phone. users.id is TEXT PRIMARY KEY (UUID), not autoincrement.
  let user = await env.DB.prepare(`SELECT id FROM users WHERE phone_e164 = ?`).bind(phone).first()
  if (!user) {
    const newId = crypto.randomUUID()
    // google_id is NOT NULL in production; phone-only users get a synthesised value.
    await env.DB.prepare(
      `INSERT INTO users (id, google_id, email, name, phone_e164, phone_verified_at, auth_methods, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newId,
      `phone:${phone}`,
      `phone-${phone}@phone.funeralpress.org`,
      memRow.family_head_name || 'Family head',
      phone, Date.now(), 'phone', Date.now()
    ).run()
    user = { id: newId }
  }

  return { ok: true, memRow, user }
}

const handler = {
  async fetch(request, env, ctx) {
    // Stash env on request so CORS helpers can gate localhost behind ENVIRONMENT=dev
    request.__env = env
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    const url = new URL(request.url)
    const path = url.pathname

    // Global kill switch — applies to charge/init only; admin and read paths still work.
    if (featureFlag(env, 'DONATIONS_GLOBAL_PAUSED')) {
      if (path.includes('/donation/charge') || path.includes('/donation/init')) {
        return error('Donations are temporarily paused.', 503, request)
      }
    }

    // Health check (always available)
    if (path === '/health' && request.method === 'GET') {
      return json({ ok: true, service: 'donation-api' }, 200, request)
    }

    // Master feature flag — donation rail not enabled yet
    if (!featureFlag(env, 'DONATIONS_ENABLED')) {
      return error('Donation rail not enabled', 503, request)
    }

    try {
      // Paystack webhook — must run before any auth/JSON paths and not be wrapped in CORS.
      if (path === '/paystack/webhook' && request.method === 'POST') {
        const cfIp = request.headers.get('CF-Connecting-IP')
        if (!PAYSTACK_WEBHOOK_IPS.includes(cfIp)) {
          return new Response('forbidden', { status: 401 })
        }

        const sig = request.headers.get('x-paystack-signature')
        const rawBody = await request.text()
        const valid = await verifyWebhookSignature(rawBody, sig, env.PAYSTACK_WEBHOOK_SECRET)
        if (!valid) {
          return new Response('forbidden', { status: 401 })
        }

        let event
        try { event = JSON.parse(rawBody) } catch { return new Response('bad request', { status: 400 }) }

        const eventId = event.id || event.data?.reference || crypto.randomUUID()

        // Idempotency: have we processed this event already?
        const existing = await env.DB.prepare(
          `SELECT event_id FROM processed_webhooks WHERE event_id = ?`
        ).bind(eventId).first()
        if (existing) return new Response('ok', { status: 200 })

        await env.DB.prepare(
          `INSERT INTO processed_webhooks (event_id, source, processed_at) VALUES (?, ?, ?)`
        ).bind(eventId, 'paystack', Date.now()).run()

        if (event.event === 'charge.success') {
          const ref = event.data?.reference
          const donation = await env.DB.prepare(
            `SELECT id, memorial_id, amount_pesewas, status FROM donations WHERE paystack_reference = ?`
          ).bind(ref).first()
          if (!donation) return new Response('ok', { status: 200 })            // not ours
          if (donation.status === 'succeeded') return new Response('ok', { status: 200 })

          const fees = event.data.fees || 0
          const netToFamily = donation.amount_pesewas - fees

          await env.DB.prepare(
            `UPDATE donations
             SET status = 'succeeded', succeeded_at = ?, paystack_fee_pesewas = ?, net_to_family_pesewas = ?, paystack_transaction_id = ?
             WHERE id = ? AND status = 'pending'`
          ).bind(Date.now(), fees, netToFamily, String(event.data.id || ''), donation.id).run()

          await env.DB.prepare(
            `UPDATE memorials
             SET total_raised_pesewas = total_raised_pesewas + ?,
                 total_donor_count = total_donor_count + 1,
                 last_donation_at = ?,
                 updated_at = ?
             WHERE id = ?`
          ).bind(donation.amount_pesewas, Date.now(), Date.now(), donation.memorial_id).run()

          // Goal crossing check
          const memNow = await env.DB.prepare(
            `SELECT total_raised_pesewas, goal_amount_pesewas FROM memorials WHERE id = ?`
          ).bind(donation.memorial_id).first()
          if (memNow?.goal_amount_pesewas && memNow.total_raised_pesewas >= memNow.goal_amount_pesewas) {
            try {
              await env.DB.prepare(
                `INSERT INTO admin_notifications (type, title, detail, created_at) VALUES (?, ?, ?, ?)`
              ).bind(
                'donation.goal_crossed',
                `Memorial reached its donation goal`,
                JSON.stringify({ memorial_id: donation.memorial_id, total: memNow.total_raised_pesewas, goal: memNow.goal_amount_pesewas }),
                Date.now()
              ).run()
            } catch { /* admin alert never blocks webhook */ }
          }

          // KV write-through to memorial cache
          const kvRaw = await env.MEMORIAL_PAGES_KV.get(donation.memorial_id)
          if (kvRaw) {
            try {
              const memData = JSON.parse(kvRaw)
              memData.donation = {
                ...(memData.donation || {}),
                total_raised_pesewas: (memData.donation?.total_raised_pesewas || 0) + donation.amount_pesewas,
                total_donor_count: (memData.donation?.total_donor_count || 0) + 1,
              }
              await env.MEMORIAL_PAGES_KV.put(donation.memorial_id, JSON.stringify(memData))
            } catch { /* KV miss tolerated */ }
          }

          // Invalidate wall totals cache so the donation appears immediately on next fetch
          try { await env.MEMORIAL_PAGES_KV.delete(`wall:totals:${donation.memorial_id}`) } catch (err) {
            console.error('donation-api wall:totals KV invalidate (charge.success):', err)
          }

          // Receipt + thank-you email — wired in Task 26
          ctx.waitUntil(queueDonationReceipt(env, donation.id))
        } else if (event.event === 'charge.failed') {
          await env.DB.prepare(
            `UPDATE donations SET status = 'failed', failure_reason = ? WHERE paystack_reference = ? AND status = 'pending'`
          ).bind(event.data?.gateway_response || 'failed', event.data?.reference).run()

        } else if (event.event === 'refund.processed') {
          const ref = event.data?.transaction?.reference || event.data?.reference
          const donation = await env.DB.prepare(
            `SELECT id, memorial_id, amount_pesewas, status FROM donations WHERE paystack_reference = ?`
          ).bind(ref).first()
          if (!donation) return new Response('ok', { status: 200 })

          // Decrement memorial totals only for previously-succeeded donations
          if (donation.status === 'succeeded') {
            await env.DB.prepare(
              `UPDATE memorials
               SET total_raised_pesewas = total_raised_pesewas - ?,
                   total_donor_count = total_donor_count - 1,
                   updated_at = ?
               WHERE id = ?`
            ).bind(donation.amount_pesewas, Date.now(), donation.memorial_id).run()

            // KV write-through (clamp at zero so the public wall never shows negatives)
            const kvRaw = await env.MEMORIAL_PAGES_KV.get(donation.memorial_id)
            if (kvRaw) {
              try {
                const memData = JSON.parse(kvRaw)
                memData.donation = {
                  ...(memData.donation || {}),
                  total_raised_pesewas: Math.max(0, (memData.donation?.total_raised_pesewas || 0) - donation.amount_pesewas),
                  total_donor_count: Math.max(0, (memData.donation?.total_donor_count || 0) - 1),
                }
                await env.MEMORIAL_PAGES_KV.put(donation.memorial_id, JSON.stringify(memData))
              } catch (err) {
                console.error('donation-api memorial KV write-through (refund.processed):', err)
              }
            }
            try { await env.MEMORIAL_PAGES_KV.delete(`wall:totals:${donation.memorial_id}`) } catch (err) {
              console.error('donation-api wall:totals KV invalidate (refund.processed):', err)
            }
          }

          await env.DB.prepare(
            `UPDATE donations SET status = 'refunded', refunded_at = ? WHERE id = ?`
          ).bind(Date.now(), donation.id).run()

          await logDonationAudit(env.DB, {
            memorialId: donation.memorial_id,
            donationId: donation.id,
            action: 'donation.refund_processed',
            detail: { reference: ref },
          })

          try {
            await env.DB.prepare(
              `INSERT INTO admin_notifications (type, title, detail, created_at) VALUES (?, ?, ?, ?)`
            ).bind(
              'donation.refunded',
              'Donation refunded',
              JSON.stringify({ donation_id: donation.id, memorial_id: donation.memorial_id, amount_pesewas: donation.amount_pesewas }),
              Date.now()
            ).run()
          } catch (err) {
            console.error('donation-api admin_notifications insert (donation.refunded):', err)
          }

        } else if (event.event === 'charge.dispute.create') {
          const ref = event.data?.transaction?.reference || event.data?.reference
          await env.DB.prepare(
            `UPDATE donations SET status = 'disputed' WHERE paystack_reference = ? AND status = 'succeeded'`
          ).bind(ref).run()

          try {
            await env.DB.prepare(
              `INSERT INTO admin_notifications (type, title, detail, created_at) VALUES (?, ?, ?, ?)`
            ).bind('donation.disputed', 'Donation dispute opened', JSON.stringify({ reference: ref }), Date.now()).run()
          } catch (err) {
            console.error('donation-api admin_notifications insert (donation.disputed):', err)
          }
        }

        return new Response('ok', { status: 200 })
      }

      // Admin routes — RBAC gated
      if (path === '/admin/donations' && request.method === 'GET') {
        const a = await requireAdmin(request, env)
        if (a.error) return a.error

        const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200)
        const cursor = url.searchParams.get('cursor')
        const status = url.searchParams.get('status')

        let cursorTs
        if (cursor) {
          try { cursorTs = Number(atob(cursor)) } catch { return error('Invalid cursor', 400, request) }
          if (Number.isNaN(cursorTs)) return error('Invalid cursor', 400, request)
        } else {
          cursorTs = Date.now()
        }

        const conditions = ['created_at < ?']
        const args = [cursorTs]
        if (status) { conditions.push('status = ?'); args.push(status) }

        const result = await env.DB.prepare(
          `SELECT id, memorial_id, donor_display_name, amount_pesewas, tip_pesewas, display_currency,
                  display_amount_minor, status, created_at, succeeded_at, refunded_at, paystack_reference
           FROM donations WHERE ${conditions.join(' AND ')}
           ORDER BY created_at DESC LIMIT ?`
        ).bind(...args, limit + 1).all()

        const rows = result.results || []
        const nextCursor = rows.length > limit ? btoa(String(rows[limit - 1].created_at)) : null
        if (rows.length > limit) rows.length = limit

        return json({ donations: rows, next_cursor: nextCursor }, 200, request)
      }

      if (path === '/admin/memorials/donation' && request.method === 'GET') {
        const a = await requireAdmin(request, env)
        if (a.error) return a.error

        const result = await env.DB.prepare(
          `SELECT id, slug, family_head_name, family_head_phone, family_head_self_declared,
                  wall_mode, approval_status, total_raised_pesewas, total_donor_count, donation_paused,
                  created_at, approved_at
           FROM memorials WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 200`
        ).bind().all()

        return json({ memorials: result.results || [] }, 200, request)
      }

      const adminRefundMatch = path.match(/^\/admin\/donations\/([^/]+)\/refund$/)
      if (adminRefundMatch && request.method === 'POST') {
        const a = await requireAdmin(request, env)
        if (a.error) return a.error
        const donationId = adminRefundMatch[1]

        const d = await env.DB.prepare(
          `SELECT id, paystack_reference, status FROM donations WHERE id = ?`
        ).bind(donationId).first()
        if (!d) return error('Donation not found', 404, request)
        if (d.status !== 'succeeded') return error(`Cannot refund a ${d.status} donation`, 400, request)

        const result = await refundTransaction({
          secretKey: env.PAYSTACK_SECRET_KEY,
          transactionRef: d.paystack_reference,
        })
        if (!result.ok) return error(`Refund failed: ${result.message || 'unknown'}`, 502, request)

        // Optimistic audit; refund.processed webhook will flip the donation status.
        await logDonationAudit(env.DB, {
          donationId,
          actorUserId: a.userId,
          action: 'donation.refund_requested',
          detail: { initiated_at: Date.now() },
          ipAddress: getClientIP(request),
        })

        return json({ ok: true, refund_pending: true }, 200, request)
      }

      const claimMatch = path.match(/^\/donations\/([^/]+)\/claim$/)
      if (claimMatch && request.method === 'POST') {
        const donationId = claimMatch[1]
        const auth = await authenticate(request, env)
        if (!auth) return error('Auth required', 401, request)

        const body = await request.json().catch(() => ({}))
        const { claim_token } = body

        const donation = await env.DB.prepare(
          `SELECT id, donor_user_id, donor_email, amount_pesewas, status FROM donations WHERE id = ?`
        ).bind(donationId).first()

        if (!donation) return error('Donation not found', 404, request)
        if (donation.status !== 'succeeded') return error('Donation not yet completed', 400, request)

        // Already claimed?
        if (donation.donor_user_id) {
          if (String(donation.donor_user_id) === String(auth.sub)) {
            return json({ claimed: true, already: true }, 200, request)
          }
          return error('Donation already claimed', 409, request)
        }

        // Match by email (preferred) or claim_token (alternative)
        const userRow = await env.DB.prepare(`SELECT id, email FROM users WHERE id = ?`).bind(auth.sub).first()
        if (donation.donor_email && userRow?.email !== donation.donor_email && !claim_token) {
          return error('Donation email does not match your account', 403, request)
        }

        await env.DB.prepare(`UPDATE donations SET donor_user_id = ? WHERE id = ?`)
          .bind(auth.sub, donationId).run()

        await env.DB.prepare(
          `INSERT INTO donor_profiles (user_id, total_donated_pesewas, total_donations_count, last_donated_at, created_at, updated_at)
           VALUES (?, ?, 1, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             total_donated_pesewas = total_donated_pesewas + excluded.total_donated_pesewas,
             total_donations_count = total_donations_count + 1,
             last_donated_at = excluded.last_donated_at,
             updated_at = excluded.updated_at`
        ).bind(auth.sub, donation.amount_pesewas, Date.now(), Date.now(), Date.now()).run()

        return json({ claimed: true, donor_total_pesewas: donation.amount_pesewas }, 200, request)
      }

      const memorialMatch = path.match(/^\/memorials\/([^/]+)\/donation\/(init|approve|reject|settings|wall|totals|charge)$/)
      if (memorialMatch) {
        const [, memorialId, action] = memorialMatch

        if (action === 'init' && request.method === 'POST') {
          const auth = await authenticate(request, env)
          if (!auth) return error('Auth required', 401, request)

          const body = await request.json().catch(() => ({}))
          const {
            payout_momo_number,
            payout_momo_provider,
            payout_account_name,
            wall_mode,
            goal_amount_pesewas,
            family_head,
          } = body

          // Validation
          if (!payout_momo_number || !/^\+\d{6,15}$/.test(payout_momo_number)) {
            return error('Invalid payout MoMo number', 400, request)
          }
          if (!['mtn', 'vodafone', 'airteltigo'].includes(payout_momo_provider)) {
            return error('Invalid MoMo provider', 400, request)
          }
          if (!payout_account_name || payout_account_name.length > 100) {
            return error('Invalid account name', 400, request)
          }
          if (!['full', 'names_only', 'private'].includes(wall_mode)) {
            return error('Invalid wall_mode', 400, request)
          }
          if (goal_amount_pesewas !== undefined && goal_amount_pesewas !== null) {
            if (!Number.isInteger(goal_amount_pesewas) || goal_amount_pesewas < 100) {
              return error('Invalid goal amount', 400, request)
            }
          }
          if (!family_head || !['self', 'invite'].includes(family_head.mode)) {
            return error('Invalid family_head.mode', 400, request)
          }
          if (family_head.mode === 'invite' && !/^\+\d{6,15}$/.test(family_head.phone || '')) {
            return error('Invalid family_head.phone for invite mode', 400, request)
          }

          // Fetch memorial from KV; verify creator
          const kvRaw = await env.MEMORIAL_PAGES_KV.get(memorialId)
          if (!kvRaw) return error('Memorial not found', 404, request)
          let memorialData
          try { memorialData = JSON.parse(kvRaw) } catch { return error('Memorial corrupted', 500, request) }
          if (Number(memorialData.creator_user_id) !== Number(auth.sub)) {
            return error('Only the memorial creator can enable donations', 403, request)
          }

          // Verify MoMo with Paystack
          const resolved = await resolveAccount({
            secretKey: env.PAYSTACK_SECRET_KEY,
            momoNumber: payout_momo_number,
            providerCode: { mtn: 'MTN', vodafone: 'VOD', airteltigo: 'ATL' }[payout_momo_provider],
          })
          if (!resolved.ok) {
            return error('Could not verify MoMo number. Please check the number and provider.', 400, request)
          }

          // Create Paystack subaccount
          const sub = await createSubaccount({
            secretKey: env.PAYSTACK_SECRET_KEY,
            businessName: `${memorialData.deceased_name || 'Memorial'} Donations`,
            momoNumber: payout_momo_number,
            provider: payout_momo_provider,
            accountName: payout_account_name,
          })
          if (!sub.ok) {
            return error(`Could not create payout account: ${sub.error || 'unknown'}`, 502, request)
          }

          const now = Date.now()
          const slug = memorialData.slug || memorialId
          const sanitizedAccountName = sanitizeInput(payout_account_name)

          if (family_head.mode === 'self') {
            // Self-declared — immediate approval
            await env.DB.prepare(
              `INSERT INTO memorials (
                id, slug, creator_user_id, family_head_user_id, family_head_phone, family_head_name,
                family_head_self_declared, paystack_subaccount_code, payout_momo_number, payout_momo_provider,
                payout_account_name, wall_mode, goal_amount_pesewas, approval_status, approved_at, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              memorialId, slug, Number(auth.sub), Number(auth.sub),
              memorialData.creator_phone || null, memorialData.creator_name || null,
              1, sub.subaccount_code, payout_momo_number, payout_momo_provider,
              sanitizedAccountName, wall_mode, goal_amount_pesewas || null,
              'approved', now, now, now
            ).run()

            // Update KV cache
            memorialData.donation = {
              memorial_id: memorialId,
              enabled: true,
              wall_mode,
              goal_amount_pesewas: goal_amount_pesewas || null,
              total_raised_pesewas: 0,
              total_donor_count: 0,
              approval_status: 'approved',
            }
            await env.MEMORIAL_PAGES_KV.put(memorialId, JSON.stringify(memorialData))

            await logDonationAudit(env.DB, {
              memorialId,
              actorUserId: Number(auth.sub),
              action: 'family_head.self_declared',
              detail: {
                declared_name: payout_account_name,
                declared_phone: family_head.phone || null,
                wall_mode, goal_amount_pesewas,
              },
              ipAddress: getClientIP(request),
            })

            return json({
              memorial_id: memorialId,
              approval_status: 'approved',
              subaccount_code: sub.subaccount_code,
            }, 200, request)
          }

          // mode === 'invite'
          if (!family_head.name || family_head.name.length > 100) {
            return error('Invalid family_head.name', 400, request)
          }

          // Generate single-use approval token (JWT, scope='family_head_approval', 24h)
          const tokenPayload = {
            sub: family_head.phone,
            memorial_id: memorialId,
            scope: 'family_head_approval',
            jti: crypto.randomUUID(),
            exp: Math.floor(Date.now() / 1000) + 24 * 3600,
          }
          const approvalToken = await signJWT(tokenPayload, env.JWT_SECRET)

          // Hash for storage (so DB compromise doesn't expose token)
          const tokenHashBuf = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(approvalToken)
          )
          const tokenHash = Array.from(new Uint8Array(tokenHashBuf))
            .map(b => b.toString(16).padStart(2, '0')).join('')

          await env.DB.prepare(
            `INSERT INTO memorials (
              id, slug, creator_user_id, family_head_phone, family_head_name, family_head_self_declared,
              paystack_subaccount_code, payout_momo_number, payout_momo_provider, payout_account_name,
              wall_mode, goal_amount_pesewas, approval_status, approval_token_hash, approval_token_expires_at,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            memorialId, slug, Number(auth.sub),
            family_head.phone, sanitizeInput(family_head.name), 0,
            sub.subaccount_code, payout_momo_number, payout_momo_provider, sanitizedAccountName,
            wall_mode, goal_amount_pesewas || null,
            'pending', tokenHash, tokenPayload.exp * 1000,
            now, now
          ).run()

          // KV cache reflects pending state
          memorialData.donation = {
            memorial_id: memorialId,
            enabled: false,
            wall_mode,
            goal_amount_pesewas: goal_amount_pesewas || null,
            total_raised_pesewas: 0,
            total_donor_count: 0,
            approval_status: 'pending',
          }
          await env.MEMORIAL_PAGES_KV.put(memorialId, JSON.stringify(memorialData))

          // Send SMS via routed provider
          const { selectProvider } = await import('./utils/phoneRouter.js')
          const { sendHubtelSms } = await import('./utils/hubtel.js')
          const { sendTwilioSms } = await import('./utils/twilioVerify.js')

          let provider
          try { provider = selectProvider(family_head.phone) } catch { provider = null }
          if (!provider) return error('Invalid family head phone country code', 400, request)

          const approvalLink = `https://funeralpress.org/approve/${approvalToken}`
          const smsMessage = `${family_head.name}: You've been named family head for ${memorialData.deceased_name || 'a memorial'} on FuneralPress. Review and approve: ${approvalLink}`

          const sendResult = provider === 'hubtel'
            ? await sendHubtelSms({
                clientId: env.HUBTEL_CLIENT_ID,
                clientSecret: env.HUBTEL_CLIENT_SECRET,
                fromSenderId: env.HUBTEL_SENDER_ID,
                toE164: family_head.phone,
                message: smsMessage,
              })
            : await sendTwilioSms({
                accountSid: env.TWILIO_ACCOUNT_SID,
                authToken: env.TWILIO_AUTH_TOKEN,
                fromNumber: env.TWILIO_FROM_NUMBER,
                toE164: family_head.phone,
                message: smsMessage,
              })

          if (!sendResult.ok) {
            await logDonationAudit(env.DB, {
              memorialId, actorUserId: Number(auth.sub),
              action: 'family_head.invite_sms_failed',
              detail: { provider, error: sendResult.error },
              ipAddress: getClientIP(request),
            })
          }

          await logDonationAudit(env.DB, {
            memorialId, actorUserId: Number(auth.sub),
            action: 'family_head.invited',
            detail: { phone: family_head.phone, name: family_head.name, expires_at: tokenPayload.exp * 1000 },
            ipAddress: getClientIP(request),
          })

          return json({
            memorial_id: memorialId,
            approval_status: 'pending',
            invite_sent_to: family_head.phone,
            expires_at: tokenPayload.exp * 1000,
          }, 200, request)
        }

        if (action === 'approve' && request.method === 'POST') {
          const body = await request.json().catch(() => ({}))
          const { token, otp_code, phone } = body
          if (!token || !otp_code || !phone) return error('Missing fields', 400, request)

          const verification = await verifyApprovalRequest(env, request, memorialId, token, otp_code, phone)
          if (!verification.ok) return verification.response
          const { user } = verification

          const updateRes = await env.DB.prepare(
            `UPDATE memorials
             SET approval_status = 'approved',
                 approved_at = ?,
                 family_head_user_id = ?,
                 approval_token_hash = NULL,
                 updated_at = ?
             WHERE id = ? AND approval_status = 'pending'`
          ).bind(Date.now(), user.id, Date.now(), memorialId).run()

          if (updateRes.meta.changes !== 1) {
            return error('Memorial state changed; reload and try again', 409, request)
          }

          // Update KV cache
          const kvRaw = await env.MEMORIAL_PAGES_KV.get(memorialId)
          if (kvRaw) {
            const memData = JSON.parse(kvRaw)
            memData.donation = {
              ...(memData.donation || {}),
              enabled: true,
              approval_status: 'approved',
            }
            await env.MEMORIAL_PAGES_KV.put(memorialId, JSON.stringify(memData))
          }

          await logDonationAudit(env.DB, {
            memorialId,
            actorUserId: user.id,
            actorPhone: phone,
            action: 'memorial.approve',
            detail: {},
            ipAddress: getClientIP(request),
          })

          return json({ ok: true, approval_status: 'approved' }, 200, request)
        }

        if (action === 'totals' && request.method === 'GET') {
          const cacheKey = `wall:totals:${memorialId}`
          const cached = await env.MEMORIAL_PAGES_KV.get(cacheKey)
          if (cached) return json(JSON.parse(cached), 200, request)

          const row = await env.DB.prepare(
            `SELECT total_raised_pesewas, total_donor_count, goal_amount_pesewas, last_donation_at, wall_mode
             FROM memorials WHERE id = ? AND approval_status = 'approved' AND deleted_at IS NULL`
          ).bind(memorialId).first()

          if (!row) return error('Memorial not found', 404, request)

          const out = {
            total_raised_pesewas: row.total_raised_pesewas,
            total_donor_count: row.total_donor_count,
            goal_amount_pesewas: row.goal_amount_pesewas,
            last_donation_at: row.last_donation_at,
            wall_mode: row.wall_mode,
          }
          await env.MEMORIAL_PAGES_KV.put(cacheKey, JSON.stringify(out), { expirationTtl: 30 })
          return json(out, 200, request)
        }

        if (action === 'wall' && request.method === 'GET') {
          const cursor = url.searchParams.get('cursor') || null
          const limit = Math.min(parseInt(url.searchParams.get('limit')) || 20, 50)

          // Validate cursor early — return 400 for garbage rather than caching the noise
          let cursorTs
          if (cursor) {
            try { cursorTs = Number(atob(cursor)) } catch { return error('Invalid cursor', 400, request) }
            if (Number.isNaN(cursorTs)) return error('Invalid cursor', 400, request)
          } else {
            cursorTs = Date.now()
          }

          const cacheKey = `wall:list:${memorialId}:${cursor || 'start'}:${limit}`
          const cached = await env.MEMORIAL_PAGES_KV.get(cacheKey)
          if (cached) return json(JSON.parse(cached), 200, request)

          const memRow = await env.DB.prepare(
            `SELECT wall_mode, total_raised_pesewas, total_donor_count, goal_amount_pesewas
             FROM memorials WHERE id = ? AND approval_status = 'approved' AND deleted_at IS NULL`
          ).bind(memorialId).first()
          if (!memRow) return error('Memorial not found', 404, request)

          const wall_mode = memRow.wall_mode
          let donations = []
          let nextCursor = null

          if (wall_mode !== 'private') {
            const result = await env.DB.prepare(
              `SELECT id, donor_display_name, amount_pesewas, visibility, created_at
               FROM donations
               WHERE memorial_id = ? AND status = 'succeeded' AND created_at < ?
               ORDER BY created_at DESC LIMIT ?`
            ).bind(memorialId, cursorTs, limit + 1).all()

            const rows = result.results || []
            if (rows.length > limit) {
              const last = rows[limit - 1]
              nextCursor = btoa(String(last.created_at))
              rows.length = limit
            }

            donations = rows.map(r => {
              const isAnon = r.visibility === 'anonymous'
              const base = {
                id: r.id,
                display_name: isAnon ? 'Anonymous' : r.donor_display_name,
                created_at: r.created_at,
              }
              if (wall_mode === 'full' && !isAnon) {
                return { ...base, amount_pesewas: r.amount_pesewas }
              }
              return base
            })
          }

          const out = {
            wall_mode,
            total_raised_pesewas: memRow.total_raised_pesewas,
            total_donor_count: memRow.total_donor_count,
            goal_amount_pesewas: memRow.goal_amount_pesewas,
            donations,
            next_cursor: nextCursor,
          }
          await env.MEMORIAL_PAGES_KV.put(cacheKey, JSON.stringify(out), { expirationTtl: 30 })
          return json(out, 200, request)
        }

        if (action === 'charge' && request.method === 'POST') {
          // Per-IP and per-IP+memorial rate limits
          const ip = getClientIP(request)
          const ipKey = `donation:ip:10m:${ip}`
          const ipMemKey = `donation:ipmem:1h:${ip}:${memorialId}`
          const ipCount = parseInt(await env.RATE_LIMITS.get(ipKey)) || 0
          if (ipCount >= 5) return error('Too many donations from this network. Try again shortly.', 429, request)
          const ipMemCount = parseInt(await env.RATE_LIMITS.get(ipMemKey)) || 0
          if (ipMemCount >= 3) return error('Too many donations to this memorial from your network.', 429, request)

          const body = await request.json().catch(() => ({}))
          const {
            display_amount_minor,
            display_currency = 'GHS',
            tip_pesewas = 0,
            donor = {},
          } = body

          if (!Number.isInteger(display_amount_minor) || display_amount_minor < 100) {
            return error('Invalid amount', 400, request)
          }
          if (!/^[A-Z]{3}$/.test(display_currency)) return error('Invalid currency', 400, request)
          if (!Number.isInteger(tip_pesewas) || tip_pesewas < 0) return error('Invalid tip', 400, request)

          if (display_currency !== 'GHS' && !featureFlag(env, 'INTERNATIONAL_DONATIONS_ENABLED', true)) {
            return error('International donations temporarily unavailable', 503, request)
          }

          if (!donor.display_name || donor.display_name.length > 60) {
            return error('Invalid display name', 400, request)
          }
          if (containsProfanity(donor.display_name)) {
            return error('Please choose a different name.', 400, request)
          }
          if (!['public', 'anonymous'].includes(donor.visibility || 'public')) {
            return error('Invalid visibility', 400, request)
          }

          // Look up memorial
          const memRow = await env.DB.prepare(
            `SELECT id, paystack_subaccount_code, approval_status, donation_paused, wall_mode
             FROM memorials WHERE id = ? AND deleted_at IS NULL`
          ).bind(memorialId).first()
          if (!memRow) return error('Memorial not found', 404, request)
          if (memRow.approval_status !== 'approved') return error('Donations are not enabled for this memorial', 403, request)
          if (memRow.donation_paused) return error('Donations are paused for this memorial', 403, request)

          // FX
          let fxRate = 1
          let amountPesewas
          if (display_currency === 'GHS') {
            amountPesewas = display_amount_minor   // both pesewas
          } else {
            fxRate = await getFxRate(display_currency, env.RATE_LIMITS, env.OXR_APP_ID)
            if (!fxRate) return error('Currency conversion temporarily unavailable. Try GHS or try again shortly.', 503, request)
            // display_amount_minor in cents/pence; minor × (rate from-currency→GHS) gives GHS pesewas
            amountPesewas = Math.round(display_amount_minor * fxRate)
          }

          // Server-side tip validation: re-derive expected tip and allow ±1 pesewa drift; tolerate exact 0 (opt-out)
          const tipDefaultPercent = parseFloat(env.TIP_DEFAULT_PERCENT || '5')
          const expectedTip = Math.round(amountPesewas * tipDefaultPercent / 100)
          if (tip_pesewas !== 0 && Math.abs(tip_pesewas - expectedTip) > 1) {
            return error('Invalid tip amount', 400, request)
          }

          const totalChargePesewas = amountPesewas + tip_pesewas
          const donorEmail = donor.email && /\S+@\S+\.\S+/.test(donor.email) ? donor.email : null
          const synthEmail = donorEmail || `anon-${crypto.randomUUID()}@donations.funeralpress.org`

          const donationId = `don_${crypto.randomUUID()}`
          const reference = `FP_${donationId}`

          // Insert pending donation
          await env.DB.prepare(
            `INSERT INTO donations (
              id, memorial_id, donor_user_id, donor_display_name, donor_email, donor_phone,
              donor_country_code, visibility, amount_pesewas, tip_pesewas,
              display_currency, display_amount_minor, fx_rate_to_ghs,
              paystack_reference, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            donationId, memorialId, null,
            sanitizeInput(donor.display_name),
            donorEmail, donor.phone || null,
            donor.country_code || null, donor.visibility || 'public',
            amountPesewas, tip_pesewas,
            display_currency, display_amount_minor, fxRate,
            reference, 'pending', Date.now()
          ).run()

          // Initialise Paystack transaction with subaccount split
          const paystackRes = await initialiseTransaction({
            secretKey: env.PAYSTACK_SECRET_KEY,
            reference,
            amountPesewas: totalChargePesewas,
            email: synthEmail,
            subaccount: memRow.paystack_subaccount_code,
            bearer: 'subaccount',
            tipPesewas: tip_pesewas,
            metadata: {
              donation_id: donationId,
              memorial_id: memorialId,
              tip_pesewas,
              display_currency,
              display_amount_minor,
            },
          })

          if (!paystackRes.ok) {
            await env.DB.prepare(`UPDATE donations SET status = 'failed', failure_reason = ? WHERE id = ?`)
              .bind(paystackRes.error || 'paystack init failed', donationId).run()
            return error('Could not start payment. Please try again.', 502, request)
          }

          // Increment rate counters (post-success — we don't penalise donors for our errors)
          await env.RATE_LIMITS.put(ipKey, String(ipCount + 1), { expirationTtl: 600 })
          await env.RATE_LIMITS.put(ipMemKey, String(ipMemCount + 1), { expirationTtl: 3600 })

          return json({
            donation_id: donationId,
            paystack_reference: reference,
            authorization_url: paystackRes.authorization_url,
            amount_in_ghs_pesewas: amountPesewas,
            fx_rate_used: fxRate,
          }, 200, request)
        }

        if (action === 'settings' && request.method === 'PATCH') {
          const auth = await authenticate(request, env)
          if (!auth) return error('Auth required', 401, request)

          const memRow = await env.DB.prepare(
            `SELECT id, family_head_user_id, payout_momo_number FROM memorials WHERE id = ? AND deleted_at IS NULL`
          ).bind(memorialId).first()
          if (!memRow) return error('Memorial not found', 404, request)
          if (Number(memRow.family_head_user_id) !== Number(auth.sub)) {
            return error('Only the family head can change settings', 403, request)
          }

          const body = await request.json().catch(() => ({}))
          const updates = []
          const args = []
          const kvUpdates = {}

          if (body.wall_mode !== undefined) {
            if (!['full', 'names_only', 'private'].includes(body.wall_mode)) {
              return error('Invalid wall_mode', 400, request)
            }
            updates.push('wall_mode = ?'); args.push(body.wall_mode)
            kvUpdates.wall_mode = body.wall_mode
            await logDonationAudit(env.DB, {
              memorialId, actorUserId: Number(auth.sub),
              action: 'memorial.wall_mode_changed',
              detail: { new_mode: body.wall_mode },
              ipAddress: getClientIP(request),
            })
          }
          if (body.goal_amount_pesewas !== undefined) {
            if (body.goal_amount_pesewas !== null) {
              if (!Number.isInteger(body.goal_amount_pesewas) || body.goal_amount_pesewas < 100) {
                return error('Invalid goal', 400, request)
              }
            }
            updates.push('goal_amount_pesewas = ?'); args.push(body.goal_amount_pesewas)
            kvUpdates.goal_amount_pesewas = body.goal_amount_pesewas
          }
          if (body.donation_paused !== undefined) {
            updates.push('donation_paused = ?'); args.push(body.donation_paused ? 1 : 0)
            await logDonationAudit(env.DB, {
              memorialId, actorUserId: Number(auth.sub),
              action: 'memorial.pause',
              detail: { paused: !!body.donation_paused },
              ipAddress: getClientIP(request),
            })
          }

          if (body.payout_momo_number || body.payout_momo_provider || body.payout_account_name) {
            if (!body.otp_code || !body.phone) {
              return error('Changing payout requires fresh OTP verification', 401, request, 'otp_required')
            }
            const otpRow = await env.DB.prepare(
              `SELECT id, code_hash, expires_at, attempts, consumed_at
               FROM phone_otps
               WHERE phone_e164 = ? AND purpose = 'link' AND consumed_at IS NULL
               ORDER BY created_at DESC LIMIT 1`
            ).bind(body.phone).first()
            if (!otpRow) return error('No verification code pending', 401, request)
            if (otpRow.expires_at < Date.now()) return error('Code expired', 401, request)
            if (otpRow.attempts >= 5) return error('Too many wrong attempts', 429, request)

            const codeOk = await verifyOtp(body.otp_code, otpRow.code_hash, env.OTP_PEPPER)
            if (!codeOk) {
              await env.DB.prepare(`UPDATE phone_otps SET attempts = attempts + 1 WHERE id = ?`).bind(otpRow.id).run()
              return error('Wrong code', 401, request)
            }
            await env.DB.prepare(`UPDATE phone_otps SET consumed_at = ? WHERE id = ?`).bind(Date.now(), otpRow.id).run()

            const effectiveAt = Date.now() + 24 * 3600 * 1000
            updates.push(
              'pending_payout_momo_number = ?',
              'pending_payout_momo_provider = ?',
              'pending_payout_account_name = ?',
              'pending_payout_effective_at = ?'
            )
            args.push(
              body.payout_momo_number,
              body.payout_momo_provider,
              sanitizeInput(body.payout_account_name || ''),
              effectiveAt
            )

            await logDonationAudit(env.DB, {
              memorialId, actorUserId: Number(auth.sub),
              action: 'memorial.payout_changed',
              detail: {
                old_number_masked: maskMomo(memRow.payout_momo_number),
                new_number_masked: maskMomo(body.payout_momo_number),
                effective_at: effectiveAt,
              },
              ipAddress: getClientIP(request),
            })
          }

          if (updates.length === 0) return error('No updates provided', 400, request)
          updates.push('updated_at = ?'); args.push(Date.now())
          args.push(memorialId)

          await env.DB.prepare(`UPDATE memorials SET ${updates.join(', ')} WHERE id = ?`).bind(...args).run()

          if (Object.keys(kvUpdates).length > 0) {
            const kvRaw = await env.MEMORIAL_PAGES_KV.get(memorialId)
            if (kvRaw) {
              const memData = JSON.parse(kvRaw)
              memData.donation = { ...(memData.donation || {}), ...kvUpdates }
              await env.MEMORIAL_PAGES_KV.put(memorialId, JSON.stringify(memData))
            }
          }

          return json({ ok: true }, 200, request)
        }

        if (action === 'reject' && request.method === 'POST') {
          const body = await request.json().catch(() => ({}))
          const { token, otp_code, phone, reason } = body
          if (!token || !otp_code || !phone) return error('Missing fields', 400, request)
          if (reason && reason.length > 500) return error('Reason too long', 400, request)

          const verification = await verifyApprovalRequest(env, request, memorialId, token, otp_code, phone)
          if (!verification.ok) return verification.response

          await env.DB.prepare(
            `UPDATE memorials
             SET approval_status = 'rejected',
                 rejected_at = ?,
                 rejection_reason = ?,
                 approval_token_hash = NULL,
                 updated_at = ?
             WHERE id = ? AND approval_status = 'pending'`
          ).bind(Date.now(), sanitizeInput(reason || ''), Date.now(), memorialId).run()

          const kvRaw = await env.MEMORIAL_PAGES_KV.get(memorialId)
          if (kvRaw) {
            const memData = JSON.parse(kvRaw)
            memData.donation = { ...(memData.donation || {}), enabled: false, approval_status: 'rejected' }
            await env.MEMORIAL_PAGES_KV.put(memorialId, JSON.stringify(memData))
          }

          await logDonationAudit(env.DB, {
            memorialId, actorPhone: phone,
            action: 'memorial.reject',
            detail: { reason: reason || null },
            ipAddress: getClientIP(request),
          })

          return json({ ok: true, approval_status: 'rejected' }, 200, request)
        }
      }

      return error('Not found', 404, request)
    } catch (err) {
      console.error('donation-api unhandled', err)
      return error('Internal error', 500, request)
    }
  },

  async scheduled(event, env, ctx) {
    if (!featureFlag(env, 'RECONCILIATION_ENABLED')) return
    ctx.waitUntil(reconcileDay(env))
    ctx.waitUntil(activatePendingMomoChanges(env))
  },
}

export default Sentry.withSentry(
  (env) => ({
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT || 'production',
    tracesSampleRate: 0.1,
  }),
  handler
)

// Daily safety net — pulls Paystack transactions for the last 24h and
// reconciles against our donations table to catch dropped webhooks.
// Exported for direct testing.
export async function reconcileDay(env) {
  const to = Date.now()
  const from = to - 24 * 3600 * 1000

  const result = await listTransactions({
    secretKey: env.PAYSTACK_SECRET_KEY,
    fromTimestamp: from,
    toTimestamp: to,
    perPage: 100,
  })
  if (!result.ok) {
    console.error('Reconciliation: Paystack list failed', result.message)
    return
  }

  const paystackByRef = new Map()
  for (const t of result.data || []) {
    paystackByRef.set(t.reference, t)
  }

  const ours = await env.DB.prepare(
    `SELECT id, paystack_reference, status, memorial_id, amount_pesewas FROM donations WHERE created_at >= ? AND created_at < ?`
  ).bind(from, to).all()

  let mismatches = 0
  for (const row of ours.results || []) {
    const ps = paystackByRef.get(row.paystack_reference)

    if (!ps) {
      if (row.status === 'pending') {
        await env.DB.prepare(`UPDATE donations SET status = 'failed', failure_reason = ? WHERE id = ?`)
          .bind('reconciliation: not found at Paystack', row.id).run()
        mismatches++
      }
      continue
    }

    if (ps.status === 'success' && row.status === 'pending') {
      // Webhook missed — promote and update memorial totals
      await env.DB.prepare(
        `UPDATE donations SET status = 'succeeded', succeeded_at = ?, paystack_fee_pesewas = ?, paystack_transaction_id = ? WHERE id = ?`
      ).bind(Date.now(), ps.fees || 0, String(ps.id || ''), row.id).run()

      await env.DB.prepare(
        `UPDATE memorials
         SET total_raised_pesewas = total_raised_pesewas + ?,
             total_donor_count = total_donor_count + 1,
             last_donation_at = ?,
             updated_at = ?
         WHERE id = ?`
      ).bind(row.amount_pesewas, Date.now(), Date.now(), row.memorial_id).run()

      try { await env.MEMORIAL_PAGES_KV.delete(`wall:totals:${row.memorial_id}`) } catch (err) {
        console.error('donation-api wall:totals KV invalidate (reconciliation):', err)
      }
      mismatches++
    }
  }

  if (mismatches > 0) {
    try {
      await env.DB.prepare(
        `INSERT INTO admin_notifications (type, title, detail, created_at) VALUES (?, ?, ?, ?)`
      ).bind(
        'reconciliation.mismatches',
        `Reconciliation found ${mismatches} mismatches`,
        JSON.stringify({ from, to, count: mismatches }),
        Date.now()
      ).run()
    } catch (err) {
      console.error('donation-api admin_notifications insert (reconciliation.mismatches):', err)
    }
  }
}

// Promotes any pending payout MoMo changes whose 24h cool-down has elapsed.
// Exported for direct testing. In production this would also call Paystack
// to update the subaccount's account_number — left for follow-up.
export async function activatePendingMomoChanges(env) {
  const due = await env.DB.prepare(
    `SELECT id, pending_payout_momo_number, pending_payout_momo_provider, pending_payout_account_name
     FROM memorials
     WHERE pending_payout_effective_at IS NOT NULL AND pending_payout_effective_at <= ?`
  ).bind(Date.now()).all()

  for (const m of due.results || []) {
    await env.DB.prepare(
      `UPDATE memorials
       SET payout_momo_number = ?, payout_momo_provider = ?, payout_account_name = ?,
           pending_payout_momo_number = NULL, pending_payout_momo_provider = NULL,
           pending_payout_account_name = NULL, pending_payout_effective_at = NULL,
           updated_at = ?
       WHERE id = ?`
    ).bind(
      m.pending_payout_momo_number,
      m.pending_payout_momo_provider,
      m.pending_payout_account_name,
      Date.now(),
      m.id
    ).run()

    await logDonationAudit(env.DB, {
      memorialId: m.id,
      action: 'memorial.payout_changed',
      detail: { stage: 'cooldown_complete' },
    })
  }
}

// Sends a donation receipt via Resend and stamps receipt_sent_at.
// Exported for direct testing; in production it runs inside ctx.waitUntil
// so receipt failure never blocks the webhook ack to Paystack.
export async function queueDonationReceipt(env, donationId) {
  if (!env.RESEND_API_KEY) return

  try {
    const d = await env.DB.prepare(
      `SELECT d.id, d.donor_email, d.donor_display_name, d.display_amount_minor, d.display_currency,
              d.amount_pesewas, d.tip_pesewas, d.created_at, d.paystack_reference,
              m.id as memorial_id, m.slug
       FROM donations d JOIN memorials m ON m.id = d.memorial_id
       WHERE d.id = ?`
    ).bind(donationId).first()
    if (!d || !d.donor_email) return

    const kvRaw = await env.MEMORIAL_PAGES_KV.get(d.memorial_id)
    const deceasedName = (kvRaw && JSON.parse(kvRaw).deceased_name) || 'Memorial'

    const subject = `Your donation to ${deceasedName}'s memorial`
    const total = (d.display_amount_minor / 100).toFixed(2)
    const tip = (d.tip_pesewas / 100).toFixed(2)
    const html = `
      <p>Thank you, ${d.donor_display_name}, for honouring ${deceasedName}'s memory.</p>
      <p><strong>Your donation:</strong> ${d.display_currency} ${total}</p>
      ${Number(tip) > 0 ? `<p><strong>Platform tip:</strong> GHS ${tip}</p>` : ''}
      <p>Reference: ${d.paystack_reference}</p>
      <p>This is a confirmation of payment, not a tax receipt.</p>
      <p><a href="https://funeralpress.org/m/${d.slug}">View memorial</a></p>
    `

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'donations@funeralpress.org',
        to: d.donor_email,
        subject,
        html,
      }),
    })

    await env.DB.prepare(`UPDATE donations SET receipt_sent_at = ? WHERE id = ?`)
      .bind(Date.now(), donationId).run()
  } catch (e) {
    console.error('queueDonationReceipt failed', e)
  }
}
