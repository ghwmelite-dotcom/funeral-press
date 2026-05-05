import * as Sentry from '@sentry/cloudflare'
import { checkRateLimit, getRouteGroup } from './utils/rateLimiter.js'
import { sanitizeInput } from './utils/sanitize.js'
import { withSecurityHeaders } from './utils/securityHeaders.js'
import { logAudit, getClientIP } from './utils/auditLog.js'
import { signJWT, verifyJWT } from './utils/jwt.js'
import { generateOtp, hashOtp, verifyOtp } from './utils/otp.js'
import { selectProvider } from './utils/phoneRouter.js'
import { sendTermiiOtp } from './utils/termii.js'
import { sendTwilioOtp } from './utils/twilioVerify.js'
import { featureFlag } from './utils/featureFlag.js'
import { runDunningCron } from './utils/dunning.js'

// FuneralPress Auth API Worker
// Bindings: DB (D1), IMAGES (R2), JWT_SECRET (secret), GOOGLE_CLIENT_ID (var)

const PROD_ORIGINS = [
  'https://funeral-brochure-app.pages.dev',
  'https://funeralpress.org',
  'https://www.funeralpress.org',
]
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4173']

function allowedOrigins(env) {
  return env?.ENVIRONMENT === 'dev' ? [...PROD_ORIGINS, ...DEV_ORIGINS] : PROD_ORIGINS
}

function getCorsOrigin(request) {
  const origin = request.headers.get('Origin') || ''
  const env = request.__env
  // Allow any *.funeral-brochure-app.pages.dev preview URL
  if (allowedOrigins(env).includes(origin) || origin.endsWith('.funeral-brochure-app.pages.dev')) {
    return origin
  }
  return PROD_ORIGINS[0]
}

function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(request),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

function error(message, status = 400, request) {
  return json({ error: message }, status, request)
}

// ─── Google ID token verification via JWKS ──────────────────────────────────

let cachedGoogleKeys = null
let cachedGoogleKeysAt = 0

async function getGooglePublicKeys() {
  if (cachedGoogleKeys && Date.now() - cachedGoogleKeysAt < 3600000) return cachedGoogleKeys
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs')
  const data = await res.json()
  cachedGoogleKeys = data.keys
  cachedGoogleKeysAt = Date.now()
  return cachedGoogleKeys
}

async function verifyGoogleIdToken(idToken, clientId) {
  const parts = idToken.split('.')
  if (parts.length !== 3) return { error: 'Token is not a valid JWT (wrong number of parts)' }

  const [headerB64, payloadB64, sigB64] = parts

  let header, payload
  try {
    header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')))
    payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
  } catch (e) {
    return { error: `Failed to decode token: ${e.message}` }
  }

  // Check claims
  if (payload.aud !== clientId) {
    return { error: `Audience mismatch: token aud=${payload.aud}, expected=${clientId}` }
  }
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) {
    return { error: `Invalid issuer: ${payload.iss}` }
  }
  if (payload.exp < Date.now() / 1000) {
    return { error: 'Token expired' }
  }

  // Verify signature with Google's public key
  let keys
  try {
    keys = await getGooglePublicKeys()
  } catch (e) {
    return { error: `Failed to fetch Google JWKS: ${e.message}` }
  }

  const jwk = keys.find(k => k.kid === header.kid)
  if (!jwk) {
    return { error: `No matching Google key for kid=${header.kid}` }
  }

  try {
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    const sig = Uint8Array.from(atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    const enc = new TextEncoder()
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, enc.encode(`${headerB64}.${payloadB64}`))
    if (!valid) return { error: 'Signature verification failed' }
  } catch (e) {
    return { error: `Signature verification error: ${e.message}` }
  }

  return { payload }
}

// ─── Auth middleware ─────────────────────────────────────────────────────────

async function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  return verifyJWT(token, env.JWT_SECRET)
}

function generateId() {
  return crypto.randomUUID()
}

async function hashToken(token) {
  const enc = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(token))
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function randomHex(bytes = 64) {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I
  const arr = new Uint8Array(8)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => chars[b % chars.length]).join('')
}

// ─── Super admin ─────────────────────────────────────────────────────────────

const SUPER_ADMINS = ['oh84dev@gmail.com', 'oh84dev@funeralpress.org', 'funeralpress.org@gmail.com']

/**
 * True if userEmail is in the hardcoded super-admin list.
 * Super admins can do everything regular admins can, PLUS grant/revoke admin role.
 */
function isSuperAdmin(userEmail) {
  return SUPER_ADMINS.includes(userEmail)
}

/**
 * True if user has the 'admin' role in user_roles table (DB-managed).
 */
async function hasAdminRole(userId, env) {
  const row = await env.DB.prepare(
    `SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND r.name = 'admin'`
  ).bind(userId).first()
  return !!row
}

/**
 * True if user is either a super admin or has admin role.
 */
async function isAdmin(userId, userEmail, env) {
  if (isSuperAdmin(userEmail)) return true
  return await hasAdminRole(userId, env)
}

// ─── Admin notification helpers ─────────────────────────────────────────────

const ADMIN_EMAIL = 'oh84dev@funeralpress.org'

const EMAIL_EVENTS = new Set([
  'signup', 'payment', 'print_order', 'partner_app',
  'guest_book_sign', 'memorial_created', 'live_service_created',
])

async function notifyAdmin(env, type, title, detail = {}) {
  const detailJson = JSON.stringify(detail)
  try {
    await env.DB.prepare(
      `INSERT INTO admin_notifications (type, title, detail) VALUES (?, ?, ?)`
    ).bind(type, title, detailJson).run()
  } catch (e) {
    console.error('Notification insert failed:', e.message)
  }
  if (EMAIL_EVENTS.has(type) && env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'FuneralPress <notifications@funeralpress.org>',
          to: [ADMIN_EMAIL],
          subject: `[FuneralPress] ${title}`,
          text: `${title}\n\nDetails:\n${Object.entries(detail).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n\nTime: ${new Date().toISOString()}\n\nView dashboard: https://funeralpress.org/admin`,
        }),
      })
    } catch (e) {
      console.error('Resend email failed:', e.message)
    }
  }
}

async function requireAdmin(request, env) {
  const jwtPayload = await authenticate(request, env)
  if (!jwtPayload) return { error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders(request) } }) }
  const user = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(jwtPayload.sub).first()
  if (!user) {
    return { error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders(request) } }) }
  }
  const allowed = await isAdmin(jwtPayload.sub, user.email, env)
  if (!allowed) {
    return { error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders(request) } }) }
  }
  return { userId: jwtPayload.sub, email: user.email, isSuperAdmin: isSuperAdmin(user.email) }
}

/**
 * Stricter check — only super admins (hardcoded list) pass.
 * Use for endpoints that manage other admins.
 */
async function requireSuperAdmin(request, env) {
  const jwtPayload = await authenticate(request, env)
  if (!jwtPayload) return { error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders(request) } }) }
  const user = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(jwtPayload.sub).first()
  if (!user || !isSuperAdmin(user.email)) {
    return { error: new Response(JSON.stringify({ error: 'Super admin only' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders(request) } }) }
  }
  return { userId: jwtPayload.sub, email: user.email }
}

// ─── Payment constants ───────────────────────────────────────────────────────

const PLANS = {
  single: { amount: 3500, credits: 1 },
  bundle: { amount: 7500, credits: 3 },
  suite:  { amount: 12000, credits: -1 }, // -1 = unlimited
  bulk10: { amount: 25000, credits: 10, institutional: true },
  bulk25: { amount: 50000, credits: 25, institutional: true },
  bulk50: { amount: 80000, credits: 50, institutional: true },
}

// ─── Print fulfillment pricing ──────────────────────────────────────────────

const PRINT_PRICING = {
  brochure: {
    label: 'Brochure',
    min: 10,
    sizes: {
      A5:  { base: 1000, label: 'A5 (folded)' },
      A4:  { base: 1500, label: 'A4 (folded)' },
      A3:  { base: 2500, label: 'A3 (folded)' },
    },
    defaultSize: 'A4',
  },
  poster: {
    label: 'Poster',
    min: 5,
    sizes: {
      A3:  { base: 1800, label: 'A3 (29.7 x 42cm)' },
      A2:  { base: 3000, label: 'A2 (42 x 59.4cm)' },
      A1:  { base: 5500, label: 'A1 (59.4 x 84.1cm)' },
      A0:  { base: 9000, label: 'A0 (84.1 x 118.9cm)' },
    },
    defaultSize: 'A2',
  },
  invitation: {
    label: 'Invitation Card',
    min: 20,
    sizes: {
      A6:  { base: 600,  label: 'A6 (10.5 x 14.8cm)' },
      A5:  { base: 800,  label: 'A5 (14.8 x 21cm)' },
    },
    defaultSize: 'A5',
  },
  booklet: {
    label: 'Programme Booklet',
    min: 10,
    sizes: {
      A5:  { base: 4000, label: 'A5 (14.8 x 21cm)' },
      A4:  { base: 6000, label: 'A4 (21 x 29.7cm)' },
    },
    defaultSize: 'A5',
  },
  banner: {
    label: 'Banner',
    min: 1,
    sizes: {
      '3x6':  { base: 6000,  label: 'Small (3 x 6 ft)' },
      '4x8':  { base: 8000,  label: 'Medium (4 x 8 ft)' },
      '5x10': { base: 12000, label: 'Large (5 x 10 ft)' },
    },
    defaultSize: '4x8',
  },
  thankYou: {
    label: 'Thank You Card',
    min: 20,
    sizes: {
      A7:  { base: 400, label: 'A7 (7.4 x 10.5cm)' },
      A6:  { base: 600, label: 'A6 (10.5 x 14.8cm)' },
      A5:  { base: 900, label: 'A5 (14.8 x 21cm)' },
    },
    defaultSize: 'A6',
  },
}
const PAPER_MULTIPLIER = { standard: 1.0, premium: 1.5 }
const QUANTITY_TIERS = [
  { min: 1, max: 24, discount: 0 },
  { min: 25, max: 49, discount: 0.10 },
  { min: 50, max: 99, discount: 0.15 },
  { min: 100, max: 9999, discount: 0.20 },
]
const DELIVERY_FEES = {
  'greater-accra': 2000, 'ashanti': 3500, 'western': 4000,
  'eastern': 3500, 'central': 3500, 'volta': 4500,
  'northern': 5500, 'upper-east': 6000, 'upper-west': 6000,
  'bono': 4500, 'bono-east': 4500, 'ahafo': 4500,
  'western-north': 4500, 'oti': 5000, 'north-east': 5500, 'savannah': 5500,
}
const INSTITUTIONAL_PRINT_DISCOUNT = 0.15

function calculatePrintPrice(productType, quantity, paperQuality, deliveryRegion, size, institutionalDiscount = 0) {
  const product = PRINT_PRICING[productType]
  if (!product || quantity < product.min) return null
  const sizeKey = size || product.defaultSize
  const sizeInfo = product.sizes[sizeKey]
  if (!sizeInfo) return null
  const qualityMult = PAPER_MULTIPLIER[paperQuality] || 1.0
  const tier = QUANTITY_TIERS.find(t => quantity >= t.min && quantity <= t.max)
  const discount = tier ? tier.discount : 0.20
  const perUnit = Math.round(sizeInfo.base * qualityMult * (1 - discount) * (1 - institutionalDiscount))
  const printCost = perUnit * quantity
  const deliveryFee = DELIVERY_FEES[deliveryRegion] || 4000
  return { perUnit, printCost, deliveryFee, total: printCost + deliveryFee, discount: Math.round(discount * 100), minQuantity: product.min, size: sizeKey, sizeLabel: sizeInfo.label }
}

// ─── Payment helpers ────────────────────────────────────────────────────────

// ─── Route handlers ─────────────────────────────────────────────────────────

