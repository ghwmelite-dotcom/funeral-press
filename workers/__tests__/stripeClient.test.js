// workers/__tests__/stripeClient.test.js
import { describe, it, expect } from 'vitest'
import { encodeForm, verifyStripeSignature, checkoutSessionParams } from '../stripeClient.js'

describe('encodeForm', () => {
  it('flattens nested objects into Stripe bracket notation', () => {
    expect(encodeForm({
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: 'gbp', unit_amount: 900 } }],
      metadata: { userId: 'u1' },
    })).toBe(
      'mode=payment' +
      '&line_items[0][quantity]=1' +
      '&line_items[0][price_data][currency]=gbp' +
      '&line_items[0][price_data][unit_amount]=900' +
      '&metadata[userId]=u1'
    )
  })
  it('url-encodes values', () => {
    expect(encodeForm({ success_url: 'https://x.org/a?b=1' }))
      .toBe('success_url=' + encodeURIComponent('https://x.org/a?b=1'))
  })
})

describe('verifyStripeSignature', () => {
  // Signed payload format: `${t}.${body}`, HMAC-SHA256 hex with the webhook secret.
  async function sign(body, t, secret) {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${body}`))
    return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  it('accepts a valid recent signature', async () => {
    const body = '{"id":"evt_1"}'
    const t = Math.floor(Date.now() / 1000)
    const v1 = await sign(body, t, 'whsec_test')
    const ok = await verifyStripeSignature(body, `t=${t},v1=${v1}`, 'whsec_test', Date.now())
    expect(ok).toBe(true)
  })
  it('rejects a bad signature', async () => {
    const t = Math.floor(Date.now() / 1000)
    const ok = await verifyStripeSignature('{"id":"evt_1"}', `t=${t},v1=deadbeef`, 'whsec_test', Date.now())
    expect(ok).toBe(false)
  })
  it('rejects a stale timestamp (replay)', async () => {
    const body = '{"id":"evt_1"}'
    const t = Math.floor(Date.now() / 1000) - 600 // 10 min old, tolerance is 5
    const v1 = await sign(body, t, 'whsec_test')
    const ok = await verifyStripeSignature(body, `t=${t},v1=${v1}`, 'whsec_test', Date.now())
    expect(ok).toBe(false)
  })
  it('rejects a missing/malformed header', async () => {
    expect(await verifyStripeSignature('{}', null, 'whsec_test', Date.now())).toBe(false)
    expect(await verifyStripeSignature('{}', 'garbage', 'whsec_test', Date.now())).toBe(false)
  })
})

describe('checkoutSessionParams', () => {
  const base = {
    productKey: 'single', currency: 'GBP', amount: 900, label: 'Single Design',
    email: 'a@b.com', successUrl: 'https://funeralpress.org/my-designs?session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: 'https://funeralpress.org/', metadata: { userId: 'u1', productKey: 'single' },
  }
  it('builds a one-time payment session', () => {
    const p = checkoutSessionParams({ ...base, interval: null })
    expect(p.mode).toBe('payment')
    expect(p.line_items[0].price_data.currency).toBe('gbp')
    expect(p.line_items[0].price_data.unit_amount).toBe(900)
    expect(p.line_items[0].price_data.product_data.name).toBe('Single Design')
    expect(p.metadata.userId).toBe('u1')
    expect(p.customer_email).toBe('a@b.com')
  })
  it('builds a subscription session with recurring interval and mirrored metadata', () => {
    const p = checkoutSessionParams({ ...base, productKey: 'pro_monthly', interval: 'month' })
    expect(p.mode).toBe('subscription')
    expect(p.line_items[0].price_data.recurring.interval).toBe('month')
    expect(p.subscription_data.metadata.userId).toBe('u1')
  })
})
