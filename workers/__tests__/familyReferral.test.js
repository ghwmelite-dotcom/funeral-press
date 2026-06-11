import { describe, it, expect } from 'vitest'
import {
  FAMILY_REWARD_PESEWAS,
  FAMILY_REWARD_CAP_PER_YEAR,
  referralTypeFor,
  initialRewardStatus,
  canGrantReward,
  applyReferralDiscount,
} from '../familyReferral.js'

describe('referralTypeFor', () => {
  it('classifies partners as partner referrals', () => {
    expect(referralTypeFor({ is_partner: 1 })).toBe('partner')
  })
  it('classifies ordinary users as family referrals', () => {
    expect(referralTypeFor({ is_partner: 0 })).toBe('family')
    expect(referralTypeFor({ is_partner: null })).toBe('family')
  })
})

describe('initialRewardStatus', () => {
  it('flags same-IP referrer/referred pairs for review', () => {
    expect(initialRewardStatus({ trackIpHash: 'abc', codeIpHash: 'abc' })).toBe('review')
  })
  it('is pending when IP hashes differ', () => {
    expect(initialRewardStatus({ trackIpHash: 'abc', codeIpHash: 'def' })).toBe('pending')
  })
  it('is pending when either hash is missing', () => {
    expect(initialRewardStatus({ trackIpHash: null, codeIpHash: 'def' })).toBe('pending')
    expect(initialRewardStatus({ trackIpHash: 'abc', codeIpHash: null })).toBe('pending')
  })
})

describe('canGrantReward', () => {
  it('allows grants below the 12-month cap', () => {
    expect(canGrantReward({ grantedLast12Months: 0 })).toBe(true)
    expect(canGrantReward({ grantedLast12Months: FAMILY_REWARD_CAP_PER_YEAR - 1 })).toBe(true)
  })
  it('blocks grants at or above the cap', () => {
    expect(canGrantReward({ grantedLast12Months: FAMILY_REWARD_CAP_PER_YEAR })).toBe(false)
    expect(canGrantReward({ grantedLast12Months: FAMILY_REWARD_CAP_PER_YEAR + 5 })).toBe(false)
  })
})

describe('applyReferralDiscount', () => {
  it('returns zero discount when balance is empty', () => {
    expect(applyReferralDiscount({ balancePesewas: 0, amountPesewas: 3500 }))
      .toEqual({ discount: 0, amount: 3500 })
  })
  it('applies the full balance when amount allows', () => {
    expect(applyReferralDiscount({ balancePesewas: 2000, amountPesewas: 3500 }))
      .toEqual({ discount: 2000, amount: 1500 })
  })
  it('never discounts below the Paystack minimum charge (100 pesewas)', () => {
    expect(applyReferralDiscount({ balancePesewas: 99999, amountPesewas: 3500 }))
      .toEqual({ discount: 3400, amount: 100 })
  })
  it('returns zero discount when amount is already at the minimum', () => {
    expect(applyReferralDiscount({ balancePesewas: 2000, amountPesewas: 100 }))
      .toEqual({ discount: 0, amount: 100 })
  })
  it('treats negative balances as zero', () => {
    expect(applyReferralDiscount({ balancePesewas: -50, amountPesewas: 3500 }))
      .toEqual({ discount: 0, amount: 3500 })
  })
  it('reward constant is GHS 20 in pesewas', () => {
    expect(FAMILY_REWARD_PESEWAS).toBe(2000)
  })
  it('clamps exactly at the boundary where balance equals amount minus minimum', () => {
    expect(applyReferralDiscount({ balancePesewas: 3400, amountPesewas: 3500 }))
      .toEqual({ discount: 3400, amount: 100 })
  })
  it('clamps when balance equals the full amount', () => {
    expect(applyReferralDiscount({ balancePesewas: 3500, amountPesewas: 3500 }))
      .toEqual({ discount: 3400, amount: 100 })
  })
})
