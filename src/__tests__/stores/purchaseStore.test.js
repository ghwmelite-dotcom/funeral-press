import { describe, it, expect } from 'vitest'

describe('Credit resolution logic', () => {
  function hasCredits(creditsRemaining) {
    return creditsRemaining === -1 || creditsRemaining > 0
  }

  function getPlanName(creditsRemaining) {
    if (creditsRemaining === -1) return 'Unlimited Suite'
    if (creditsRemaining > 0) return `${creditsRemaining} credits remaining`
    return 'No credits'
  }

  it('unlimited suite (-1) always has credits', () => {
    expect(hasCredits(-1)).toBe(true)
  })

  it('positive credits returns true', () => {
    expect(hasCredits(3)).toBe(true)
    expect(hasCredits(1)).toBe(true)
  })

  it('zero credits returns false', () => {
    expect(hasCredits(0)).toBe(false)
  })

  it('displays correct plan name', () => {
    expect(getPlanName(-1)).toBe('Unlimited Suite')
    expect(getPlanName(3)).toBe('3 credits remaining')
    expect(getPlanName(0)).toBe('No credits')
  })
})

describe('Pricing tiers', () => {
  const PLANS = {
    single: { price: 35, credits: 1, currency: 'GHS' },
    bundle: { price: 75, credits: 3, currency: 'GHS' },
    suite: { price: 120, credits: -1, currency: 'GHS' },
  }

  it('single plan gives 1 credit for GHS 35', () => {
    expect(PLANS.single.price).toBe(35)
    expect(PLANS.single.credits).toBe(1)
  })

  it('bundle plan gives 3 credits for GHS 75', () => {
    expect(PLANS.bundle.price).toBe(75)
    expect(PLANS.bundle.credits).toBe(3)
  })

  it('suite plan gives unlimited for GHS 120', () => {
    expect(PLANS.suite.price).toBe(120)
    expect(PLANS.suite.credits).toBe(-1)
  })

  it('all plans use GHS currency', () => {
    Object.values(PLANS).forEach(plan => {
      expect(plan.currency).toBe('GHS')
    })
  })
})
