import { describe, it, expect } from 'vitest'
import * as frontend from '../candleProducts.js'
import * as worker from '../../../workers/candleConfig.js'

describe('candleProducts drift guard', () => {
  it('frontend CANDLE_PRODUCTS is identical to worker catalog', () => {
    expect(frontend.CANDLE_PRODUCTS).toEqual(worker.CANDLE_PRODUCTS)
  })
})

describe('candleProduct (frontend)', () => {
  it('returns 1000 pesewas for candle', () => {
    expect(frontend.candleProduct('candle').pesewas).toBe(1000)
  })

  it('returns 500 maxMessage for tribute', () => {
    expect(frontend.candleProduct('tribute').maxMessage).toBe(500)
  })

  it('returns null for unknown type', () => {
    expect(frontend.candleProduct('unknown')).toBe(null)
  })
})

describe('candleProduct (worker)', () => {
  it('returns 1000 pesewas for candle', () => {
    expect(worker.candleProduct('candle').pesewas).toBe(1000)
  })

  it('returns 500 maxMessage for tribute', () => {
    expect(worker.candleProduct('tribute').maxMessage).toBe(500)
  })

  it('returns null for unknown type', () => {
    expect(worker.candleProduct('unknown')).toBe(null)
  })
})
