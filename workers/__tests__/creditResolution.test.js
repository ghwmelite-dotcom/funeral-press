import { describe, it, expect } from 'vitest'

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

describe('resolveCredit waterfall', () => {
  it('prefers active subscription credits first', () => {
    const user = { credits_remaining: 5 }
    const sub = { status: 'active', monthly_credits_remaining: 10 }
    const result = resolveCredit(user, sub)
    expect(result.source).toBe('subscription')
  })

  it('skips subscription if no monthly credits left', () => {
    const user = { credits_remaining: 3 }
    const sub = { status: 'active', monthly_credits_remaining: 0 }
    const result = resolveCredit(user, sub)
    expect(result.source).toBe('credit')
  })

  it('skips subscription if status is not active', () => {
    const user = { credits_remaining: 2 }
    const sub = { status: 'past_due', monthly_credits_remaining: 5 }
    const result = resolveCredit(user, sub)
    expect(result.source).toBe('credit')
  })

  it('falls back to unlimited suite', () => {
    const user = { credits_remaining: -1 }
    const result = resolveCredit(user, null)
    expect(result.source).toBe('unlimited_suite')
    expect(result.deduct).toBeNull()
  })

  it('uses one-time credits when no subscription', () => {
    const user = { credits_remaining: 1 }
    const result = resolveCredit(user, null)
    expect(result.source).toBe('credit')
    expect(result.deduct).toBe('user')
  })

  it('returns null when no credits anywhere', () => {
    const user = { credits_remaining: 0 }
    const result = resolveCredit(user, null)
    expect(result).toBeNull()
  })

  it('returns null with cancelled subscription and no credits', () => {
    const user = { credits_remaining: 0 }
    const sub = { status: 'cancelled', monthly_credits_remaining: 0 }
    const result = resolveCredit(user, sub)
    expect(result).toBeNull()
  })

  it('unlimited suite overrides zero subscription credits', () => {
    const user = { credits_remaining: -1 }
    const sub = { status: 'active', monthly_credits_remaining: 0 }
    const result = resolveCredit(user, sub)
    expect(result.source).toBe('unlimited_suite')
  })
})
