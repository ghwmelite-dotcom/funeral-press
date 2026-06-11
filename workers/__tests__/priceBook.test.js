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
  it('maps Nigeria to USD while NGN is dormant', () => expect(currencyForCountry('NG')).toBe('USD'))
  it('maps UK and EU to GBP', () => {
    expect(currencyForCountry('GB')).toBe('GBP')
    expect(currencyForCountry('DE')).toBe('GBP')
    expect(currencyForCountry('IE')).toBe('GBP')
  })
  it('maps everything else (and unknown) to USD', () => {
    expect(currencyForCountry('US')).toBe('USD')
    expect(currencyForCountry(null)).toBe('USD')
    expect(currencyForCountry(undefined)).toBe('USD')
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
  it('routes GHS and NGN to paystack', () => {
    expect(providerFor('GHS')).toBe('paystack')
    expect(providerFor('NGN')).toBe('paystack')
  })
  it('routes GBP and USD to stripe', () => {
    expect(providerFor('GBP')).toBe('stripe')
    expect(providerFor('USD')).toBe('stripe')
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
  it('declares NGN dormant and the other three enabled', () => {
    expect(CURRENCIES.NGN.enabled).toBe(false)
    expect(CURRENCIES.GHS.enabled).toBe(true)
    expect(CURRENCIES.GBP.enabled).toBe(true)
    expect(CURRENCIES.USD.enabled).toBe(true)
  })
})
