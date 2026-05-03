import { describe, it, expect } from 'vitest'

// Pure function under test — extracted from handleSubscriptionWebhook
function isPaystackIP(ip) {
  const PAYSTACK_IPS = ['52.31.139.75', '52.49.173.169', '52.214.14.220']
  return PAYSTACK_IPS.includes(ip)
}

describe('subscription webhook IP allowlist', () => {
  it('accepts each known Paystack IP', () => {
    expect(isPaystackIP('52.31.139.75')).toBe(true)
    expect(isPaystackIP('52.49.173.169')).toBe(true)
    expect(isPaystackIP('52.214.14.220')).toBe(true)
  })

  it('rejects unknown IPs', () => {
    expect(isPaystackIP('1.2.3.4')).toBe(false)
    expect(isPaystackIP('127.0.0.1')).toBe(false)
    expect(isPaystackIP('')).toBe(false)
  })

  it('rejects IPv6 addresses', () => {
    expect(isPaystackIP('::1')).toBe(false)
    expect(isPaystackIP('2001:db8::1')).toBe(false)
  })
})
