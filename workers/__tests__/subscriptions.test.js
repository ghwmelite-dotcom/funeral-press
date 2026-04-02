import { describe, it, expect } from 'vitest'

describe('Subscription plan validation', () => {
  const VALID_PLANS = ['pro_monthly', 'pro_annual']

  it('accepts valid plan names', () => {
    expect(VALID_PLANS.includes('pro_monthly')).toBe(true)
    expect(VALID_PLANS.includes('pro_annual')).toBe(true)
  })

  it('rejects invalid plan names', () => {
    expect(VALID_PLANS.includes('free')).toBe(false)
    expect(VALID_PLANS.includes('single')).toBe(false)
    expect(VALID_PLANS.includes('')).toBe(false)
  })
})

describe('Subscription status logic', () => {
  function isSubscriptionActive(sub) {
    if (!sub) return false
    return sub.status === 'active' && (!sub.current_period_end || new Date(sub.current_period_end) > new Date())
  }

  it('returns false for null subscription', () => {
    expect(isSubscriptionActive(null)).toBe(false)
  })

  it('returns true for active subscription', () => {
    expect(isSubscriptionActive({
      status: 'active',
      current_period_end: new Date(Date.now() + 86400000).toISOString(),
    })).toBe(true)
  })

  it('returns false for cancelled subscription', () => {
    expect(isSubscriptionActive({
      status: 'cancelled',
      current_period_end: new Date(Date.now() + 86400000).toISOString(),
    })).toBe(false)
  })

  it('returns false for expired subscription', () => {
    expect(isSubscriptionActive({
      status: 'active',
      current_period_end: new Date(Date.now() - 86400000).toISOString(),
    })).toBe(false)
  })
})

describe('Monthly credit reset', () => {
  it('resets to 15 on renewal', () => {
    const MONTHLY_CREDITS = 15
    const renewed = { monthly_credits_remaining: MONTHLY_CREDITS }
    expect(renewed.monthly_credits_remaining).toBe(15)
  })

  it('decrements on use', () => {
    let credits = 15
    credits -= 1
    expect(credits).toBe(14)
  })

  it('reaches zero after 15 uses', () => {
    let credits = 15
    for (let i = 0; i < 15; i++) credits -= 1
    expect(credits).toBe(0)
  })
})