async function handleGoogleLogin(request, env) {
  const body = await request.json()
  const { credential } = body
  if (!credential) return error('Missing credential', 400, request)

  const result = await verifyGoogleIdToken(credential, env.GOOGLE_CLIENT_ID)
  if (result.error) {
    return error(result.error, 401, request)
  }
  const googleUser = result.payload

  // Upsert user
  let user = await env.DB.prepare('SELECT * FROM users WHERE google_id = ?').bind(googleUser.sub).first()
  let isNewUser = false
  if (!user) {
    isNewUser = true
    user = {
      id: generateId(),
      google_id: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
    }
    await env.DB.prepare('INSERT INTO users (id, google_id, email, name, picture) VALUES (?, ?, ?, ?, ?)')
      .bind(user.id, user.google_id, user.email, user.name, user.picture).run()
  } else {
    await env.DB.prepare("UPDATE users SET name = ?, picture = ?, email = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(googleUser.name, googleUser.picture, googleUser.email, user.id).run()
    user.name = googleUser.name
    user.picture = googleUser.picture
    user.email = googleUser.email
  }

  // Issue JWT (1hr)
  const accessToken = await signJWT({ sub: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 3600 }, env.JWT_SECRET)

  // Issue refresh token (30 days)
  const refreshRaw = randomHex(64)
  const refreshHash = await hashToken(refreshRaw)
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
  await env.DB.prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .bind(generateId(), user.id, refreshHash, expiresAt).run()

  const purchaseData = await getUserPurchaseData(env, user.id)

  if (isNewUser) {
    notifyAdmin(env, 'signup', `New user signed up: ${googleUser.name}`, { email: googleUser.email, name: googleUser.name })
  }

  const hasAdminPriv = await isAdmin(user.id, user.email, env)
  return json({
    user: {
      id: user.id, email: user.email, name: user.name, picture: user.picture,
      isPartner: !!(user.is_partner), referralCode: user.referral_code || null,
      partnerType: user.partner_type || null, partnerLogoUrl: user.partner_logo_url || null, partnerDenomination: user.partner_denomination || null,
      isAdmin: hasAdminPriv,
      isSuperAdmin: isSuperAdmin(user.email),
      credits: purchaseData.credits,
      isUnlimited: purchaseData.isUnlimited,
      unlockedDesigns: purchaseData.unlockedDesigns,
    },
    accessToken,
    refreshToken: refreshRaw,
  }, 200, request)
}

async function handleRefresh(request, env) {
  const { refreshToken } = await request.json()
  if (!refreshToken) return error('Missing refresh token', 400, request)

  const tokenHash = await hashToken(refreshToken)
  const row = await env.DB.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').bind(tokenHash).first()
  if (!row) return error('Invalid refresh token', 401, request)
  if (new Date(row.expires_at) < new Date()) {
    await env.DB.prepare('DELETE FROM refresh_tokens WHERE id = ?').bind(row.id).run()
    return error('Refresh token expired', 401, request)
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(row.user_id).first()
  if (!user) return error('User not found', 404, request)

  // Rotate refresh token
  await env.DB.prepare('DELETE FROM refresh_tokens WHERE id = ?').bind(row.id).run()
  const newRefreshRaw = randomHex(64)
  const newRefreshHash = await hashToken(newRefreshRaw)
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
  await env.DB.prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .bind(generateId(), user.id, newRefreshHash, expiresAt).run()

  const accessToken = await signJWT({ sub: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 3600 }, env.JWT_SECRET)

  const purchaseData = await getUserPurchaseData(env, user.id)

  const hasAdminPriv = await isAdmin(user.id, user.email, env)
  return json({
    user: {
      id: user.id, email: user.email, name: user.name, picture: user.picture,
      isPartner: !!(user.is_partner), referralCode: user.referral_code || null,
      partnerType: user.partner_type || null, partnerLogoUrl: user.partner_logo_url || null, partnerDenomination: user.partner_denomination || null,
      isAdmin: hasAdminPriv,
      isSuperAdmin: isSuperAdmin(user.email),
      credits: purchaseData.credits,
      isUnlimited: purchaseData.isUnlimited,
      unlockedDesigns: purchaseData.unlockedDesigns,
    },
    accessToken,
    refreshToken: newRefreshRaw,
  }, 200, request)
}

async function handleLogout(request, env, userId) {
  const { refreshToken } = await request.json().catch(() => ({}))
  if (refreshToken) {
    const tokenHash = await hashToken(refreshToken)
    await env.DB.prepare('DELETE FROM refresh_tokens WHERE token_hash = ? AND user_id = ?').bind(tokenHash, userId).run()
  }
  return json({ ok: true }, 200, request)
}

async function handleGetMe(request, env, userId) {
  const user = await env.DB.prepare('SELECT id, email, name, picture, is_partner, referral_code, partner_name, partner_type, partner_logo_url, partner_denomination, onboarded_at FROM users WHERE id = ? AND deleted_at IS NULL').bind(userId).first()
  if (!user) return error('User not found', 404, request)
  const purchaseData = await getUserPurchaseData(env, userId)
  const hasAdminPriv = await isAdmin(userId, user.email, env)
  return json({
    user: {
      id: user.id, email: user.email, name: user.name, picture: user.picture,
      isPartner: !!(user.is_partner), referralCode: user.referral_code || null, partnerName: user.partner_name || null,
      partnerType: user.partner_type || null, partnerLogoUrl: user.partner_logo_url || null, partnerDenomination: user.partner_denomination || null,
      isAdmin: hasAdminPriv,
      isSuperAdmin: isSuperAdmin(user.email),
      credits: purchaseData.credits,
      isUnlimited: purchaseData.isUnlimited,
      unlockedDesigns: purchaseData.unlockedDesigns,
      onboarded_at: user.onboarded_at || null,
    },
  }, 200, request)
}

async function handleMarkOnboarded(request, env, userId) {
  const now = new Date().toISOString()
  await env.DB.prepare('UPDATE users SET onboarded_at = ? WHERE id = ? AND deleted_at IS NULL')
    .bind(now, userId).run()
  return json({ ok: true, onboarded_at: now }, 200, request)
}

// ─── Design CRUD ────────────────────────────────────────────────────────────

async function handleListDesigns(request, env, userId) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  let rows
  if (type) {
    rows = await env.DB.prepare('SELECT id, product_type, name, updated_at FROM designs WHERE user_id = ? AND product_type = ? AND deleted_at IS NULL ORDER BY updated_at DESC')
      .bind(userId, type).all()
  } else {
    rows = await env.DB.prepare('SELECT id, product_type, name, updated_at FROM designs WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC')
      .bind(userId).all()
  }
  return json({ designs: rows.results }, 200, request)
}

async function handleUpsertDesign(request, env, userId, designId) {
  const { product_type, name, data, updated_at } = await request.json()
  if (!product_type || !data) return error('Missing product_type or data', 400, request)

  const safeName = sanitizeInput(name)
  const updatedAt = updated_at || new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO designs (id, user_id, product_type, name, data, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, data = excluded.data, updated_at = excluded.updated_at`
  ).bind(designId, userId, product_type, safeName || 'Untitled', typeof data === 'string' ? data : JSON.stringify(data), updatedAt).run()

  return json({ ok: true, id: designId }, 200, request)
}

async function handleGetDesign(request, env, userId, designId) {
  const row = await env.DB.prepare('SELECT id, product_type, name, data, updated_at FROM designs WHERE id = ? AND user_id = ?')
    .bind(designId, userId).first()
  if (!row) return error('Design not found', 404, request)
  let data = row.data
  try { data = JSON.parse(data) } catch { /* keep as string */ }
  return json({ design: { id: row.id, product_type: row.product_type, name: row.name, data, updated_at: row.updated_at } }, 200, request)
}

async function handleDeleteDesign(request, env, userId, designId) {
  await env.DB.prepare(
    "UPDATE designs SET deleted_at = datetime('now') WHERE id = ? AND user_id = ?"
  ).bind(designId, userId).run()
  await logAudit(env.DB, {
    userId,
    action: 'design.deleted',
    resourceType: 'design',
    resourceId: designId,
    ipAddress: getClientIP(request),
  })
  return json({ ok: true }, 200, request)
}

async function handleBulkSync(request, env, userId) {
  const { designs } = await request.json()
  if (!Array.isArray(designs)) return error('designs must be an array', 400, request)
  if (designs.length > 100) return error('Too many designs (max 100)', 400, request)

  const stmt = env.DB.prepare(
    `INSERT INTO designs (id, user_id, product_type, name, data, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, data = excluded.data, updated_at = excluded.updated_at`
  )

  const batch = designs.map(d =>
    stmt.bind(d.id, userId, d.product_type, d.name || 'Untitled', typeof d.data === 'string' ? d.data : JSON.stringify(d.data), d.updated_at || new Date().toISOString())
  )

  if (batch.length > 0) {
    await env.DB.batch(batch)
  }

  const user = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first()
  notifyAdmin(env, 'design_saved', `Designs synced: ${designs.length} design(s)`, { email: user?.email || '', count: String(designs.length) })

  return json({ ok: true, count: batch.length }, 200, request)
}

// ─── Image upload/serve ─────────────────────────────────────────────────────

async function handleImageUpload(request, env, userId) {
  const formData = await request.formData()
  const file = formData.get('file')
  const designId = formData.get('designId') || 'misc'
  const fieldPath = formData.get('fieldPath') || 'unknown'

  if (!file) return error('No file provided', 400, request)

  const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
  if (file.size > MAX_IMAGE_SIZE) return error('File too large (max 10MB)', 413, request)

  const ext = file.name?.split('.').pop() || 'jpg'
  const key = `${userId}/${designId}/${fieldPath}-${Date.now()}.${ext}`

  await env.IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'image/jpeg' },
  })

  const user = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first()
  notifyAdmin(env, 'image_uploaded', `Image uploaded by ${user?.email || userId}`, { email: user?.email || '' })

  return json({ url: `/images/${key}` }, 200, request)
}

async function handleImageServe(request, env, key) {
  if (key.includes('..') || key.startsWith('/')) {
    return new Response('Invalid key', { status: 400, headers: corsHeaders(request) })
  }
  const object = await env.IMAGES.get(key)
  if (!object) return new Response('Not found', { status: 404, headers: corsHeaders(request) })

  const headers = new Headers(corsHeaders(request))
  object.writeHttpMetadata(headers)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  return new Response(object.body, { headers })
}

// ─── Partner / Referral handlers ─────────────────────────────────────────────

async function handleMakePartner(request, env) {
  const adminSecret = request.headers.get('X-Admin-Secret')
  if (!adminSecret || adminSecret !== env.ADMIN_SECRET) return error('Forbidden', 403, request)

  const { userId, partnerName, partnerType, denomination } = await request.json()
  if (!userId || !partnerName) return error('Missing userId or partnerName', 400, request)

  const user = await env.DB.prepare('SELECT id, email, name, is_partner, referral_code FROM users WHERE id = ?').bind(userId).first()
  if (!user) return error('User not found', 404, request)

  if (user.is_partner && user.referral_code) {
    return json({ ok: true, referralCode: user.referral_code, message: 'Already a partner' }, 200, request)
  }

  const code = generateReferralCode()
  await env.DB.prepare('UPDATE users SET is_partner = 1, referral_code = ?, partner_name = ?, partner_type = ?, partner_denomination = ? WHERE id = ?')
    .bind(code, partnerName, partnerType || null, denomination || null, userId).run()

  notifyAdmin(env, 'partner_app', `Partner application: ${user.name || user.email}`, { email: user.email, name: user.name || '' })

  return json({ ok: true, referralCode: code }, 200, request)
}

async function handleTrackReferral(request, env, userId) {
  const { referralCode } = await request.json()
  if (!referralCode) return error('Missing referralCode', 400, request)

  // Find the partner by referral code
  const partner = await env.DB.prepare('SELECT id FROM users WHERE referral_code = ? AND is_partner = 1').bind(referralCode).first()
  if (!partner) return json({ ok: false, reason: 'invalid_code' }, 200, request)

  // Don't self-refer
  if (partner.id === userId) return json({ ok: false, reason: 'self_referral' }, 200, request)

  // Check if already referred
  const existing = await env.DB.prepare('SELECT id FROM referrals WHERE referred_user_id = ?').bind(userId).first()
  if (existing) return json({ ok: false, reason: 'already_referred' }, 200, request)

  await env.DB.prepare('INSERT INTO referrals (id, partner_id, referred_user_id) VALUES (?, ?, ?)')
    .bind(generateId(), partner.id, userId).run()

  notifyAdmin(env, 'referral_tracked', `Referral tracked: code ${referralCode}`, { referralCode: referralCode || '' })

  return json({ ok: true }, 200, request)
}

async function handleGetPartnerProfile(request, env, userId) {
  const user = await env.DB.prepare('SELECT id, partner_name, referral_code, is_partner, partner_type, partner_logo_url, partner_welcome_msg, partner_denomination FROM users WHERE id = ? AND is_partner = 1').bind(userId).first()
  if (!user) return error('Not a partner', 403, request)

  const stats = await env.DB.prepare(
    `SELECT COUNT(r.id) as totalReferrals,
            (SELECT COUNT(*) FROM designs WHERE user_id IN (SELECT referred_user_id FROM referrals WHERE partner_id = ?)) as totalDesigns
     FROM referrals r WHERE r.partner_id = ?`
  ).bind(userId, userId).first()

  return json({
    partner: {
      name: user.partner_name,
      referralCode: user.referral_code,
      totalReferrals: stats?.totalReferrals || 0,
      totalDesigns: stats?.totalDesigns || 0,
      partnerType: user.partner_type,
      logoUrl: user.partner_logo_url,
      welcomeMsg: user.partner_welcome_msg,
      denomination: user.partner_denomination,
    },
  }, 200, request)
}

async function handleGetPartnerReferrals(request, env, userId) {
  const user = await env.DB.prepare('SELECT id FROM users WHERE id = ? AND is_partner = 1').bind(userId).first()
  if (!user) return error('Not a partner', 403, request)

  const rows = await env.DB.prepare(
    `SELECT u.id, u.name, u.picture, u.email, r.created_at,
            (SELECT COUNT(*) FROM designs WHERE user_id = u.id) as designCount
     FROM referrals r
     JOIN users u ON u.id = r.referred_user_id
     WHERE r.partner_id = ?
     ORDER BY r.created_at DESC`
  ).bind(userId).all()

  return json({ referrals: rows.results }, 200, request)
}

async function handleUpdatePartnerProfile(request, env, userId) {
  const user = await env.DB.prepare('SELECT id FROM users WHERE id = ? AND is_partner = 1').bind(userId).first()
  if (!user) return error('Not a partner', 403, request)

  const { partnerType, welcomeMsg, denomination } = await request.json()
  if (partnerType && partnerType !== 'church' && partnerType !== 'funeral_home') {
    return error('partnerType must be church or funeral_home', 400, request)
  }

  const safeWelcome = sanitizeInput(welcomeMsg)
  const safeDenomination = sanitizeInput(denomination)

  await env.DB.prepare(
    "UPDATE users SET partner_type = ?, partner_welcome_msg = ?, partner_denomination = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(partnerType || null, safeWelcome || null, safeDenomination || null, userId).run()

  return json({ ok: true }, 200, request)
}

async function handlePartnerLogoUpload(request, env, userId) {
  const user = await env.DB.prepare('SELECT id FROM users WHERE id = ? AND is_partner = 1').bind(userId).first()
  if (!user) return error('Not a partner', 403, request)

  const formData = await request.formData()
  const logo = formData.get('logo')
  if (!logo || !(logo instanceof File)) return error('Missing logo file', 400, request)

  const ext = logo.name.split('.').pop()?.toLowerCase() || 'png'
  const key = `partner-logos/${userId}.${ext}`
  const bytes = await logo.arrayBuffer()

  await env.IMAGES.put(key, bytes, { httpMetadata: { contentType: logo.type } })

  const logoUrl = `/images/${key}`
  await env.DB.prepare("UPDATE users SET partner_logo_url = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(logoUrl, userId).run()

  return json({ ok: true, logoUrl }, 200, request)
}

async function handlePublicPartnerPage(request, env, code) {
  const user = await env.DB.prepare(
    'SELECT partner_name, partner_type, partner_logo_url, partner_welcome_msg, partner_denomination FROM users WHERE referral_code = ? AND is_partner = 1'
  ).bind(code).first()
  if (!user) return error('Partner not found', 404, request)

  return json({
    name: user.partner_name,
    type: user.partner_type,
    logoUrl: user.partner_logo_url,
    welcomeMsg: user.partner_welcome_msg,
    denomination: user.partner_denomination,
  }, 200, request)
}

// ─── Payment handlers ────────────────────────────────────────────────────────

async function getUserPurchaseData(env, userId) {
  const user = await env.DB.prepare('SELECT credits_remaining FROM users WHERE id = ?').bind(userId).first()
  const rows = await env.DB.prepare('SELECT design_id FROM unlocked_designs WHERE user_id = ?').bind(userId).all()
  return {
    credits: user?.credits_remaining ?? 0,
    isUnlimited: user?.credits_remaining === -1,
    unlockedDesigns: rows.results.map(r => r.design_id),
  }
}

async function getUserSubscription(env, userId) {
  return await env.DB.prepare(
    "SELECT * FROM subscriptions WHERE user_id = ? AND status IN ('active', 'past_due') ORDER BY created_at DESC LIMIT 1"
  ).bind(userId).first()
}

function resolveCredit(user, subscription) {
  if (subscription && subscription.status === 'active' && subscription.monthly_credits_remaining > 0) {
    return { source: 'subscription', deduct: 'subscription' }
  }
  if (user.credits_remaining === -1) {
    return { source: 'unlimited_suite', deduct: null }
  }
  if (user.credits_remaining > 0) {
    return { source: 'credit', deduct: 'user' }
  }
  return null
}

async function handlePaymentInitialize(request, env, userId) {
  const { plan } = await request.json()
  if (!plan || !PLANS[plan]) return error('Invalid plan', 400, request)

  const planInfo = PLANS[plan]
  const user = await env.DB.prepare('SELECT id, email FROM users WHERE id = ?').bind(userId).first()
  if (!user) return error('User not found', 404, request)

  // Check for referral partner (for commission tracking)
  const referral = await env.DB.prepare('SELECT partner_id FROM referrals WHERE referred_user_id = ?').bind(userId).first()
  const partnerId = referral?.partner_id || null
  let commissionRate = null
  let commissionAmount = null
  if (partnerId) {
    const partner = await env.DB.prepare('SELECT partner_commission_override FROM users WHERE id = ?').bind(partnerId).first()
    commissionRate = partner?.partner_commission_override || 0.10
    commissionAmount = Math.round(planInfo.amount * commissionRate)
  }

  const reference = `fp-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const orderId = generateId()

  await env.DB.prepare(
    `INSERT INTO orders (id, user_id, plan, amount_pesewas, paystack_reference, partner_id, commission_rate, commission_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(orderId, userId, plan, planInfo.amount, reference, partnerId, commissionRate, commissionAmount).run()

  return json({
    reference,
    amount: planInfo.amount,
    email: user.email,
    currency: 'GHS',
  }, 200, request)
}

async function markOrderPaid(env, order) {
  // Idempotent: skip if already paid
  if (order.status === 'success') return

  const planInfo = PLANS[order.plan]
  if (!planInfo) return

  const now = new Date().toISOString()
  await env.DB.prepare("UPDATE orders SET status = 'success', paid_at = ? WHERE id = ?").bind(now, order.id).run()

  // Add credits: if suite (-1 unlimited), set to -1; otherwise add
  const user = await env.DB.prepare('SELECT credits_remaining FROM users WHERE id = ?').bind(order.user_id).first()
  const currentCredits = user?.credits_remaining ?? 0

  if (planInfo.credits === -1) {
    await env.DB.prepare('UPDATE users SET credits_remaining = -1 WHERE id = ?').bind(order.user_id).run()
  } else if (currentCredits !== -1) {
    await env.DB.prepare('UPDATE users SET credits_remaining = credits_remaining + ? WHERE id = ?').bind(planInfo.credits, order.user_id).run()
  }
  // If already unlimited, don't downgrade
}

async function handlePaymentVerify(request, env, userId) {
  const { reference } = await request.json()
  if (!reference) return error('Missing reference', 400, request)

  const order = await env.DB.prepare('SELECT * FROM orders WHERE paystack_reference = ? AND user_id = ?').bind(reference, userId).first()
  if (!order) return error('Order not found', 404, request)

  // Already verified
  if (order.status === 'success') {
    const purchaseData = await getUserPurchaseData(env, userId)
    return json({ verified: true, ...purchaseData }, 200, request)
  }

  // Verify with Paystack API
  const psRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
  })
  const psData = await psRes.json()

  if (!psData.status || psData.data?.status !== 'success') {
    await env.DB.prepare("UPDATE orders SET status = 'failed' WHERE id = ?").bind(order.id).run()
    return error('Payment not successful', 400, request)
  }

  // Verify amount matches
  if (psData.data.amount !== order.amount_pesewas) {
    return error('Amount mismatch', 400, request)
  }

  await markOrderPaid(env, order)
  await logAudit(env.DB, {
    userId,
    action: 'payment.verified',
    resourceType: 'order',
    resourceId: order.id,
    detail: { plan: order.plan, amount: order.amount_pesewas, reference },
    ipAddress: getClientIP(request),
  })
  const purchaseData = await getUserPurchaseData(env, userId)

  const user = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first()
  notifyAdmin(env, 'payment', `Payment completed: GHS ${(order.amount_pesewas / 100).toFixed(2)}`, { email: user?.email || '', plan: order.plan, amount: `GHS ${(order.amount_pesewas / 100).toFixed(2)}`, reference: reference })

  return json({ verified: true, ...purchaseData }, 200, request)
}

async function handlePaymentWebhook(request, env) {
  // Paystack webhook IP allowlist
  const PAYSTACK_IPS = ['52.31.139.75', '52.49.173.169', '52.214.14.220']
  const clientIP = getClientIP(request)
  if (!PAYSTACK_IPS.includes(clientIP)) {
    await logAudit(env.DB, {
      action: 'webhook.blocked',
      detail: { ip: clientIP, reason: 'IP not in Paystack allowlist' },
      ipAddress: clientIP,
    })
    return error('Forbidden', 403, request)
  }

  const signature = request.headers.get('x-paystack-signature')
  if (!signature) return error('Missing signature', 400, request)

  const body = await request.text()

  // Verify HMAC-SHA512
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(env.PAYSTACK_SECRET_KEY), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')

  if (expected !== signature) return error('Invalid signature', 401, request)

  const event = JSON.parse(body)
  if (event.event !== 'charge.success') return json({ ok: true }, 200, request)

  const reference = event.data?.reference
  if (!reference) return json({ ok: true }, 200, request)

  // Idempotency check — skip if already processed
  const existing = await env.DB.prepare(
    'SELECT status FROM orders WHERE paystack_reference = ?'
  ).bind(reference).first()
  if (existing && existing.status === 'success') {
    return json({ ok: true, message: 'Already processed' }, 200, request)
  }

  // Check if this is a print order (fp-print- prefix) or a credit order
  if (reference.startsWith('fp-print-')) {
    const printOrder = await env.DB.prepare('SELECT * FROM print_orders WHERE paystack_reference = ?').bind(reference).first()
    if (!printOrder || printOrder.payment_status === 'success') return json({ ok: true }, 200, request)
    const now = new Date().toISOString()
    await env.DB.prepare("UPDATE print_orders SET payment_status = 'success', paid_at = ?, updated_at = ? WHERE id = ?").bind(now, now, printOrder.id).run()
    return json({ ok: true }, 200, request)
  }

  const order = await env.DB.prepare('SELECT * FROM orders WHERE paystack_reference = ?').bind(reference).first()
  if (!order) return json({ ok: true }, 200, request)

  await markOrderPaid(env, order)
  await logAudit(env.DB, {
    action: 'webhook.payment',
    resourceType: 'order',
    resourceId: order.id,
    detail: { reference, event: event.event },
    ipAddress: clientIP,
  })
  notifyAdmin(env, 'payment', `Payment webhook confirmed`, { reference: event.data?.reference || 'unknown' })
  return json({ ok: true }, 200, request)
}

async function handleUnlockDesign(request, env, userId) {
  const { designId, productType } = await request.json()
  if (!designId || !productType) return error('Missing designId or productType', 400, request)

  // Check if already unlocked (idempotent)
  const existing = await env.DB.prepare(
    'SELECT id FROM unlocked_designs WHERE user_id = ? AND design_id = ?'
  ).bind(userId, designId).first()
  if (existing) {
    const purchaseData = await getUserPurchaseData(env, userId)
    return json(purchaseData, 200, request)
  }

  // Credit resolution waterfall
  const user = await env.DB.prepare('SELECT credits_remaining FROM users WHERE id = ?').bind(userId).first()
  const subscription = await getUserSubscription(env, userId)
  const resolution = resolveCredit(user, subscription)

  if (!resolution) return error('No credits available', 403, request)

  // Deduct credit from appropriate source
  if (resolution.deduct === 'subscription') {
    await env.DB.prepare(
      'UPDATE subscriptions SET monthly_credits_remaining = monthly_credits_remaining - 1 WHERE id = ?'
    ).bind(subscription.id).run()
  } else if (resolution.deduct === 'user') {
    const result = await env.DB.prepare(
      'UPDATE users SET credits_remaining = credits_remaining - 1 WHERE id = ? AND credits_remaining > 0'
    ).bind(userId).run()
    if (!result.meta.changes) return error('No credits available', 403, request)
  }
  // unlimited_suite: no deduction

  await env.DB.prepare(
    "INSERT INTO unlocked_designs (id, user_id, design_id, product_type) VALUES (?, ?, ?, ?)"
  ).bind(generateId(), userId, designId, productType).run()

  const purchaseData = await getUserPurchaseData(env, userId)
  return json(purchaseData, 200, request)
}

async function handlePaymentStatus(request, env, userId) {
  const purchaseData = await getUserPurchaseData(env, userId)
  return json(purchaseData, 200, request)
}

// ─── Admin handlers ─────────────────────────────────────────────────────────

async function handleAdminOverview(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const [totalUsers, newUsers7d, newUsers30d, revenue, revenue7d, revenue30d, ordersByPlan, creditsInCirculation, designsUnlocked] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as count FROM users').first(),
    env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-7 days')").first(),
    env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-30 days')").first(),
    env.DB.prepare("SELECT COALESCE(SUM(amount_pesewas), 0) as total FROM orders WHERE status = 'success'").first(),
    env.DB.prepare("SELECT COALESCE(SUM(amount_pesewas), 0) as total FROM orders WHERE status = 'success' AND paid_at >= datetime('now', '-7 days')").first(),
    env.DB.prepare("SELECT COALESCE(SUM(amount_pesewas), 0) as total FROM orders WHERE status = 'success' AND paid_at >= datetime('now', '-30 days')").first(),
    env.DB.prepare("SELECT plan, COUNT(*) as count FROM orders WHERE status = 'success' GROUP BY plan").all(),
    env.DB.prepare('SELECT COALESCE(SUM(credits_remaining), 0) as total FROM users WHERE credits_remaining > 0').first(),
    env.DB.prepare('SELECT COUNT(*) as count FROM unlocked_designs').first(),
  ])

  const planBreakdown = {}
  for (const row of ordersByPlan.results) {
    planBreakdown[row.plan] = row.count
  }

  return json({
    totalUsers: totalUsers.count,
    newUsers7d: newUsers7d.count,
    newUsers30d: newUsers30d.count,
    totalRevenue: revenue.total,
    revenue7d: revenue7d.total,
    revenue30d: revenue30d.total,
    ordersByPlan: planBreakdown,
    creditsInCirculation: creditsInCirculation.total,
    designsUnlocked: designsUnlocked.count,
  }, 200, request)
}

async function handleAdminUsers(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const url = new URL(request.url)
  const search = url.searchParams.get('search') || ''
  const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1)
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page')) || 20))
  const filter = url.searchParams.get('filter') || 'all'
  const offset = (page - 1) * perPage

  let where = 'u.deleted_at IS NULL'
  const binds = []

  if (search) {
    where += ' AND (u.name LIKE ? OR u.email LIKE ?)'
    binds.push(`%${search}%`, `%${search}%`)
  }
  if (filter === 'paid') {
    where += ' AND u.credits_remaining != 0'
  } else if (filter === 'partner') {
    where += ' AND u.is_partner = 1'
  }

  const countResult = await env.DB.prepare(`SELECT COUNT(*) as total FROM users u WHERE ${where}`).bind(...binds).first()

  const rows = await env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.picture, u.credits_remaining, u.is_partner, u.created_at,
            (SELECT COUNT(*) FROM orders WHERE user_id = u.id AND status = 'success') as order_count,
            (SELECT COUNT(*) FROM unlocked_designs WHERE user_id = u.id) as unlock_count,
            EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = 'role_admin') as is_admin
     FROM users u WHERE ${where}
     ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...binds, perPage, offset).all()

  // Mark super admins (hardcoded by email) so the UI can suppress revoke-admin on them
  const enriched = rows.results.map(u => ({
    ...u,
    is_admin: !!u.is_admin,
    is_super_admin: SUPER_ADMINS.includes(u.email),
  }))

  return json({
    users: enriched,
    total: countResult.total,
    page,
    perPage,
    totalPages: Math.ceil(countResult.total / perPage),
  }, 200, request)
}

async function handleAdminGrantCredits(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const { userId, credits, reason } = await request.json()
  if (!userId || typeof credits !== 'number') return error('Missing userId or credits', 400, request)

  await env.DB.prepare('UPDATE users SET credits_remaining = credits_remaining + ? WHERE id = ?').bind(credits, userId).run()
  const user = await env.DB.prepare('SELECT id, name, email, credits_remaining FROM users WHERE id = ?').bind(userId).first()
  if (!user) return error('User not found', 404, request)

  await logAudit(env.DB, {
    userId: auth.user.sub,
    action: 'admin.grant_credits',
    resourceType: 'user',
    resourceId: userId,
    detail: { credits, reason: reason || null },
    ipAddress: getClientIP(request),
  })

  return json({ ok: true, user }, 200, request)
}

async function handleAdminOrders(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1)
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page')) || 20))
  const status = url.searchParams.get('status') || 'all'
  const plan = url.searchParams.get('plan') || 'all'
  const days = url.searchParams.get('days') || 'all'
  const offset = (page - 1) * perPage

  let where = 'o.deleted_at IS NULL'
  const binds = []

  if (status !== 'all') {
    where += ' AND o.status = ?'
    binds.push(status)
  }
  if (plan !== 'all') {
    where += ' AND o.plan = ?'
    binds.push(plan)
  }
  if (days !== 'all') {
    const daysInt = parseInt(days)
    if (isNaN(daysInt) || daysInt < 0) return error('Invalid days filter', 400, request)
    where += ` AND o.created_at >= datetime('now', '-${daysInt} days')`
  }

  const countResult = await env.DB.prepare(`SELECT COUNT(*) as total FROM orders o WHERE ${where}`).bind(...binds).first()

  const rows = await env.DB.prepare(
    `SELECT o.id, o.plan, o.amount_pesewas, o.status, o.paystack_reference, o.paid_at, o.created_at,
            u.name as user_name, u.email as user_email
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     WHERE ${where}
     ORDER BY o.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...binds, perPage, offset).all()

  return json({
    orders: rows.results,
    total: countResult.total,
    page,
    perPage,
    totalPages: Math.ceil(countResult.total / perPage),
  }, 200, request)
}

async function handleAdminPartners(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const rows = await env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.partner_name, u.referral_code, u.partner_type, u.partner_commission_override,
            (SELECT COUNT(*) FROM referrals WHERE partner_id = u.id) as referral_count,
            (SELECT COALESCE(SUM(o.commission_amount), 0) FROM orders o WHERE o.partner_id = u.id AND o.status = 'success') as total_earned
     FROM users u WHERE u.is_partner = 1
     ORDER BY u.created_at DESC`
  ).all()

  return json({ partners: rows.results }, 200, request)
}

async function handleAdminPromotePartner(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const { userId, partnerName } = await request.json()
  if (!userId || !partnerName) return error('Missing userId or partnerName', 400, request)

  const user = await env.DB.prepare('SELECT id, is_partner, referral_code FROM users WHERE id = ?').bind(userId).first()
  if (!user) return error('User not found', 404, request)

  if (user.is_partner && user.referral_code) {
    return json({ ok: true, referralCode: user.referral_code, message: 'Already a partner' }, 200, request)
  }

  const code = generateReferralCode()
  await env.DB.prepare('UPDATE users SET is_partner = 1, referral_code = ?, partner_name = ? WHERE id = ?')
    .bind(code, partnerName, userId).run()

  await logAudit(env.DB, {
    userId: auth.user.sub,
    action: 'admin.promote_partner',
    resourceType: 'user',
    resourceId: userId,
    detail: { partnerName, referralCode: code },
    ipAddress: getClientIP(request),
  })

  return json({ ok: true, referralCode: code }, 200, request)
}

async function handleAdminDemotePartner(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const { userId } = await request.json()
  if (!userId) return error('Missing userId', 400, request)

  await env.DB.prepare('UPDATE users SET is_partner = 0 WHERE id = ?').bind(userId).run()

  await logAudit(env.DB, {
    userId: auth.user.sub,
    action: 'admin.demote_partner',
    resourceType: 'user',
    resourceId: userId,
    ipAddress: getClientIP(request),
  })

  return json({ ok: true }, 200, request)
}

async function handleAdminSetPartnerType(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const { userId, partnerType } = await request.json()
  if (!userId) return error('Missing userId', 400, request)

  const validTypes = [null, 'church', 'funeral_home']
  if (!validTypes.includes(partnerType)) return error('Invalid partnerType', 400, request)

  await env.DB.prepare('UPDATE users SET partner_type = ? WHERE id = ?').bind(partnerType, userId).run()
  return json({ ok: true }, 200, request)
}

async function handleAdminSetCommissionOverride(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const { userId, commissionRate } = await request.json()
  if (!userId || commissionRate === undefined) return error('Missing userId or commissionRate', 400, request)

  const rate = parseFloat(commissionRate)
  if (isNaN(rate) || rate < 0 || rate > 1) return error('commissionRate must be between 0 and 1', 400, request)

  await env.DB.prepare('UPDATE users SET partner_commission_override = ? WHERE id = ?').bind(rate, userId).run()
  return json({ ok: true }, 200, request)
}

async function handleAdminDesigns(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const rows = await env.DB.prepare('SELECT product_type, COUNT(*) as count FROM unlocked_designs GROUP BY product_type').all()

  const breakdown = {}
  for (const row of rows.results) {
    breakdown[row.product_type] = row.count
  }

  return json({ designs: breakdown }, 200, request)
}

// ─── Print order handlers ───────────────────────────────────────────────────

async function handlePrintCalculate(request, env, userId) {
  const { productType, quantity, paperQuality, deliveryRegion, size } = await request.json()
  if (!productType || !quantity || !paperQuality || !deliveryRegion) {
    return error('Missing required fields', 400, request)
  }
  const userRow = await env.DB.prepare('SELECT partner_type FROM users WHERE id = ?').bind(userId).first()
  const instDiscount = userRow?.partner_type ? INSTITUTIONAL_PRINT_DISCOUNT : 0
  const pricing = calculatePrintPrice(productType, quantity, paperQuality, deliveryRegion, size, instDiscount)
  if (!pricing) {
    const product = PRINT_PRICING[productType]
    if (!product) return error('Invalid product type', 400, request)
    if (size && !product.sizes[size]) return error('Invalid size for this product', 400, request)
    return error(`Minimum quantity is ${product.min}`, 400, request)
  }
  const product = PRINT_PRICING[productType]
  return json({ pricing, productLabel: product.label, sizes: product.sizes, defaultSize: product.defaultSize }, 200, request)
}

async function handlePrintOrderCreate(request, env, userId) {
  const body = await request.json()
  const { productType, designId, designName, designSnapshot, quantity, paperQuality, size, recipientName, recipientPhone, deliveryCity, deliveryArea, deliveryLandmark, deliveryRegion } = body

  if (!productType || !designId || !designSnapshot || !quantity || !paperQuality || !recipientName || !recipientPhone || !deliveryCity || !deliveryRegion) {
    return error('Missing required fields', 400, request)
  }

  const user = await env.DB.prepare('SELECT id, email, partner_type FROM users WHERE id = ?').bind(userId).first()
  if (!user) return error('User not found', 404, request)

  const instDiscount = user.partner_type ? INSTITUTIONAL_PRINT_DISCOUNT : 0
  const pricing = calculatePrintPrice(productType, quantity, paperQuality, deliveryRegion, size, instDiscount)
  if (!pricing) {
    const product = PRINT_PRICING[productType]
    return error(product ? `Minimum quantity is ${product.min}` : 'Invalid product type', 400, request)
  }

  const reference = `fp-print-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const orderId = generateId()
  const snapshotStr = typeof designSnapshot === 'string' ? designSnapshot : JSON.stringify(designSnapshot)

  await env.DB.prepare(
    `INSERT INTO print_orders (id, user_id, design_id, product_type, design_name, design_snapshot, quantity, paper_quality, print_size, recipient_name, recipient_phone, delivery_city, delivery_area, delivery_landmark, delivery_region, print_cost_pesewas, delivery_fee_pesewas, total_pesewas, paystack_reference)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(orderId, userId, designId, productType, designName || 'Untitled', snapshotStr, quantity, paperQuality, pricing.size, recipientName, recipientPhone, deliveryCity, deliveryArea || null, deliveryLandmark || null, deliveryRegion, pricing.printCost, pricing.deliveryFee, pricing.total, reference).run()

  notifyAdmin(env, 'print_order', `Print order placed: ${body.productType}`, { email: user.email, product: body.productType, quantity: String(body.quantity || 1), region: body.deliveryRegion || '' })

  return json({
    orderId,
    reference,
    amount: pricing.total,
    email: user.email,
    currency: 'GHS',
  }, 200, request)
}

async function handlePrintOrderVerify(request, env, userId) {
  const { reference } = await request.json()
  if (!reference) return error('Missing reference', 400, request)

  const order = await env.DB.prepare('SELECT * FROM print_orders WHERE paystack_reference = ? AND user_id = ?').bind(reference, userId).first()
  if (!order) return error('Order not found', 404, request)

  if (order.payment_status === 'success') {
    return json({ verified: true, orderId: order.id }, 200, request)
  }

  const psRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
  })
  const psData = await psRes.json()

  if (!psData.status || psData.data?.status !== 'success') {
    await env.DB.prepare("UPDATE print_orders SET payment_status = 'failed' WHERE id = ?").bind(order.id).run()
    return error('Payment not successful', 400, request)
  }

  if (psData.data.amount !== order.total_pesewas) {
    return error('Amount mismatch', 400, request)
  }

  const now = new Date().toISOString()
  await env.DB.prepare("UPDATE print_orders SET payment_status = 'success', paid_at = ?, updated_at = ? WHERE id = ?").bind(now, now, order.id).run()

  // Fire-and-forget admin WhatsApp notification
  if (env.ADMIN_WHATSAPP_WEBHOOK) {
    fetch(env.ADMIN_WHATSAPP_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `New print order! ${order.quantity}x ${order.product_type} ${order.print_size || ''} (${order.paper_quality}) for ${order.recipient_name} in ${order.delivery_region}. Total: GHS ${(order.total_pesewas / 100).toFixed(2)}. Ref: ${reference}` }),
    }).catch(() => {})
  }

  return json({ verified: true, orderId: order.id }, 200, request)
}

async function handleListPrintOrders(request, env, userId) {
  const rows = await env.DB.prepare(
    `SELECT id, design_id, product_type, design_name, quantity, paper_quality, print_size, total_pesewas, payment_status, fulfillment_status, estimated_delivery, created_at
     FROM print_orders WHERE user_id = ? ORDER BY created_at DESC`
  ).bind(userId).all()
  return json({ orders: rows.results }, 200, request)
}

async function handleAdminPrintOrders(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1)
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page')) || 20))
  const fulfillment = url.searchParams.get('fulfillment') || 'all'
  const payment = url.searchParams.get('payment') || 'all'
  const offset = (page - 1) * perPage

  let where = 'po.deleted_at IS NULL'
  const binds = []

  if (fulfillment !== 'all') {
    where += ' AND po.fulfillment_status = ?'
    binds.push(fulfillment)
  }
  if (payment !== 'all') {
    where += ' AND po.payment_status = ?'
    binds.push(payment)
  }

  const countResult = await env.DB.prepare(`SELECT COUNT(*) as total FROM print_orders po WHERE ${where}`).bind(...binds).first()

  const rows = await env.DB.prepare(
    `SELECT po.*, u.name as user_name, u.email as user_email
     FROM print_orders po
     LEFT JOIN users u ON u.id = po.user_id
     WHERE ${where}
     ORDER BY po.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...binds, perPage, offset).all()

  return json({
    orders: rows.results,
    total: countResult.total,
    page,
    perPage,
    totalPages: Math.ceil(countResult.total / perPage),
  }, 200, request)
}

async function handleAdminUpdatePrintOrder(request, env, orderId) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const { fulfillment_status, admin_notes, printer_reference, estimated_delivery } = await request.json()

  const order = await env.DB.prepare('SELECT id FROM print_orders WHERE id = ?').bind(orderId).first()
  if (!order) return error('Print order not found', 404, request)

  const updates = []
  const vals = []

  if (fulfillment_status) { updates.push('fulfillment_status = ?'); vals.push(fulfillment_status) }
  if (admin_notes !== undefined) { updates.push('admin_notes = ?'); vals.push(admin_notes) }
  if (printer_reference !== undefined) { updates.push('printer_reference = ?'); vals.push(printer_reference) }
  if (estimated_delivery !== undefined) { updates.push('estimated_delivery = ?'); vals.push(estimated_delivery) }

  if (fulfillment_status === 'delivered') {
    updates.push('completed_at = ?')
    vals.push(new Date().toISOString())
  }

  updates.push("updated_at = datetime('now')")

  if (updates.length === 1) return error('No fields to update', 400, request)

  await env.DB.prepare(`UPDATE print_orders SET ${updates.join(', ')} WHERE id = ?`).bind(...vals, orderId).run()

  return json({ ok: true }, 200, request)
}

// ─── Admin Analytics handlers ───────────────────────────────────────────────

async function handleAdminAnalyticsOverview(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const url = new URL(request.url)
  const days = parseInt(url.searchParams.get('days')) || 30

  const period = `datetime('now', '-${days} days')`
  const prevPeriod = `datetime('now', '-${days * 2} days')`

  // Current period stats
  const users = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL`
  ).first()
  const newUsers = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM users WHERE created_at >= ${period} AND deleted_at IS NULL`
  ).first()
  const prevNewUsers = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM users WHERE created_at >= ${prevPeriod} AND created_at < ${period} AND deleted_at IS NULL`
  ).first()

  const revenue = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount_pesewas), 0) as total FROM orders WHERE status = 'success' AND paid_at >= ${period} AND deleted_at IS NULL`
  ).first()
  const prevRevenue = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount_pesewas), 0) as total FROM orders WHERE status = 'success' AND paid_at >= ${prevPeriod} AND paid_at < ${period} AND deleted_at IS NULL`
  ).first()

  const activeSubs = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`
  ).first()

  const printOrders = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM print_orders WHERE created_at >= ${period} AND deleted_at IS NULL`
  ).first()
  const prevPrintOrders = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM print_orders WHERE created_at >= ${prevPeriod} AND created_at < ${period} AND deleted_at IS NULL`
  ).first()

  function pctChange(current, previous) {
    if (!previous) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  return json({
    totalUsers: users.total,
    newUsers: newUsers.count,
    newUsersPctChange: pctChange(newUsers.count, prevNewUsers.count),
    revenuePesewas: revenue.total,
    revenuePctChange: pctChange(revenue.total, prevRevenue.total),
    activeSubscriptions: activeSubs.count,
    printOrders: printOrders.count,
    printOrdersPctChange: pctChange(printOrders.count, prevPrintOrders.count),
  }, 200, request)
}

