// FuneralPress Donation API Worker
// Owns: donations, donor wall, family-head approval, Paystack webhooks.
// Bindings: DB (D1), MEMORIAL_PAGES_KV, RATE_LIMITS, OTP_KV
// Secrets: PAYSTACK_SECRET_KEY, PAYSTACK_WEBHOOK_SECRET, JWT_SECRET, OTP_PEPPER,
//          TERMII_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER,
//          RESEND_API_KEY, OXR_APP_ID

import { withSecurityHeaders } from './utils/securityHeaders.js'
import { sanitizeInput } from './utils/sanitize.js'
import { logDonationAudit, getClientIP } from './utils/auditLog.js'
import { verifyJWT, signJWT } from './utils/jwt.js'
import { featureFlag } from './utils/featureFlag.js'
import { createSubaccount, resolveAccount } from './utils/paystack.js'
import { verifyOtp } from './utils/otp.js'

const ALLOWED_ORIGINS = [
  'https://funeral-brochure-app.pages.dev',
  'https://funeralpress.org',
  'https://www.funeralpress.org',
  'http://localhost:5173',
  'http://localhost:4173',
]

function corsOrigin(req) {
  const o = req.headers.get('Origin') || ''
  if (ALLOWED_ORIGINS.includes(o) || o.endsWith('.funeral-brochure-app.pages.dev')) return o
  return ALLOWED_ORIGINS[0]
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

export default {
  async fetch(request, env, ctx) {
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
          const { sendTermiiSms } = await import('./utils/termii.js')
          const { sendTwilioSms } = await import('./utils/twilioVerify.js')

          let provider
          try { provider = selectProvider(family_head.phone) } catch { provider = null }
          if (!provider) return error('Invalid family head phone country code', 400, request)

          const approvalLink = `https://funeralpress.org/approve/${approvalToken}`
          const smsMessage = `${family_head.name}: You've been named family head for ${memorialData.deceased_name || 'a memorial'} on FuneralPress. Review and approve: ${approvalLink}`

          const sendResult = provider === 'termii'
            ? await sendTermiiSms({ apiKey: env.TERMII_API_KEY, toE164: family_head.phone, message: smsMessage })
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
    // Reconciliation logic added in Task 27
  },
}
