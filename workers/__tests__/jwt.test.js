import { describe, it, expect } from 'vitest'
import { signJWT, verifyJWT } from '../utils/jwt.js'

const SECRET = 'test-secret-do-not-use-in-production'

describe('signJWT and verifyJWT', () => {
  it('signs and verifies a payload roundtrip', async () => {
    const payload = { sub: '1', email: 'a@b.c', exp: Math.floor(Date.now() / 1000) + 3600 }
    const token = await signJWT(payload, SECRET)
    expect(token.split('.')).toHaveLength(3)

    const decoded = await verifyJWT(token, SECRET)
    expect(decoded).toMatchObject({ sub: '1', email: 'a@b.c' })
  })

  it('rejects a token with wrong signature', async () => {
    const payload = { sub: '1', exp: Math.floor(Date.now() / 1000) + 3600 }
    const token = await signJWT(payload, SECRET)
    const tampered = token.slice(0, -4) + 'XXXX'
    const decoded = await verifyJWT(tampered, SECRET)
    expect(decoded).toBeNull()
  })

  it('rejects an expired token', async () => {
    const payload = { sub: '1', exp: Math.floor(Date.now() / 1000) - 60 }
    const token = await signJWT(payload, SECRET)
    const decoded = await verifyJWT(token, SECRET)
    expect(decoded).toBeNull()
  })

  it('rejects malformed tokens', async () => {
    expect(await verifyJWT('not.a.token', SECRET)).toBeNull()
    expect(await verifyJWT('', SECRET)).toBeNull()
    expect(await verifyJWT('one.two', SECRET)).toBeNull()
  })

  it('fails closed on a missing/empty secret', async () => {
    const payload = { sub: '1', exp: Math.floor(Date.now() / 1000) + 3600 }
    // Signing must refuse rather than mint a token with the forgeable
    // "undefined"/empty key that an unset JWT_SECRET would produce.
    await expect(signJWT(payload, undefined)).rejects.toThrow(/JWT_SECRET/)
    await expect(signJWT(payload, '')).rejects.toThrow(/JWT_SECRET/)

    // Verification must reject all tokens when the secret is missing/empty,
    // even a token that was validly signed with the real secret.
    const token = await signJWT(payload, SECRET)
    expect(await verifyJWT(token, undefined)).toBeNull()
    expect(await verifyJWT(token, '')).toBeNull()
  })
})