async function handleAdminAnalyticsRevenue(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const url = new URL(request.url)
  const days = parseInt(url.searchParams.get('days')) || 30

  const { results } = await env.DB.prepare(
    `SELECT DATE(paid_at) as date, SUM(amount_pesewas) as revenue, COUNT(*) as orders
     FROM orders
     WHERE status = 'success' AND paid_at >= datetime('now', '-${days} days') AND deleted_at IS NULL
     GROUP BY DATE(paid_at)
     ORDER BY date ASC`
  ).all()

  return json({ data: results || [] }, 200, request)
}

async function handleAdminAnalyticsTemplates(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const url = new URL(request.url)
  const limit = Math.min(20, parseInt(url.searchParams.get('limit')) || 10)

  const { results } = await env.DB.prepare(
    `SELECT product_type, COUNT(*) as count
     FROM unlocked_designs
     GROUP BY product_type
     ORDER BY count DESC
     LIMIT ?`
  ).bind(limit).all()

  return json({ data: results || [] }, 200, request)
}

// ─── Guest Book handlers ────────────────────────────────────────────────────

async function handleCreateGuestBook(request, env, userId) {
  const { deceasedName, deceasedPhoto, coverMessage } = await request.json()
  if (!deceasedName) return error('Missing deceasedName', 400, request)

  const user = await env.DB.prepare('SELECT credits_remaining FROM users WHERE id = ?').bind(userId).first()
  const credits = user?.credits_remaining ?? 0
  if (credits === 0) return error('No credits remaining', 403, request)

  const id = generateId()
  const slug = deceasedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + id.slice(0, 6)

  if (credits > 0) {
    const result = await env.DB.prepare('UPDATE users SET credits_remaining = credits_remaining - 1 WHERE id = ? AND credits_remaining > 0').bind(userId).run()
    if (!result.meta.changes) return error('No credits remaining', 403, request)
  }

  await env.DB.prepare(
    'INSERT INTO guest_books (id, user_id, slug, deceased_name, deceased_photo, cover_message) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, slug, deceasedName, deceasedPhoto || null, coverMessage || null).run()

  return json({ id, slug }, 201, request)
}

async function handleGetGuestBook(request, env, slug) {
  const book = await env.DB.prepare('SELECT * FROM guest_books WHERE slug = ? AND is_active = 1').bind(slug).first()
  if (!book) return error('Guest book not found', 404, request)

  const entries = await env.DB.prepare('SELECT id, name, message, photo_url, created_at FROM guest_entries WHERE book_id = ? ORDER BY created_at DESC').bind(book.id).all()

  return json({ book, entries: entries.results }, 200, request)
}

async function handleSignGuestBook(request, env, slug) {
  const book = await env.DB.prepare('SELECT id, is_active FROM guest_books WHERE slug = ?').bind(slug).first()
  if (!book || !book.is_active) return error('Guest book not found or closed', 404, request)

  const { name, message, photoUrl } = await request.json()
  if (!name) return error('Name is required', 400, request)

  const safeName = sanitizeInput(name)
  const safeMessage = sanitizeInput(message)

  const id = generateId()
  await env.DB.prepare(
    'INSERT INTO guest_entries (id, book_id, name, message, photo_url) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, book.id, safeName, safeMessage || null, photoUrl || null).run()

  notifyAdmin(env, 'guest_book_sign', `Guest book signed: ${name}`, { guestBookSlug: slug, signerName: name, message: (message || '').slice(0, 100) })

  return json({ id }, 201, request)
}

async function handleListUserGuestBooks(request, env, userId) {
  const rows = await env.DB.prepare(
    'SELECT gb.id, gb.slug, gb.deceased_name, gb.created_at, (SELECT COUNT(*) FROM guest_entries WHERE book_id = gb.id) as entry_count FROM guest_books gb WHERE gb.user_id = ? ORDER BY gb.created_at DESC'
  ).bind(userId).all()
  return json({ books: rows.results }, 200, request)
}

// ─── Obituary Page handlers ─────────────────────────────────────────────────

async function handleCreateObituary(request, env, userId) {
  const { deceasedName, deceasedPhoto, birthDate, deathDate, biography, funeralDate, funeralTime, funeralVenue, venueAddress, familyMembers } = await request.json()
  if (!deceasedName) return error('Missing deceasedName', 400, request)

  const user = await env.DB.prepare('SELECT email, credits_remaining FROM users WHERE id = ?').bind(userId).first()
  const credits = user?.credits_remaining ?? 0
  if (credits === 0) return error('No credits remaining', 403, request)

  const id = generateId()
  const slug = deceasedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + id.slice(0, 6)

  if (credits > 0) {
    const result = await env.DB.prepare('UPDATE users SET credits_remaining = credits_remaining - 1 WHERE id = ? AND credits_remaining > 0').bind(userId).run()
    if (!result.meta.changes) return error('No credits remaining', 403, request)
  }

  await env.DB.prepare(
    'INSERT INTO obituary_pages (id, user_id, slug, deceased_name, deceased_photo, birth_date, death_date, biography, funeral_date, funeral_time, funeral_venue, venue_address, family_members) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, slug, deceasedName, deceasedPhoto || null, birthDate || null, deathDate || null, biography || null, funeralDate || null, funeralTime || null, funeralVenue || null, venueAddress || null, familyMembers || null).run()

  notifyAdmin(env, 'obituary_created', `Obituary created: ${deceasedName || 'Untitled'}`, { email: user?.email || '', name: deceasedName || '' })

  return json({ id, slug }, 201, request)
}

async function handleGetObituary(request, env, slug) {
  const page = await env.DB.prepare('SELECT * FROM obituary_pages WHERE slug = ? AND is_active = 1').bind(slug).first()
  if (!page) return error('Obituary not found', 404, request)
  return json({ obituary: page }, 200, request)
}

async function handleUpdateObituary(request, env, userId, id) {
  const fields = await request.json()
  const allowed = ['deceased_name', 'deceased_photo', 'birth_date', 'death_date', 'biography', 'funeral_date', 'funeral_time', 'funeral_venue', 'venue_address', 'family_members', 'is_active']
  const updates = []
  const vals = []
  for (const key of allowed) {
    if (fields[key] !== undefined) { updates.push(`${key} = ?`); vals.push(fields[key]) }
  }
  if (updates.length === 0) return error('No fields to update', 400, request)
  await env.DB.prepare(`UPDATE obituary_pages SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).bind(...vals, id, userId).run()
  return json({ ok: true }, 200, request)
}

async function handleListUserObituaries(request, env, userId) {
  const rows = await env.DB.prepare('SELECT id, slug, deceased_name, funeral_date, created_at FROM obituary_pages WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all()
  return json({ obituaries: rows.results }, 200, request)
}

// ─── Photo Gallery handlers ─────────────────────────────────────────────────

async function handleCreateGallery(request, env, userId) {
  const { title, deceasedName, description } = await request.json()
  if (!title) return error('Missing title', 400, request)

  const user = await env.DB.prepare('SELECT email, credits_remaining FROM users WHERE id = ?').bind(userId).first()
  const credits = user?.credits_remaining ?? 0
  if (credits === 0) return error('No credits remaining', 403, request)

  const id = generateId()
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + id.slice(0, 6)

  if (credits > 0) {
    const result = await env.DB.prepare('UPDATE users SET credits_remaining = credits_remaining - 1 WHERE id = ? AND credits_remaining > 0').bind(userId).run()
    if (!result.meta.changes) return error('No credits remaining', 403, request)
  }

  await env.DB.prepare(
    'INSERT INTO photo_galleries (id, user_id, slug, title, deceased_name, description) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, slug, title, deceasedName || null, description || null).run()

  notifyAdmin(env, 'gallery_created', `Gallery created: ${title || 'Untitled'}`, { email: user?.email || '', title: title || '' })

  return json({ id, slug }, 201, request)
}

async function handleGetGallery(request, env, slug) {
  const gallery = await env.DB.prepare('SELECT * FROM photo_galleries WHERE slug = ? AND is_active = 1').bind(slug).first()
  if (!gallery) return error('Gallery not found', 404, request)

  const photos = await env.DB.prepare('SELECT id, photo_url, caption, sort_order FROM gallery_photos WHERE gallery_id = ? ORDER BY sort_order ASC').bind(gallery.id).all()

  return json({ gallery, photos: photos.results }, 200, request)
}

async function handleAddGalleryPhoto(request, env, userId, galleryId) {
  const gallery = await env.DB.prepare('SELECT id FROM photo_galleries WHERE id = ? AND user_id = ?').bind(galleryId, userId).first()
  if (!gallery) return error('Gallery not found', 404, request)

  const { photoUrl, caption, sortOrder } = await request.json()
  if (!photoUrl) return error('Missing photoUrl', 400, request)

  const id = generateId()
  await env.DB.prepare(
    'INSERT INTO gallery_photos (id, gallery_id, photo_url, caption, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, galleryId, photoUrl, caption || null, sortOrder || 0).run()

  return json({ id }, 201, request)
}

async function handleDeleteGalleryPhoto(request, env, userId, photoId) {
  const photo = await env.DB.prepare(
    'SELECT gp.id FROM gallery_photos gp JOIN photo_galleries pg ON gp.gallery_id = pg.id WHERE gp.id = ? AND pg.user_id = ?'
  ).bind(photoId, userId).first()
  if (!photo) return error('Photo not found', 404, request)

  await env.DB.prepare('DELETE FROM gallery_photos WHERE id = ?').bind(photoId).run()
  return json({ ok: true }, 200, request)
}

async function handleListUserGalleries(request, env, userId) {
  const rows = await env.DB.prepare(
    'SELECT pg.id, pg.slug, pg.title, pg.deceased_name, pg.created_at, (SELECT COUNT(*) FROM gallery_photos WHERE gallery_id = pg.id) as photo_count FROM photo_galleries pg WHERE pg.user_id = ? ORDER BY pg.created_at DESC'
  ).bind(userId).all()
  return json({ galleries: rows.results }, 200, request)
}

// ─── Subscription handlers ───────────────────────────────────────────────────

async function handleSubscriptionCreate(request, env, userId) {
  const { plan } = await request.json()
  if (!plan || !['pro_monthly', 'pro_annual'].includes(plan)) {
    return error('Invalid plan. Use pro_monthly or pro_annual', 400, request)
  }

  // Check if user already has active subscription
  const existing = await getUserSubscription(env, userId)
  if (existing && existing.status === 'active') {
    return error('Already have an active subscription', 400, request)
  }

  const user = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first()
  if (!user) return error('User not found', 404, request)

  const planCode = plan === 'pro_monthly' ? env.PAYSTACK_PLAN_MONTHLY : env.PAYSTACK_PLAN_ANNUAL

  // Initialize Paystack subscription via transaction
  const psRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      plan: planCode,
      callback_url: `${env.CORS_ORIGIN}/subscription/callback`,
      metadata: { userId, plan },
    }),
  })
  const psData = await psRes.json()

  if (!psData.status) {
    return error('Failed to initialize subscription', 500, request)
  }

  return json({
    authorization_url: psData.data.authorization_url,
    access_code: psData.data.access_code,
    reference: psData.data.reference,
  }, 200, request)
}

async function handleSubscriptionStatus(request, env, userId) {
  const sub = await getUserSubscription(env, userId)
  if (!sub) {
    return json({ hasSubscription: false }, 200, request)
  }
  return json({
    hasSubscription: true,
    plan: sub.plan,
    status: sub.status,
    monthlyCreditsRemaining: sub.monthly_credits_remaining,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
  }, 200, request)
}

async function handleSubscriptionCancel(request, env, userId) {
  const sub = await getUserSubscription(env, userId)
  if (!sub || sub.status !== 'active') {
    return error('No active subscription', 400, request)
  }

  // Tell Paystack to cancel at period end
  if (sub.paystack_email_token && sub.paystack_subscription_code) {
    await fetch(`https://api.paystack.co/subscription/disable`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: sub.paystack_subscription_code,
        token: sub.paystack_email_token,
      }),
    })
  }

  await env.DB.prepare(
    "UPDATE subscriptions SET cancel_at_period_end = 1, cancelled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).bind(sub.id).run()

  await env.DB.prepare(
    "INSERT INTO subscription_events (subscription_id, event_type, detail) VALUES (?, 'cancelled', ?)"
  ).bind(sub.id, JSON.stringify({ userId, reason: 'user_requested' })).run()

  await logAudit(env.DB, {
    userId,
    action: 'subscription.cancelled',
    resourceType: 'subscription',
    resourceId: sub.id,
    ipAddress: getClientIP(request),
  })

  return json({ ok: true, cancelAtPeriodEnd: true }, 200, request)
}

