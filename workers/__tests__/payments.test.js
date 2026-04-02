import { describe, it, expect } from 'vitest'

describe('Paystack webhook signature verification', () => {
  async function verifyWebhookSignature(body, signature, secretKey) {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secretKey),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
    const expected = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    return expected === signature
  }

  it('verifies valid signature', async () => {
    const body = '{"event":"charge.success","data":{"reference":"test-123"}}'
    const secret = 'sk_test_secret'

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
    const validSig = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const result = await verifyWebhookSignature(body, validSig, secret)
    expect(result).toBe(true)
  })

  it('rejects invalid signature', async () => {
    const body = '{"event":"charge.success"}'
    const result = await verifyWebhookSignature(body, 'invalidsig', 'sk_test_secret')
    expect(result).toBe(false)
  })
})

describe('Paystack IP allowlist', () => {
  const PAYSTACK_IPS = ['52.31.139.75', '52.49.173.169', '52.214.14.220']

  it('allows known Paystack IPs', () => {
    expect(PAYSTACK_IPS.includes('52.31.139.75')).toBe(true)
    expect(PAYSTACK_IPS.includes('52.49.173.169')).toBe(true)
    expect(PAYSTACK_IPS.includes('52.214.14.220')).toBe(true)
  })

  it('rejects unknown IPs', () => {
    expect(PAYSTACK_IPS.includes('1.2.3.4')).toBe(false)
    expect(PAYSTACK_IPS.includes('0.0.0.0')).toBe(false)
  })
})

describe('credit resolution', () => {
  function resolveCredit(creditsRemaining) {
    if (creditsRemaining === -1) return 'unlimited'
    if (creditsRemaining > 0) return 'credit'
    return null
  }

  it('unlimited suite returns unlimited', () => {
    expect(resolveCredit(-1)).toBe('unlimited')
  })

  it('positive credits returns credit', () => {
    expect(resolveCredit(3)).toBe('credit')
    expect(resolveCredit(1)).toBe('credit')
  })

  it('zero credits returns null', () => {
    expect(resolveCredit(0)).toBeNull()
  })
})
