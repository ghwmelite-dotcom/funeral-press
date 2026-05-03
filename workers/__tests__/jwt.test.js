import { describe, it, expect } from 'vitest'
import { signJWT, verifyJWT } from '../utils/jwt.js'

const SECRET = 'test-secret-do-not-use-in-prod'

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
})