async function handleSubscriptionWebhook(request, env) {
  // Paystack webhook IP allowlist (matches handlePaymentWebhook + donation-api pattern)
  const PAYSTACK_IPS = ['52.31.139.75', '52.49.173.169', '52.214.14.220']
  const clientIP = getClientIP(request)
  if (!PAYSTACK_IPS.includes(clientIP)) {
    await logAudit(env.DB, {
      action: 'subscription_webhook.blocked',
      detail: { ip: clientIP, reason: 'IP not in Paystack allowlist' },
      ipAddress: clientIP,
    })
    return error('Forbidden', 403, request)
  }

  // Reuse the same Paystack HMAC verification as payment webhook
  const signature = request.headers.get('x-paystack-signature')
  if (!signature) return error('Missing signature', 400, request)

  const body = await request.text()
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(env.PAYSTACK_SECRET_KEY), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  if (expected !== signature) return error('Invalid signature', 401, request)

  const event = JSON.parse(body)
  const data = event.data || {}

  if (event.event === 'subscription.create') {
    const userId = data.metadata?.userId
    if (!userId) return json({ ok: true }, 200, request)

    const id = generateId()
    const plan = data.plan?.plan_code === env.PAYSTACK_PLAN_ANNUAL ? 'pro_annual' : 'pro_monthly'
    const now = new Date().toISOString()
    const periodEnd = data.next_payment_date || new Date(Date.now() + 30 * 86400000).toISOString()

    await env.DB.prepare(
      `INSERT INTO subscriptions (id, user_id, plan, status, paystack_subscription_code, paystack_customer_code, paystack_email_token, current_period_start, current_period_end, monthly_credits_remaining)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, 15)`
    ).bind(id, userId, plan, data.subscription_code || null, data.customer?.customer_code || null, data.email_token || null, now, periodEnd).run()

    await env.DB.prepare(
      "INSERT INTO subscription_events (subscription_id, event_type, detail) VALUES (?, 'created', ?)"
    ).bind(id, JSON.stringify({ plan, reference: data.reference })).run()

    return json({ ok: true }, 200, request)
  }

  if (event.event === 'charge.success' && data.plan) {
    // Subscription renewal — reset monthly credits
    const subCode = data.subscription_code
    if (!subCode) return json({ ok: true }, 200, request)

    const sub = await env.DB.prepare(
      'SELECT id FROM subscriptions WHERE paystack_subscription_code = ?'
    ).bind(subCode).first()

    if (sub) {
      const periodEnd = data.next_payment_date || new Date(Date.now() + 30 * 86400000).toISOString()
      await env.DB.prepare(
        "UPDATE subscriptions SET monthly_credits_remaining = 15, current_period_start = datetime('now'), current_period_end = ?, status = 'active', updated_at = datetime('now') WHERE id = ?"
      ).bind(periodEnd, sub.id).run()

      await env.DB.prepare(
        "INSERT INTO subscription_events (subscription_id, event_type, detail) VALUES (?, 'renewed', ?)"
      ).bind(sub.id, JSON.stringify({ reference: data.reference })).run()
    }

    return json({ ok: true }, 200, request)
  }

  if (event.event === 'subscription.not_renew' || event.event === 'subscription.disable') {
    const subCode = data.subscription_code
    if (!subCode) return json({ ok: true }, 200, request)

    await env.DB.prepare(
      "UPDATE subscriptions SET status = 'cancelled', updated_at = datetime('now') WHERE paystack_subscription_code = ?"
    ).bind(subCode).run()

    return json({ ok: true }, 200, request)
  }

  if (event.event === 'charge.failed') {
    // Mark subscription past_due and reset dunning stage to 0 so the
    // daily dunning cron starts the Day 1 / Day 3 / Day 7 sequence.
    const subCode = data.subscription_code || data.plan?.subscription_code
    if (!subCode) return json({ ok: true }, 200, request)

    const sub = await env.DB.prepare(
      'SELECT id FROM subscriptions WHERE paystack_subscription_code = ?'
    ).bind(subCode).first()

    if (sub) {
      await env.DB.prepare(
        "UPDATE subscriptions SET status = 'past_due', dunning_stage = 0, last_dunning_sent_at = NULL, updated_at = datetime('now') WHERE id = ?"
      ).bind(sub.id).run()

      await env.DB.prepare(
        "INSERT INTO subscription_events (subscription_id, event_type, detail) VALUES (?, 'charge.failed', ?)"
      ).bind(sub.id, JSON.stringify({
        reference: data.reference,
        gateway_response: data.gateway_response,
      })).run()
    }

    return json({ ok: true }, 200, request)
  }

  return json({ ok: true }, 200, request)
}

