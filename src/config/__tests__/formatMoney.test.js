// src/config/__tests__/formatMoney.test.js
import { describe, it, expect } from 'vitest'
import { formatMoney } from '../priceBook.js'

describe('formatMoney', () => {
  it('formats whole amounts without decimals', () => {
    expect(formatMoney(3500, 'GHS')).toBe('GHS 35')
    expect(formatMoney(1200, 'USD')).toBe('$12')
    expect(formatMoney(450000, 'NGN')).toBe('₦4,500')
  })
  it('keeps two decimals for fractional amounts', () => {
    expect(formatMoney(1250, 'USD')).toBe('$12.50')
  })
})
