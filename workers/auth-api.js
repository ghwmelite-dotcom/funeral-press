// FuneralPress Auth API Worker
// Bindings: DB (D1), IMAGES (R2), JWT_SECRET (secret), GOOGLE_CLIENT_ID (var)

const ALLOWED_ORIGINS = [
  'https://funeral-brochure-app.pages.dev',
  'https://funeralpress.org',
  'https://www.funeralpress.org',
  'http://localhost:5173',
  'http://localhost:4173',
]

function getCorsOrigin(request) {
  const origin = request.headers.get('Origin') || ''
  // Allow any *.funeral-brochure-app.pages.dev preview URL
  if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.funeral-brochure-app.pages.dev')) {
    return origin
  }
  return ALLOWED_ORIGINS[0]
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
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  })
}

function error(message, status = 400, request) {
  return json({ error: message }, status, request)
}

// ─── JWT helpers (Workers-compatible, no Node libs) ─────────────────────────

async function signJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const enc = new TextEncoder()
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const data = `${headerB64}.${payloadB64}`
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${data}.${sigB64}`
}

async function verifyJWT(token, secret) {
  try {
    const [headerB64, payloadB64, sigB64] = token.split('.')
    if (!headerB64 || !payloadB64 || !sigB64) return null
    const enc = new TextEncoder()
    const data = `${headerB64}.${payloadB64}`
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sig = Uint8Array.from(atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(data))
    if (!valid) return null
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.exp && Date.now() / 1000 > payload.exp) return null
    return payload
  } catch {
    return null
  }
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

const SUPER_ADMINS = ['oh84dev@gmail.com']

async function requireAdmin(request, env) {
  const jwtPayload = await authenticate(request, env)
  if (!jwtPayload) return { error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders(request) } }) }
  const user = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(jwtPayload.sub).first()
  if (!user || !SUPER_ADMINS.includes(user.email)) {
    return { error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders(request) } }) }
  }
  return { userId: jwtPayload.sub }
}

// ─── Payment constants ───────────────────────────────────────────────────────

const PLANS = {
  single: { amount: 3500, credits: 1 },
  bundle: { amount: 7500, credits: 3 },
  suite:  { amount: 12000, credits: -1 }, // -1 = unlimited
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
  if (!user) {
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

  return json({
    user: {
      id: user.id, email: user.email, name: user.name, picture: user.picture,
      isPartner: !!(user.is_partner), referralCode: user.referral_code || null,
      isAdmin: SUPER_ADMINS.includes(user.email),
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

  return json({
    user: {
      id: user.id, email: user.email, name: user.name, picture: user.picture,
      isPartner: !!(user.is_partner), referralCode: user.referral_code || null,
      isAdmin: SUPER_ADMINS.includes(user.email),
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
  const user = await env.DB.prepare('SELECT id, email, name, picture, is_partner, referral_code, partner_name FROM users WHERE id = ?').bind(userId).first()
  if (!user) return error('User not found', 404, request)
  const purchaseData = await getUserPurchaseData(env, userId)
  return json({
    user: {
      id: user.id, email: user.email, name: user.name, picture: user.picture,
      isPartner: !!(user.is_partner), referralCode: user.referral_code || null, partnerName: user.partner_name || null,
      isAdmin: SUPER_ADMINS.includes(user.email),
      credits: purchaseData.credits,
      isUnlimited: purchaseData.isUnlimited,
      unlockedDesigns: purchaseData.unlockedDesigns,
    },
  }, 200, request)
}

// ─── Design CRUD ────────────────────────────────────────────────────────────

async function handleListDesigns(request, env, userId) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  let rows
  if (type) {
    rows = await env.DB.prepare('SELECT id, product_type, name, updated_at FROM designs WHERE user_id = ? AND product_type = ? ORDER BY updated_at DESC')
      .bind(userId, type).all()
  } else {
    rows = await env.DB.prepare('SELECT id, product_type, name, updated_at FROM designs WHERE user_id = ? ORDER BY updated_at DESC')
      .bind(userId).all()
  }
  return json({ designs: rows.results }, 200, request)
}

async function handleUpsertDesign(request, env, userId, designId) {
  const { product_type, name, data, updated_at } = await request.json()
  if (!product_type || !data) return error('Missing product_type or data', 400, request)

  const updatedAt = updated_at || new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO designs (id, user_id, product_type, name, data, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, data = excluded.data, updated_at = excluded.updated_at`
  ).bind(designId, userId, product_type, name || 'Untitled', typeof data === 'string' ? data : JSON.stringify(data), updatedAt).run()

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
  await env.DB.prepare('DELETE FROM designs WHERE id = ? AND user_id = ?').bind(designId, userId).run()
  return json({ ok: true }, 200, request)
}

async function handleBulkSync(request, env, userId) {
  const { designs } = await request.json()
  if (!Array.isArray(designs)) return error('designs must be an array', 400, request)

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

  return json({ ok: true, count: batch.length }, 200, request)
}

// ─── Image upload/serve ─────────────────────────────────────────────────────

async function handleImageUpload(request, env, userId) {
  const formData = await request.formData()
  const file = formData.get('file')
  const designId = formData.get('designId') || 'misc'
  const fieldPath = formData.get('fieldPath') || 'unknown'

  if (!file) return error('No file provided', 400, request)

  const ext = file.name?.split('.').pop() || 'jpg'
  const key = `${userId}/${designId}/${fieldPath}-${Date.now()}.${ext}`

  await env.IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'image/jpeg' },
  })

  return json({ url: `/images/${key}` }, 200, request)
}

async function handleImageServe(request, env, key) {
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

  return json({ ok: true }, 200, request)
}