// ─── Venues ─────────────────────────────────────────────────────────────────

async function handleListVenues(request, env) {
  const url = new URL(request.url)
  const region = url.searchParams.get('region') || ''
  const verified = url.searchParams.get('verified') || '1'

  let query = 'SELECT id, name, region, city, address, phone, services, rating FROM venues WHERE verified = ?'
  const binds = [parseInt(verified)]

  if (region) {
    query += ' AND region = ?'
    binds.push(region)
  }

  query += ' ORDER BY name ASC LIMIT 100'

  const { results } = await env.DB.prepare(query).bind(...binds).all()
  return json({ venues: results || [] }, 200, request)
}

async function handleAdminCreateVenue(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const body = await request.json()
  if (!body.name || !body.region) return error('Missing name or region', 400, request)

  const id = crypto.randomUUID()
  const safeName = sanitizeInput(body.name)
  const safeCity = sanitizeInput(body.city)
  const safeAddress = sanitizeInput(body.address)

  await env.DB.prepare(
    `INSERT INTO venues (id, name, region, city, address, phone, services, rating, source, verified, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, safeName, body.region, safeCity || null, safeAddress || null,
    body.phone || null, JSON.stringify(body.services || []),
    body.rating || null, body.source || 'admin', body.verified ? 1 : 0,
    body.lat || null, body.lng || null
  ).run()

  await logAudit(env.DB, {
    userId: auth.userId,
    action: 'venue.created',
    resourceType: 'venue',
    resourceId: id,
    detail: { name: safeName, region: body.region },
    ipAddress: getClientIP(request),
  })

  return json({ id, name: safeName }, 201, request)
}

async function handleAdminUpdateVenue(request, env, venueId) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const existing = await env.DB.prepare('SELECT id FROM venues WHERE id = ?').bind(venueId).first()
  if (!existing) return error('Venue not found', 404, request)

  const body = await request.json()
  const updates = []
  const binds = []

  if (body.name !== undefined) { updates.push('name = ?'); binds.push(sanitizeInput(body.name)) }
  if (body.region !== undefined) { updates.push('region = ?'); binds.push(body.region) }
  if (body.city !== undefined) { updates.push('city = ?'); binds.push(sanitizeInput(body.city)) }
  if (body.address !== undefined) { updates.push('address = ?'); binds.push(sanitizeInput(body.address)) }
  if (body.phone !== undefined) { updates.push('phone = ?'); binds.push(body.phone) }
  if (body.services !== undefined) { updates.push('services = ?'); binds.push(JSON.stringify(body.services)) }
  if (body.rating !== undefined) { updates.push('rating = ?'); binds.push(body.rating) }
  if (body.verified !== undefined) { updates.push('verified = ?'); binds.push(body.verified ? 1 : 0) }
  if (body.lat !== undefined) { updates.push('lat = ?'); binds.push(body.lat) }
  if (body.lng !== undefined) { updates.push('lng = ?'); binds.push(body.lng) }

  if (updates.length === 0) return error('No fields to update', 400, request)

  updates.push("updated_at = datetime('now')")
  binds.push(venueId)

  await env.DB.prepare(
    `UPDATE venues SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...binds).run()

  await logAudit(env.DB, {
    userId: auth.userId,
    action: 'venue.updated',
    resourceType: 'venue',
    resourceId: venueId,
    ipAddress: getClientIP(request),
  })

  return json({ ok: true }, 200, request)
}

