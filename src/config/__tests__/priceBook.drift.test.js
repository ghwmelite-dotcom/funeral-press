// src/config/__tests__/priceBook.drift.test.js
import { describe, it, expect } from 'vitest'
import * as frontend from '../priceBook.js'
import * as worker from '../../../workers/priceBook.js'

describe('priceBook mirror drift', () => {
  it('PRODUCTS are identical between src/config and workers', () => {
    expect(frontend.PRODUCTS).toEqual(worker.PRODUCTS)
  })
  it('CURRENCIES are identical between src/config and workers', () => {
    expect(frontend.CURRENCIES).toEqual(worker.CURRENCIES)
  })

  it('country mapping behaves identically in both modules', () => {
    for (const c of ['GH', 'NG', 'GB', 'DE', 'US', 'XX', null]) {
      expect(frontend.currencyForCountry(c)).toBe(worker.currencyForCountry(c))
    }
  })
})
