import { describe, it, expect, vi } from 'vitest'

import worker from '../share-api.js'

const SHARE_CODE_RE = /^[A-Z2-9]{6}$/

function makeKv(seed = {}) {
  const map = new Map(Object.entries(seed))
  const puts = []
  return {
    _map: map,
    _puts: puts,
    get: vi.fn(async (k) => (map.has(k) ? map.get(k) : null)),
    put: vi.fn(async (k, v, opts) => {
      map.set(k, v)
      puts.push({ key: k, value: v, opts })
    }),
    delete: vi.fn(async (k) => map.delete(k)),
  }
}

function makeRateLimitsKv(seed = {}) {
  const map = new Map(Object.entries(seed))
  return {
    _map: map,
    get: vi.fn(async (k) => (map.has(k) ? map.get(k) : null)),
    put: vi.fn(async (k, v, _opts) => {
      map.set(k, v)
    }),
  }
}

function makeEnv({ kvSeed = {}, rateSeed = {}, withRateLimits = true } = {}) {
  return {
    BROCHURES_KV: makeKv(kvSeed),
    RATE_LIMITS: withRateLimits ? makeRateLimitsKv(rateSeed) : undefined,
    ENVIRONMENT: 'dev',
  }
}

function makeReq(method, path, { body, ip = '1.2.3.4', headers = {} } = {}) {
  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': ip,
      'Origin': 'https://funeralpress.org',
      ...headers,
    },
  }
  if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body)
  return new Request(`https://share.funeralpress.org${path}`, init)
}

describe('share-api worker', () => {
  it('POST / with valid body returns 200 with code+url and writes to KV', async () => {
    const env = makeEnv()
    const req = makeReq('POST', '/', { body: { fullName: 'Aseda Mensah', born: '1950', died: '2025' } })
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.code).toMatch(SHARE_CODE_RE)
    expect(json.url).toBe(`https://funeralpress.org/?share=${json.code}`)
    expect(env.BROCHURES_KV.put).toHaveBeenCalledTimes(1)
    expect(env.BROCHURES_KV.put.mock.calls[0][0]).toBe(json.code)
    const stored = JSON.parse(env.BROCHURES_KV.put.mock.calls[0][1])
    expect(stored.fullName).toBe('Aseda Mensah')
    expect(stored.sharedAt).toBeTruthy()
    expect(env.BROCHURES_KV.put.mock.calls[0][2]).toEqual({ expirationTtl: 30 * 24 * 60 * 60 })
  })

  it('POST / retries on collision and still returns a valid 6-char code', async () => {
    // Stub Math.random so the first generateCode() output is deterministic and
    // already present in KV; the second call gets a different value.
    const realRandom = Math.random
    let n = 0
    // First 6 values pin to index 0 -> 'A'; next 6 pin to index 1 -> 'B'.
    // Each generateCode() consumes 6 randoms.
    Math.random = () => {
      const out = n < 6 ? 0 : 1 / 32 // index 0 -> 'A', then index 1 -> 'B'
      n++
      return out
    }
    try {
      const env = makeEnv({ kvSeed: { AAAAAA: JSON.stringify({ fullName: 'pre-existing' }) } })
      const req = makeReq('POST', '/', { body: { fullName: 'Survivor' } })
      const res = await worker.fetch(req, env)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.code).toMatch(SHARE_CODE_RE)
      expect(json.code).not.toBe('AAAAAA')
      // KV.put eventually called for the new (non-colliding) code
      expect(env.BROCHURES_KV.put).toHaveBeenCalledTimes(1)
      expect(env.BROCHURES_KV.put.mock.calls[0][0]).toBe(json.code)
    } finally {
      Math.random = realRandom
    }
  })

  it('GET /:code returns 200 with the stored JSON when KV has the entry', async () => {
    const stored = { fullName: 'Akua', sharedAt: '2026-01-01T00:00:00.000Z' }
    const env = makeEnv({ kvSeed: { ABCDEF: JSON.stringify(stored) } })
    const req = makeReq('GET', '/ABCDEF')
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(stored)
  })

  it('GET /:code returns 404 when KV is empty', async () => {
    const env = makeEnv()
    const req = makeReq('GET', '/ZZZZZZ')
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toMatch(/not found/i)
  })

  it('PUT /:code is rejected (405) and never writes to KV — shares are immutable', async () => {
    // Security: an unauthenticated PUT previously let anyone overwrite any
    // family's shared brochure by guessing a 6-char code. The endpoint is gone.
    const env = makeEnv({ kvSeed: { ABCDEF: JSON.stringify({ fullName: 'Original' }) } })
    const req = makeReq('PUT', '/ABCDEF', { body: { fullName: 'Hijacked', tribute: 'defaced' } })
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(405)
    const json = await res.json()
    expect(json.error).toMatch(/method not allowed/i)
    expect(env.BROCHURES_KV.put).not.toHaveBeenCalled()
    // Stored brochure is untouched
    expect(JSON.parse(env.BROCHURES_KV._map.get('ABCDEF')).fullName).toBe('Original')
  })

  it('DELETE /:code is rejected (405) and never mutates KV', async () => {
    const env = makeEnv({ kvSeed: { ABCDEF: JSON.stringify({ fullName: 'Original' }) } })
    const res = await worker.fetch(makeReq('DELETE', '/ABCDEF'), env)
    expect(res.status).toBe(405)
    expect(env.BROCHURES_KV.delete).not.toHaveBeenCalled()
    expect(env.BROCHURES_KV.put).not.toHaveBeenCalled()
  })

  it('OPTIONS returns 204 with CORS headers; PUT is NOT advertised in Allow-Methods', async () => {
    const env = makeEnv()
    const req = makeReq('OPTIONS', '/')
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Methods')).not.toContain('PUT')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
  })

  it('GET /health returns 200 with status ok and service share-api', async () => {
    const env = makeEnv()
    const req = makeReq('GET', '/health')
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('ok')
    expect(json.service).toBe('share-api')
  })

  it('Rate limit: read group at limit returns 429 on GET', async () => {
    const env = makeEnv({
      kvSeed: { ABCDEF: JSON.stringify({ fullName: 'X' }) },
      rateSeed: { 'rate:1.2.3.4:share:read': '120' },
    })
    const req = makeReq('GET', '/ABCDEF', { ip: '1.2.3.4' })
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
  })

  it('Rate limit: write group at limit returns 429 on POST', async () => {
    const env = makeEnv({
      kvSeed: { ABCDEF: JSON.stringify({ fullName: 'X' }) },
      rateSeed: { 'rate:1.2.3.4:share:write': '10' },
    })
    const postRes = await worker.fetch(
      makeReq('POST', '/', { body: { fullName: 'Y' }, ip: '1.2.3.4' }),
      env
    )
    expect(postRes.status).toBe(429)
  })
})