// ─── Router ─────────────────────────────────────────────────────────────────

const handler = {
  async fetch(request, env) {
    // Stash env on request so CORS helpers can gate localhost behind ENVIRONMENT=dev
    request.__env = env
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    try {
      // Health check (no rate limit, no auth)
      if (method === 'GET' && path === '/health') {
        try {
          await env.DB.prepare('SELECT 1').first()
          return json({ status: 'ok', db: true, timestamp: new Date().toISOString() }, 200, request)
        } catch (e) {
          return json({ status: 'degraded', db: false, error: e.message }, 503, request)
        }
      }

      // Rate limiting
      const [routeGroup, limit] = getRouteGroup(path, false)
      const rateLimited = await checkRateLimit(request, env.RATE_LIMITS, routeGroup, limit)
      if (rateLimited) return withSecurityHeaders(rateLimited)

      // Analytics event tracking
      if (method === 'POST' && path === '/analytics/event') {
        const jwtPayload = await authenticate(request, env)
        const userId = jwtPayload ? jwtPayload.sub : null
        const body = await request.json()
        await env.DB.prepare(
          'INSERT INTO analytics_events (event_type, user_id, session_id, metadata) VALUES (?, ?, ?, ?)'
        ).bind(body.event_type, userId, body.session_id || null, JSON.stringify(body.metadata || {})).run()
        return json({ ok: true }, 200, request)
      }

      // Public routes
      if (method === 'POST' && path === '/auth/google') return await handleGoogleLogin(request, env)
      if (method === 'POST' && path === '/auth/refresh') return await handleRefresh(request, env)

      // ─── Phone OTP routes ───────────────────────────────────────────────────────

      if (path === '/auth/phone/send-otp' && request.method === 'POST') {
        if (!featureFlag(env, 'PHONE_AUTH_ENABLED')) {
          return error('Phone auth temporarily unavailable', 503, request)
        }

        const body = await request.json().catch(() => ({}))
        const phone = body.phone
        const purpose = body.purpose
        const VALID_PURPOSES = ['login', 'link', 'family_head_approval']

        if (!phone || !/^\+\d{6,15}$/.test(phone)) {
          return error('Invalid phone format. Use E.164 (e.g. +233241234567).', 400, request)
        }
        if (!VALID_PURPOSES.includes(purpose)) {
          return error('Invalid purpose', 400, request)
        }

        const ip = getClientIP(request)

        // Rate limits — per-phone (3/10min, 10/24h), per-IP (20/hour), per-IP-per-phone (5/hour)
        const tenMin = 600
        const oneHour = 3600
        const oneDay = 86400

        const phoneCount10m = parseInt(await env.RATE_LIMITS.get(`otp:phone:10m:${phone}`)) || 0
        if (phoneCount10m >= 3) {
          return error('Too many requests. Try again in 10 minutes.', 429, request)
        }
        const phoneCount24h = parseInt(await env.RATE_LIMITS.get(`otp:phone:24h:${phone}`)) || 0
        if (phoneCount24h >= 10) {
          return error('Daily limit reached.', 429, request)
        }
        const ipCount1h = parseInt(await env.RATE_LIMITS.get(`otp:ip:1h:${ip}`)) || 0
        if (ipCount1h >= 20) {
          return error('Too many requests from this network.', 429, request)
        }
        const ipPhoneCount1h = parseInt(await env.RATE_LIMITS.get(`otp:ipphone:1h:${ip}:${phone}`)) || 0
        if (ipPhoneCount1h >= 5) {
          return error('Too many requests.', 429, request)
        }

        // Lockout check
        const locked = await env.RATE_LIMITS.get(`otp:lockout:${phone}`)
        if (locked) {
          return error('Phone temporarily locked due to too many failed attempts.', 429, request)
        }

        // Provider routing
        let provider
        try {
          provider = selectProvider(phone)
        } catch {
          return error('Unsupported phone number', 400, request)
        }

        // Generate code, store hash
        const code = generateOtp()
        const codeHash = await hashOtp(code, env.OTP_PEPPER)
        const expiresAt = Date.now() + 10 * 60 * 1000

        await env.DB.prepare(
          `INSERT INTO phone_otps (phone_e164, code_hash, provider, purpose, ip_address, user_agent, expires_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          phone,
          codeHash,
          provider,
          purpose,
          ip,
          request.headers.get('User-Agent') || '',
          expiresAt,
          Date.now()
        ).run()

        // Send via provider
        const sendResult = provider === 'termii'
          ? await sendTermiiOtp({ apiKey: env.TERMII_API_KEY, toE164: phone, code })
          : await sendTwilioOtp({
              accountSid: env.TWILIO_ACCOUNT_SID,
              authToken: env.TWILIO_AUTH_TOKEN,
              fromNumber: env.TWILIO_FROM_NUMBER,
              toE164: phone,
              code,
            })

        if (!sendResult.ok) {
          console.error('OTP send failed', { provider, status: sendResult.status })
          return error('Could not send code right now. Please try again.', 503, request)
        }

        // Increment rate-limit counters (after successful send)
        await env.RATE_LIMITS.put(`otp:phone:10m:${phone}`, String(phoneCount10m + 1), { expirationTtl: tenMin })
        await env.RATE_LIMITS.put(`otp:phone:24h:${phone}`, String(phoneCount24h + 1), { expirationTtl: oneDay })
        await env.RATE_LIMITS.put(`otp:ip:1h:${ip}`, String(ipCount1h + 1), { expirationTtl: oneHour })
        await env.RATE_LIMITS.put(`otp:ipphone:1h:${ip}:${phone}`, String(ipPhoneCount1h + 1), { expirationTtl: oneHour })

        return json({ ok: true, provider, expires_in: 600, resend_after: 30 }, 200, request)
      }

      /**
       * Verify an OTP for a given (phone, purpose) WITHOUT issuing JWT.
       * Returns { ok: true } on success or { ok: false, response: <Response> } on failure.
       */
      async function verifyOtpForPurpose(env, request, phone, code, purpose) {
        if (!/^\d{6}$/.test(code || '')) {
          return { ok: false, response: error('Invalid code format', 400, request) }
        }

        const locked = await env.RATE_LIMITS.get(`otp:lockout:${phone}`)
        if (locked) {
          return { ok: false, response: error('Phone temporarily locked.', 429, request) }
        }

        const row = await env.DB.prepare(
          `SELECT id, code_hash, expires_at, attempts, consumed_at
           FROM phone_otps
           WHERE phone_e164 = ? AND purpose = ? AND consumed_at IS NULL
           ORDER BY created_at DESC LIMIT 1`
        ).bind(phone, purpose).first()

        if (!row) return { ok: false, response: error('No code pending for this phone', 401, request) }
        if (row.expires_at < Date.now()) return { ok: false, response: error('Code expired. Request a new one.', 401, request) }
        if (row.attempts >= 5) {
          await env.RATE_LIMITS.put(`otp:lockout:${phone}`, '1', { expirationTtl: 3600 })
          return { ok: false, response: error('Too many wrong attempts. Phone locked for 1 hour.', 429, request) }
        }

        await env.DB.prepare(`UPDATE phone_otps SET attempts = attempts + 1 WHERE id = ?`).bind(row.id).run()

        const ok = await verifyOtp(code, row.code_hash, env.OTP_PEPPER)
        if (!ok) {
          await logAudit(env.DB, {
            action: 'phone_otp_verify_failed',
            detail: { phone, purpose, reason: 'wrong_code' },
            ipAddress: getClientIP(request),
          })
          return { ok: false, response: error('Wrong code', 401, request) }
        }

        await env.DB.prepare(`UPDATE phone_otps SET consumed_at = ? WHERE id = ?`).bind(Date.now(), row.id).run()
        return { ok: true }
      }

      if (path === '/auth/phone/verify' && request.method === 'POST') {
        if (!featureFlag(env, 'PHONE_AUTH_ENABLED')) {
          return error('Phone auth temporarily unavailable', 503, request)
        }

        const body = await request.json().catch(() => ({}))
        const { phone, code, purpose } = body
        if (!phone || !code || !purpose) {
          return error('Missing fields', 400, request)
        }

        const verifyResult = await verifyOtpForPurpose(env, request, phone, code, purpose)
        if (!verifyResult.ok) return verifyResult.response

        // For non-login purposes (link, family_head_approval), don't issue JWT — caller handles.
        if (purpose !== 'login') {
          return json({ ok: true, verified: true }, 200, request)
        }

        // Find or create user by phone
        let user = await env.DB.prepare(
          `SELECT id, email, name, picture, auth_methods, phone_e164 FROM users WHERE phone_e164 = ?`
        ).bind(phone).first()

        if (!user) {
          const result = await env.DB.prepare(
            `INSERT INTO users (email, name, phone_e164, phone_verified_at, auth_methods, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(
            `phone-${phone}@phone.funeralpress.org`,
            'Phone user',
            phone,
            Date.now(),
            'phone',
            Date.now()
          ).run()
          user = {
            id: result.meta.last_row_id,
            email: null,
            name: 'Phone user',
            picture: null,
            auth_methods: 'phone',
            phone_e164: phone,
          }
        }

        // Issue JWT (1 hour expiry — match existing pattern)
        const token = await signJWT(
          { sub: String(user.id), email: user.email, name: user.name, exp: Math.floor(Date.now() / 1000) + 3600 },
          env.JWT_SECRET
        )

        // Issue refresh token — matches the existing /auth/google pattern exactly:
        // randomHex(64) raw token, hashToken for DB storage, 30-day expiry ISO string,
        // INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
        const refreshRaw = randomHex(64)
        const refreshHash = await hashToken(refreshRaw)
        const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
        await env.DB.prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
          .bind(generateId(), user.id, refreshHash, expiresAt).run()

        await logAudit(env.DB, {
          userId: user.id,
          action: 'phone_login_success',
          detail: { phone },
          ipAddress: getClientIP(request),
        })

        return json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone_e164: user.phone_e164,
            auth_methods: user.auth_methods,
          },
          refresh_token: refreshRaw,
        }, 200, request)
      }

      if (path === '/auth/phone/link' && request.method === 'POST') {
        if (!featureFlag(env, 'PHONE_AUTH_ENABLED')) {
          return error('Phone auth temporarily unavailable', 503, request)
        }
        const auth = await authenticate(request, env)
        if (!auth) return error('Auth required', 401, request)

        const body = await request.json().catch(() => ({}))
        const { phone, code } = body
        if (!phone || !code) return error('Missing fields', 400, request)
        if (!/^\+\d{6,15}$/.test(phone)) return error('Invalid phone format', 400, request)

        // Conflict check — phone owned by another user
        const existing = await env.DB.prepare(
          `SELECT id FROM users WHERE phone_e164 = ? AND id != ?`
        ).bind(phone, auth.sub).first()
        if (existing) {
          return json({ error: 'Phone already linked to another account', code: 'phone_already_linked' }, 409, request)
        }

        const verifyResult = await verifyOtpForPurpose(env, request, phone, code, 'link')
        if (!verifyResult.ok) return verifyResult.response

        const u = await env.DB.prepare(`SELECT auth_methods FROM users WHERE id = ?`).bind(auth.sub).first()
        const methods = new Set((u?.auth_methods || 'google').split(',').filter(Boolean))
        methods.add('phone')
        const methodsStr = Array.from(methods).join(',')

        await env.DB.prepare(
          `UPDATE users SET phone_e164 = ?, phone_verified_at = ?, auth_methods = ? WHERE id = ?`
        ).bind(phone, Date.now(), methodsStr, auth.sub).run()

        await logAudit(env.DB, {
          userId: auth.sub,
          action: 'phone_linked',
          detail: { phone },
          ipAddress: getClientIP(request),
        })

        return json({ ok: true, phone_e164: phone, auth_methods: methodsStr }, 200, request)
      }

      if (path === '/auth/phone/unlink' && request.method === 'POST') {
        const auth = await authenticate(request, env)
        if (!auth) return error('Auth required', 401, request)

        const u = await env.DB.prepare(`SELECT auth_methods FROM users WHERE id = ?`).bind(auth.sub).first()
        const methods = new Set((u?.auth_methods || '').split(',').filter(Boolean))
        if (!methods.has('google')) {
          return error('Cannot unlink phone — would leave you with no sign-in method.', 400, request)
        }
        methods.delete('phone')
        const methodsStr = Array.from(methods).join(',')

        await env.DB.prepare(
          `UPDATE users SET phone_e164 = NULL, phone_verified_at = NULL, auth_methods = ? WHERE id = ?`
        ).bind(methodsStr, auth.sub).run()

        await logAudit(env.DB, {
          userId: auth.sub,
          action: 'phone_unlinked',
          ipAddress: getClientIP(request),
        })

        return json({ ok: true, auth_methods: methodsStr }, 200, request)
      }

      if (method === 'GET' && path.startsWith('/images/')) return await handleImageServe(request, env, path.slice(8))
      if (method === 'POST' && path === '/payments/webhook') return await handlePaymentWebhook(request, env)
      if (method === 'POST' && path === '/subscriptions/webhook') return await handleSubscriptionWebhook(request, env)
      const publicPartnerMatch = method === 'GET' && path.match(/^\/partner\/public\/([^/]+)$/)
      if (publicPartnerMatch) return await handlePublicPartnerPage(request, env, publicPartnerMatch[1])

      // Public guest book, obituary, gallery
      const guestBookMatch = method === 'GET' && path.match(/^\/guest-book\/([^/]+)$/)
      if (guestBookMatch) return await handleGetGuestBook(request, env, guestBookMatch[1])
      const guestSignMatch = method === 'POST' && path.match(/^\/guest-book\/([^/]+)\/sign$/)
      if (guestSignMatch) return await handleSignGuestBook(request, env, guestSignMatch[1])
      const obituaryMatch = method === 'GET' && path.match(/^\/obituary\/([^/]+)$/)
      if (obituaryMatch) return await handleGetObituary(request, env, obituaryMatch[1])
      const galleryMatch = method === 'GET' && path.match(/^\/gallery\/([^/]+)$/)
      if (galleryMatch) return await handleGetGallery(request, env, galleryMatch[1])

      // Public venues listing
      if (method === 'GET' && path === '/venues') return await handleListVenues(request, env)

      // Admin routes (no JWT, uses X-Admin-Secret)
      if (method === 'POST' && path === '/admin/make-partner') return await handleMakePartner(request, env)

      // Super admin routes (JWT-based, checks SUPER_ADMINS)
      if (path.startsWith('/admin/')) {
        if (method === 'GET' && path === '/admin/overview') return await handleAdminOverview(request, env)
        if (method === 'GET' && path === '/admin/users') return await handleAdminUsers(request, env)
        if (method === 'POST' && path === '/admin/users/grant-credits') return await handleAdminGrantCredits(request, env)
        if (method === 'GET' && path === '/admin/orders') return await handleAdminOrders(request, env)
        if (method === 'GET' && path === '/admin/partners') return await handleAdminPartners(request, env)
        if (method === 'POST' && path === '/admin/partners/promote') return await handleAdminPromotePartner(request, env)
        if (method === 'POST' && path === '/admin/partners/demote') return await handleAdminDemotePartner(request, env)
        if (method === 'POST' && path === '/admin/partners/commission-override') return await handleAdminSetCommissionOverride(request, env)
        if (method === 'POST' && path === '/admin/partners/set-type') return await handleAdminSetPartnerType(request, env)
        if (method === 'GET' && path === '/admin/designs') return await handleAdminDesigns(request, env)
        if (method === 'GET' && path === '/admin/print-orders') return await handleAdminPrintOrders(request, env)
        if (method === 'GET' && path === '/admin/analytics/overview') return await handleAdminAnalyticsOverview(request, env)
        if (method === 'GET' && path === '/admin/analytics/revenue') return await handleAdminAnalyticsRevenue(request, env)
        if (method === 'GET' && path === '/admin/analytics/templates') return await handleAdminAnalyticsTemplates(request, env)
        const adminPrintMatch = path.match(/^\/admin\/print-orders\/([^/]+)$/)
        if (adminPrintMatch && method === 'PUT') return await handleAdminUpdatePrintOrder(request, env, adminPrintMatch[1])

        // Admin venue routes
        if (method === 'POST' && path === '/admin/venues') return await handleAdminCreateVenue(request, env)
        const adminVenueMatch = path.match(/^\/admin\/venues\/([^/]+)$/)
        if (adminVenueMatch && method === 'PUT') return await handleAdminUpdateVenue(request, env, adminVenueMatch[1])

        // Admin role management (super admin only)
        const grantAdminMatch = path.match(/^\/admin\/users\/([^/]+)\/grant-admin$/)
        if (grantAdminMatch && method === 'POST') {
          const auth = await requireSuperAdmin(request, env)
          if (auth.error) return auth.error
          const targetUserId = grantAdminMatch[1]

          const target = await env.DB.prepare('SELECT id, email FROM users WHERE id = ? AND deleted_at IS NULL').bind(targetUserId).first()
          if (!target) return error('User not found', 404, request)

          await env.DB.prepare(
            `INSERT OR IGNORE INTO user_roles (user_id, role_id, granted_by) VALUES (?, 'role_admin', ?)`
          ).bind(targetUserId, auth.userId).run()

          await logAudit(env.DB, {
            userId: auth.userId,
            action: 'admin.grant',
            resourceType: 'user',
            resourceId: targetUserId,
            detail: { targetEmail: target.email, grantedBy: auth.email },
            ipAddress: getClientIP(request),
          })

          return json({ ok: true, userId: targetUserId, role: 'admin' }, 200, request)
        }

        const revokeAdminMatch = path.match(/^\/admin\/users\/([^/]+)\/revoke-admin$/)
        if (revokeAdminMatch && method === 'POST') {
          const auth = await requireSuperAdmin(request, env)
          if (auth.error) return auth.error
          const targetUserId = revokeAdminMatch[1]

          const target = await env.DB.prepare('SELECT id, email FROM users WHERE id = ? AND deleted_at IS NULL').bind(targetUserId).first()
          if (!target) return error('User not found', 404, request)

          if (isSuperAdmin(target.email)) {
            return error('Cannot revoke admin from super admin (super admin status is configured in code, not the database)', 400, request)
          }

          await env.DB.prepare(
            `DELETE FROM user_roles WHERE user_id = ? AND role_id = 'role_admin'`
          ).bind(targetUserId).run()

          await logAudit(env.DB, {
            userId: auth.userId,
            action: 'admin.revoke',
            resourceType: 'user',
            resourceId: targetUserId,
            detail: { targetEmail: target.email, revokedBy: auth.email },
            ipAddress: getClientIP(request),
          })

          return json({ ok: true, userId: targetUserId }, 200, request)
        }

        // Admin notifications
        if (method === 'GET' && path === '/admin/notifications') {
          const user = await authenticate(request, env)
          if (!user || !SUPER_ADMINS.includes(user.email)) return error('Forbidden', 403, request)
          const notifUrl = new URL(request.url)
          const limit = parseInt(notifUrl.searchParams.get('limit') || '50')
          const offset = parseInt(notifUrl.searchParams.get('offset') || '0')
          const typeFilter = notifUrl.searchParams.get('type') || ''

          let query = 'SELECT * FROM admin_notifications'
          const params = []
          if (typeFilter) {
            query += ' WHERE type = ?'
            params.push(typeFilter)
          }
          query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
          params.push(limit, offset)

          const { results } = await env.DB.prepare(query).bind(...params).all()
          const { results: countResult } = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM admin_notifications WHERE is_read = 0'
          ).all()

          return json({ notifications: results, unreadCount: countResult[0].count }, 200, request)
        }

        if (method === 'POST' && path === '/admin/notifications/read') {
          const user = await authenticate(request, env)
          if (!user || !SUPER_ADMINS.includes(user.email)) return error('Forbidden', 403, request)
          const body = await request.json()

          if (body.all) {
            await env.DB.prepare('UPDATE admin_notifications SET is_read = 1 WHERE is_read = 0').run()
          } else if (body.id) {
            await env.DB.prepare('UPDATE admin_notifications SET is_read = 1 WHERE id = ?').bind(body.id).run()
          }

          return json({ ok: true }, 200, request)
        }
      }

      // Authenticated routes
      const jwtPayload = await authenticate(request, env)
      if (!jwtPayload) return error('Unauthorized', 401, request)
      const userId = jwtPayload.sub

      if (method === 'POST' && path === '/auth/logout') return await handleLogout(request, env, userId)
      if (method === 'GET' && path === '/user/me') return await handleGetMe(request, env, userId)
      if (method === 'POST' && path === '/users/me/onboarded') return await handleMarkOnboarded(request, env, userId)
      if (method === 'POST' && path === '/referrals/track') return await handleTrackReferral(request, env, userId)
      if (method === 'GET' && path === '/partner/me') return await handleGetPartnerProfile(request, env, userId)
      if (method === 'GET' && path === '/partner/referrals') return await handleGetPartnerReferrals(request, env, userId)
      if (method === 'POST' && path === '/partner/update-profile') return await handleUpdatePartnerProfile(request, env, userId)
      if (method === 'POST' && path === '/partner/upload-logo') return await handlePartnerLogoUpload(request, env, userId)
      if (method === 'POST' && path === '/payments/initialize') return await handlePaymentInitialize(request, env, userId)
      if (method === 'POST' && path === '/payments/verify') return await handlePaymentVerify(request, env, userId)
      if (method === 'POST' && path === '/payments/unlock-design') return await handleUnlockDesign(request, env, userId)
      if (method === 'GET' && path === '/payments/status') return await handlePaymentStatus(request, env, userId)
      if (method === 'POST' && path === '/subscriptions/create') return await handleSubscriptionCreate(request, env, userId)
      if (method === 'GET' && path === '/subscriptions/status') return await handleSubscriptionStatus(request, env, userId)
      if (method === 'POST' && path === '/subscriptions/cancel') return await handleSubscriptionCancel(request, env, userId)
      if (method === 'POST' && path === '/print-orders/calculate') return await handlePrintCalculate(request, env, userId)
      if (method === 'POST' && path === '/print-orders/create') return await handlePrintOrderCreate(request, env, userId)
      if (method === 'POST' && path === '/print-orders/verify') return await handlePrintOrderVerify(request, env, userId)
      if (method === 'GET' && path === '/print-orders') return await handleListPrintOrders(request, env, userId)
      if (method === 'GET' && path === '/designs') return await handleListDesigns(request, env, userId)
      if (method === 'POST' && path === '/designs/sync') return await handleBulkSync(request, env, userId)
      if (method === 'POST' && path === '/images/upload') return await handleImageUpload(request, env, userId)

      // Guest books
      if (method === 'POST' && path === '/guest-books/create') return await handleCreateGuestBook(request, env, userId)
      if (method === 'GET' && path === '/guest-books') return await handleListUserGuestBooks(request, env, userId)

      // Obituary pages
      if (method === 'POST' && path === '/obituaries/create') return await handleCreateObituary(request, env, userId)
      if (method === 'GET' && path === '/obituaries') return await handleListUserObituaries(request, env, userId)
      const obituaryUpdateMatch = path.match(/^\/obituaries\/([^/]+)$/)
      if (obituaryUpdateMatch && method === 'PUT') return await handleUpdateObituary(request, env, userId, obituaryUpdateMatch[1])

      // Photo galleries
      if (method === 'POST' && path === '/galleries/create') return await handleCreateGallery(request, env, userId)
      if (method === 'GET' && path === '/galleries') return await handleListUserGalleries(request, env, userId)
      const galleryPhotoMatch = path.match(/^\/galleries\/([^/]+)\/photos$/)
      if (galleryPhotoMatch && method === 'POST') return await handleAddGalleryPhoto(request, env, userId, galleryPhotoMatch[1])
      const galleryPhotoDeleteMatch = path.match(/^\/gallery-photos\/([^/]+)$/)
      if (galleryPhotoDeleteMatch && method === 'DELETE') return await handleDeleteGalleryPhoto(request, env, userId, galleryPhotoDeleteMatch[1])

      // Design CRUD with :id
      const designMatch = path.match(/^\/designs\/([^/]+)$/)
      if (designMatch) {
        const designId = designMatch[1]
        if (method === 'GET') return await handleGetDesign(request, env, userId, designId)
        if (method === 'PUT') return await handleUpsertDesign(request, env, userId, designId)
        if (method === 'DELETE') return await handleDeleteDesign(request, env, userId, designId)
      }

      return error('Not found', 404, request)
    } catch (err) {
      // Always return CORS headers even on unexpected errors
      return json({ error: err.message || 'Internal server error' }, 500, request)
    }
  },

  async scheduled(controller, env, ctx) {
    // Daily 08:00 UTC dunning sweep — walks past_due subscriptions through
    // Day 1 / Day 3 / Day 7-downgrade emails. See workers/utils/dunning.js.
    ctx.waitUntil(runDunningCron(env).catch(e => {
      console.error('[scheduled] runDunningCron failed:', e?.message || e)
    }))
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
