import { describe, it, expect } from 'vitest'
import { containsProfanity } from '../utils/profanity.js'

describe('containsProfanity', () => {
  it('flags common English profanity', () => {
    expect(containsProfanity('this is a fucking test')).toBe(true)
  })

  it('passes clean names', () => {
    expect(containsProfanity('Akosua Mensah')).toBe(false)
    expect(containsProfanity('John K.')).toBe(false)
    expect(containsProfanity('Anonymous')).toBe(false)
  })

  it('flags custom Twi/Ga slurs from extension list', () => {
    expect(containsProfanity('kwasea')).toBe(true)
  })

  it('handles unicode and case', () => {
    expect(containsProfanity('FUCK')).toBe(true)
  })

  it('handles whitespace and punctuation correctly', () => {
    expect(containsProfanity('John K.')).toBe(false)
    expect(containsProfanity("D'Angelo")).toBe(false)
  })
})
