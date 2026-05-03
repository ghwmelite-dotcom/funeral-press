import { describe, it, expect } from 'vitest'
import { selectProvider, normalisePhone } from '../utils/phoneRouter.js'

describe('selectProvider', () => {
  it('routes Ghana (+233) to hubtel', () => {
    expect(selectProvider('+233241234567')).toBe('hubtel')
  })

  it('routes UK (+44) to twilio', () => {
    expect(selectProvider('+447700900000')).toBe('twilio')
  })

  it('routes US (+1) to twilio', () => {
    expect(selectProvider('+12025551234')).toBe('twilio')
  })

  it('routes Nigeria (+234) to twilio for v1', () => {
    expect(selectProvider('+2348012345678')).toBe('twilio')
  })

  it('throws for unknown / non-E164 input', () => {
    expect(() => selectProvider('abc')).toThrow()
    expect(() => selectProvider('0241234567')).toThrow()
  })
})

describe('normalisePhone', () => {
  it('returns E.164 string for valid input', () => {
    expect(normalisePhone('0241234567', 'GH')).toBe('+233241234567')
    expect(normalisePhone('+233 24 123 4567', 'GH')).toBe('+233241234567')
  })

  it('returns null for invalid input', () => {
    expect(normalisePhone('not-a-phone', 'GH')).toBeNull()
    expect(normalisePhone('123', 'GH')).toBeNull()
  })
})