async function handleGetPartnerProfile(request, env, userId) {
  const user = await env.DB.prepare('SELECT id, partner_name, referral_code, is_partner FROM users WHERE id = ? AND is_partner = 1').bind(userId).first()
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

async function handlePaymentInitialize(request, env, userId) {
  const { plan } = await request.json()
  if (!plan || !PLANS[plan]) return error('Invalid plan', 400, request)

  const planInfo = PLANS[plan]
  const user = await env.DB.prepare('SELECT id, email FROM users WHERE id = ?').bind(userId).first()
  if (!user) return error('User not found', 404, request)

  // Check for referral partner (for commission tracking)
  const referral = await env.DB.prepare('SELECT partner_id FROM referrals WHERE referred_user_id = ?').bind(userId).first()
  const partnerId = referral?.partner_id || null
  const commissionRate = partnerId ? 0.10 : null
  const commissionAmount = partnerId ? Math.round(planInfo.amount * 0.10) : null

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
  const purchaseData = await getUserPurchaseData(env, userId)
  return json({ verified: true, ...purchaseData }, 200, request)
}

async function handlePaymentWebhook(request, env) {
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

  const order = await env.DB.prepare('SELECT * FROM orders WHERE paystack_reference = ?').bind(reference).first()
  if (!order) return json({ ok: true }, 200, request)

  await markOrderPaid(env, order)
  return json({ ok: true }, 200, request)
}

async function handleUnlockDesign(request, env, userId) {
  const { designId, productType } = await request.json()
  if (!designId || !productType) return error('Missing designId or productType', 400, request)

  // Check if already unlocked (idempotent)
  const existing = await env.DB.prepare('SELECT id FROM unlocked_designs WHERE user_id = ? AND design_id = ?').bind(userId, designId).first()
  if (existing) {
    const purchaseData = await getUserPurchaseData(env, userId)
    return json({ unlocked: true, ...purchaseData }, 200, request)
  }

  // Check credits
  const user = await env.DB.prepare('SELECT credits_remaining FROM users WHERE id = ?').bind(userId).first()
  const credits = user?.credits_remaining ?? 0
  if (credits === 0) return error('No credits remaining', 402, request)

  // Find most recent successful order for this user
  const order = await env.DB.prepare("SELECT id FROM orders WHERE user_id = ? AND status = 'success' ORDER BY paid_at DESC LIMIT 1").bind(userId).first()
  if (!order) return error('No valid order found', 402, request)

  // Decrement credits (only if not unlimited)
  if (credits > 0) {
    await env.DB.prepare('UPDATE users SET credits_remaining = credits_remaining - 1 WHERE id = ?').bind(userId).run()
  }

  await env.DB.prepare('INSERT INTO unlocked_designs (id, user_id, order_id, design_id, product_type) VALUES (?, ?, ?, ?, ?)')
    .bind(generateId(), userId, order.id, designId, productType).run()

  const purchaseData = await getUserPurchaseData(env, userId)
  return json({ unlocked: true, ...purchaseData }, 200, request)
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

  let where = '1=1'
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
            (SELECT COUNT(*) FROM unlocked_designs WHERE user_id = u.id) as unlock_count
     FROM users u WHERE ${where}
     ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...binds, perPage, offset).all()

  return json({
    users: rows.results,
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

  let where = '1=1'
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
    where += ` AND o.created_at >= datetime('now', '-${parseInt(days)} days')`
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
    `SELECT u.id, u.name, u.email, u.partner_name, u.referral_code,
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

  return json({ ok: true, referralCode: code }, 200, request)
}

async function handleAdminDemotePartner(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error

  const { userId } = await request.json()
  if (!userId) return error('Missing userId', 400, request)

  await env.DB.prepare('UPDATE users SET is_partner = 0 WHERE id = ?').bind(userId).run()
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

// ─── Router ─────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    try {
      // Public routes
      if (method === 'POST' && path === '/auth/google') return await handleGoogleLogin(request, env)
      if (method === 'POST' && path === '/auth/refresh') return await handleRefresh(request, env)
      if (method === 'GET' && path.startsWith('/images/')) return await handleImageServe(request, env, path.slice(8))
      if (method === 'POST' && path === '/payments/webhook') return await handlePaymentWebhook(request, env)

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
        if (method === 'GET' && path === '/admin/designs') return await handleAdminDesigns(request, env)
      }

      // Authenticated routes
      const jwtPayload = await authenticate(request, env)
      if (!jwtPayload) return error('Unauthorized', 401, request)
      const userId = jwtPayload.sub

      if (method === 'POST' && path === '/auth/logout') return await handleLogout(request, env, userId)
      if (method === 'GET' && path === '/user/me') return await handleGetMe(request, env, userId)
      if (method === 'POST' && path === '/referrals/track') return await handleTrackReferral(request, env, userId)
      if (method === 'GET' && path === '/partner/me') return await handleGetPartnerProfile(request, env, userId)
      if (method === 'GET' && path === '/partner/referrals') return await handleGetPartnerReferrals(request, env, userId)
      if (method === 'POST' && path === '/payments/initialize') return await handlePaymentInitialize(request, env, userId)
      if (method === 'POST' && path === '/payments/verify') return await handlePaymentVerify(request, env, userId)
      if (method === 'POST' && path === '/payments/unlock-design') return await handleUnlockDesign(request, env, userId)
      if (method === 'GET' && path === '/payments/status') return await handlePaymentStatus(request, env, userId)
      if (method === 'GET' && path === '/designs') return await handleListDesigns(request, env, userId)
      if (method === 'POST' && path === '/designs/sync') return await handleBulkSync(request, env, userId)
      if (method === 'POST' && path === '/images/upload') return await handleImageUpload(request, env, userId)

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
}
