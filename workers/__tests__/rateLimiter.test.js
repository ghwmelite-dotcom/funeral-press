import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkRateLimit, RATE_LIMITS } from '../utils/rateLimiter.js'

function createMockKV() {
  const store = new Map()
  return {
    get: vi.fn(async (key) => store.get(key) || null),
    put: vi.fn(async (key, value) => store.set(key, value)),
    store,
  }
}

function mockRequest(ip = '1.2.3.4') {
  const headers = new Map([['CF-Connecting-IP', ip]])
  headers.get = function(key) { return new Map([['CF-Connecting-IP', ip]]).get(key) }
  return { headers }
}

describe('checkRateLimit', () => {
  let kv

  beforeEach(() => {
    kv = createMockKV()
  })

  it('allows requests under the limit', async () => {
    const result = await checkRateLimit(mockRequest(), kv, 'auth', 10)
    expect(result).toBeNull()
    expect(kv.put).toHaveBeenCalledWith('rate:1.2.3.4:auth', '1', { expirationTtl: 60 })
  })

  it('blocks requests at the limit', async () => {
    kv.store.set('rate:1.2.3.4:auth', '10')
    const result = await checkRateLimit(mockRequest(), kv, 'auth', 10)
    expect(result).not.toBeNull()
    expect(result.status).toBe(429)
  })

  it('increments existing count', async () => {
    kv.store.set('rate:1.2.3.4:auth', '5')
    const result = await checkRateLimit(mockRequest(), kv, 'auth', 10)
    expect(result).toBeNull()
    expect(kv.put).toHaveBeenCalledWith('rate:1.2.3.4:auth', '6', { expirationTtl: 60 })
  })

  it('uses unknown for missing IP', async () => {
    const req = { headers: { get: () => null } }
    await checkRateLimit(req, kv, 'auth', 10)
    expect(kv.put).toHaveBeenCalledWith('rate:unknown:auth', '1', { expirationTtl: 60 })
  })
})

describe('RATE_LIMITS', () => {
  it('defines limits for all route groups', () => {
    expect(RATE_LIMITS.auth).toBe(10)
    expect(RATE_LIMITS.payments).toBe(5)
    expect(RATE_LIMITS.upload).toBe(20)
    expect(RATE_LIMITS.sync).toBe(30)
    expect(RATE_LIMITS.authenticated).toBe(60)
    expect(RATE_LIMITS.public).toBe(120)
  })
})
