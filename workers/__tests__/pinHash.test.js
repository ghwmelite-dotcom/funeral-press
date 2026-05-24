import { describe, it, expect } from 'vitest'
import { hashPin, verifyPin, isValidPinFormat } from '../utils/pinHash.js'

describe('isValidPinFormat', () => {
  it('accepts a 4-digit numeric PIN', () => {
    expect(isValidPinFormat('1234')).toBe(true)
    expect(isValidPinFormat('0000')).toBe(true)
    expect(isValidPinFormat('9999')).toBe(true)
  })

  it('rejects PINs that are too short or too long', () => {
    expect(isValidPinFormat('123')).toBe(false)
    expect(isValidPinFormat('12345')).toBe(false)
    expect(isValidPinFormat('123456')).toBe(false)
    expect(isValidPinFormat('')).toBe(false)
  })

  it('rejects non-numeric characters', () => {
    expect(isValidPinFormat('12a4')).toBe(false)
    expect(isValidPinFormat('abcd')).toBe(false)
    expect(isValidPinFormat('12 4')).toBe(false)
  })

  it('rejects null/undefined/non-string input', () => {
    expect(isValidPinFormat(null)).toBe(false)
    expect(isValidPinFormat(undefined)).toBe(false)
    expect(isValidPinFormat(1234)).toBe(false)
  })
})

describe('hashPin / verifyPin (PBKDF2-SHA256)', () => {
  it('round-trips: a hashed PIN verifies against itself', async () => {
    const hash = await hashPin('1234')
    expect(await verifyPin('1234', hash)).toBe(true)
  })

  it('rejects wrong PIN', async () => {
    const hash = await hashPin('1234')
    expect(await verifyPin('4321', hash)).toBe(false)
    expect(await verifyPin('0000', hash)).toBe(false)
  })

  it('produces format-versioned output: pbkdf2$<iter>$<salt>$<hash>', async () => {
    const hash = await hashPin('1234')
    expect(hash).toMatch(/^pbkdf2\$\d+\$[A-Za-z0-9+/=_-]+\$[A-Za-z0-9+/=_-]+$/)
    const parts = hash.split('$')
    expect(parts).toHaveLength(4)
    expect(parts[0]).toBe('pbkdf2')
    expect(Number(parts[1])).toBeGreaterThanOrEqual(100000) // sanity floor
  })

  it('keeps the default iteration count within the Cloudflare Workers PBKDF2 cap', async () => {
    // Workers' WebCrypto throws "iteration counts above 100000 are not
    // supported", which breaks signup AND login in production. Node does NOT
    // enforce this cap, so without this guard a bump above 100000 passes the
    // suite but throws in prod. Pin the default at the runtime ceiling.
    const hash = await hashPin('1234')
    expect(Number(hash.split('$')[1])).toBeLessThanOrEqual(100000)
  })

  it('uses a different salt every call (so two hashes of the same PIN differ)', async () => {
    const a = await hashPin('1234')
    const b = await hashPin('1234')
    expect(a).not.toBe(b)
    // both still verify
    expect(await verifyPin('1234', a)).toBe(true)
    expect(await verifyPin('1234', b)).toBe(true)
  })

  it('returns false rather than throwing on a malformed hash', async () => {
    expect(await verifyPin('1234', 'not-a-real-hash')).toBe(false)
    expect(await verifyPin('1234', '')).toBe(false)
    expect(await verifyPin('1234', null)).toBe(false)
    expect(await verifyPin('1234', 'pbkdf2$only$two')).toBe(false)
    expect(await verifyPin('1234', 'pbkdf2$abc$bad-iter$hash')).toBe(false)
  })

  it('returns false rather than throwing on a malformed PIN', async () => {
    const hash = await hashPin('1234')
    expect(await verifyPin('', hash)).toBe(false)
    expect(await verifyPin(null, hash)).toBe(false)
    expect(await verifyPin(undefined, hash)).toBe(false)
  })

  it('verifies a hash produced with a different (older) iteration count', async () => {
    // Round-trip with a hand-crafted hash that uses a low iteration count
    // (simulates a future iteration upgrade where old hashes still verify).
    const lowIter = await hashPin('1122', 50000)
    expect(await verifyPin('1122', lowIter)).toBe(true)
    expect(lowIter).toContain('pbkdf2$50000$')
  })
})
