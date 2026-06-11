// workers/stripeClient.js
// Minimal Stripe REST client for Workers — no SDK. Form-encoded requests,
// inline price_data (no dashboard product setup), webhook signature
// verification per https://stripe.com/docs/webhooks/signatures.

const STRIPE_API = 'https://api.stripe.com/v1'
const SIGNATURE_TOLERANCE_SECONDS = 300

export function encodeForm(obj, prefix = '') {
  const parts = []
  for (const [key, value] of Object.entries(obj)) {
    if (value == null) continue
    const name = prefix ? `${prefix}[${key}]` : key
    if (Array.isArray(value)) {
      value.forEach((item, i) => parts.push(encodeForm(item, `${name}[${i}]`)))
    } else if (typeof value === 'object') {
      parts.push(encodeForm(value, name))
    } else {
      parts.push(`${name}=${encodeURIComponent(value)}`)
    }
  }
  return parts.filter(Boolean).join('&')
}

export async function stripeRequest(env, path, params, method = 'POST') {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: method === 'GET' ? undefined : encodeForm(params || {}),
  })
  const data = await res.json()
  if (!res.ok) {
    const message = data?.error?.message || `Stripe ${path} failed (${res.status})`
    throw new Error(message)
  }
  return data
}

export async function verifyStripeSignature(body, header, secret, nowMs) {
  if (!header || typeof header !== 'string') return false
  const parts = Object.fromEntries(
    header.split(',').map((p) => p.split('=')).filter((kv) => kv.length === 2)
  )
  const t = parseInt(parts.t, 10)
  const v1 = parts.v1
  if (!t || !v1) return false
  if (Math.abs(nowMs / 1000 - t) > SIGNATURE_TOLERANCE_SECONDS) return false

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${body}`))
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return expected === v1
}

export function checkoutSessionParams({ productKey, currency, amount, label, interval, email, successUrl, cancelUrl, metadata }) {
  const priceData = {
    currency: currency.toLowerCase(),
    unit_amount: amount,
    product_data: { name: label },
  }
  if (interval) priceData.recurring = { interval }

  const params = {
    mode: interval ? 'subscription' : 'payment',
    line_items: [{ quantity: 1, price_data: priceData }],
    customer_email: email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  }
  // Stripe copies session metadata to the PaymentIntent but NOT to the
  // Subscription — mirror it so renewal webhooks can identify the plan.
  if (interval) params.subscription_data = { metadata }
  return params
}
