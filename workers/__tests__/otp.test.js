import { describe, it, expect } from 'vitest'
import { generateOtp, hashOtp, verifyOtp } from '../utils/otp.js'

const PEPPER = 'test-pepper-32-bytes-of-entropy-here'

describe('generateOtp', () => {
  it('returns a 6-digit string', () => {
    const code = generateOtp()
    expect(code).toMatch(/^\d{6}$/)
  })

  it('returns a different code each call (probabilistic)', () => {
    const codes = new Set()
    for (let i = 0; i < 50; i++) codes.add(generateOtp())
    expect(codes.size).toBeGreaterThan(40)
  })
})

describe('hashOtp', () => {
  it('returns a 64-char hex string', async () => {
    const h = await hashOtp('123456', PEPPER)
    expect(h).toMatch(/^[a-f0-9]{64}$/)
  })

  it('produces stable output for same input', async () => {
    const a = await hashOtp('123456', PEPPER)
    const b = await hashOtp('123456', PEPPER)
    expect(a).toBe(b)
  })

  it('produces different output for different code', async () => {
    const a = await hashOtp('123456', PEPPER)
    const b = await hashOtp('123457', PEPPER)
    expect(a).not.toBe(b)
  })

  it('produces different output for different pepper', async () => {
    const a = await hashOtp('123456', PEPPER)
    const b = await hashOtp('123456', 'different-pepper')
    expect(a).not.toBe(b)
  })
})

describe('verifyOtp', () => {
  it('returns true for matching code', async () => {
    const hash = await hashOtp('123456', PEPPER)
    expect(await verifyOtp('123456', hash, PEPPER)).toBe(true)
  })

  it('returns false for wrong code', async () => {
    const hash = await hashOtp('123456', PEPPER)
    expect(await verifyOtp('654321', hash, PEPPER)).toBe(false)
  })

  it('returns false for wrong pepper', async () => {
    const hash = await hashOtp('123456', PEPPER)
    expect(await verifyOtp('123456', hash, 'wrong-pepper')).toBe(false)
  })
})
