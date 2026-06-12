// workers/__tests__/priceBook.test.js
import { describe, it, expect } from 'vitest'
import {
  PRODUCTS,
  CURRENCIES,
  currencyForCountry,
  priceFor,
  providerFor,
  isSubscription,
} from '../priceBook.js'

describe('currencyForCountry', () => {
  it('maps Ghana to GHS', () => expect(currencyForCountry('GH')).toBe('GHS'))
  it('falls back to GHS everywhere while USD is dormant', () => {
    expect(currencyForCountry('NG')).toBe('GHS')
    expect(currencyForCountry('GB')).toBe('GHS')
    expect(currencyForCountry('DE')).toBe('GHS')
    expect(currencyForCountry('US')).toBe('GHS')
    expect(currencyForCountry(null)).toBe('GHS')
  })
  it('routes non-Ghana traffic to USD once USD is enabled', () => {
    CURRENCIES.USD.enabled = true
    try {
      expect(currencyForCountry('US')).toBe('USD')
      expect(currencyForCountry('NG')).toBe('USD')   // NGN still dormant
      expect(currencyForCountry('GB')).toBe('USD')   // GBP still dormant
      expect(currencyForCountry('GH')).toBe('GHS')
    } finally {
      CURRENCIES.USD.enabled = false
    }
  })
  it('prefers GBP for UK/EU when GBP is enabled', () => {
    CURRENCIES.GBP.enabled = true
    try {
      expect(currencyForCountry('GB')).toBe('GBP')
      expect(currencyForCountry('FR')).toBe('GBP')
      expect(currencyForCountry('US')).toBe('GHS') // USD still dormant
    } finally {
      CURRENCIES.GBP.enabled = false
    }
  })
})

describe('priceFor', () => {
  it('returns spec prices for single', () => {
    expect(priceFor('single', 'GHS')).toBe(3500)
    expect(priceFor('single', 'GBP')).toBe(900)
    expect(priceFor('single', 'USD')).toBe(1200)
  })
  it('returns spec prices for memorial heritage annual', () => {
    expect(priceFor('memorial_heritage_annual', 'GBP')).toBe(4900)
    expect(priceFor('memorial_heritage_annual', 'USD')).toBe(5900)
  })
  it('throws on unknown product or currency', () => {
    expect(() => priceFor('nope', 'GHS')).toThrow()
    expect(() => priceFor('single', 'EUR')).toThrow()
  })
})

describe('providerFor', () => {
  it('routes GHS, NGN, and USD to paystack', () => {
    expect(providerFor('GHS')).toBe('paystack')
    expect(providerFor('NGN')).toBe('paystack')
    expect(providerFor('USD')).toBe('paystack')
  })
  it('keeps GBP on stripe (dormant, pending a UK entity)', () => {
    expect(providerFor('GBP')).toBe('stripe')
  })
})

describe('product metadata', () => {
  it('keeps existing GHS plan amounts and credits intact', () => {
    expect(PRODUCTS.single).toMatchObject({ credits: 1, kind: 'one_time' })
    expect(PRODUCTS.bundle).toMatchObject({ credits: 3 })
    expect(PRODUCTS.suite).toMatchObject({ credits: -1 })
    expect(priceFor('suite', 'GHS')).toBe(12000)
  })
  it('flags subscriptions with interval', () => {
    expect(isSubscription('pro_monthly')).toBe(true)
    expect(PRODUCTS.pro_monthly.interval).toBe('month')
    expect(PRODUCTS.pro_annual.interval).toBe('year')
    expect(PRODUCTS.memorial_premium_annual.interval).toBe('year')
    expect(isSubscription('single')).toBe(false)
  })
  it('only GHS is enabled until Paystack activates USD', () => {
    expect(CURRENCIES.GHS.enabled).toBe(true)
    expect(CURRENCIES.USD.enabled).toBe(false)
    expect(CURRENCIES.GBP.enabled).toBe(false)
    expect(CURRENCIES.NGN.enabled).toBe(false)
  })
})
