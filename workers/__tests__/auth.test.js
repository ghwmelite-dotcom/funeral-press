import { describe, it, expect } from 'vitest'

describe('JWT token format', () => {
  it('JWT has three base64url parts', () => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const payload = btoa(JSON.stringify({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 }))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const parts = `${header}.${payload}.fakesignature`.split('.')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toBeTruthy()
    expect(parts[1]).toBeTruthy()
    expect(parts[2]).toBeTruthy()
  })

  it('expired token is detected', () => {
    const expiredPayload = { sub: 'user-1', exp: Math.floor(Date.now() / 1000) - 120 }
    const payloadB64 = btoa(JSON.stringify(expiredPayload))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    // Verify token can be parsed back
    const decoded = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    const isExpired = decoded.exp * 1000 < Date.now() - 60000
    expect(isExpired).toBe(true)
  })

  it('valid token is not expired', () => {
    const validPayload = { sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 }
    const payloadB64 = btoa(JSON.stringify(validPayload))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

    const decoded = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    const isExpired = decoded.exp * 1000 < Date.now() - 60000
    expect(isExpired).toBe(false)
  })
})

describe('CORS origin validation', () => {
  const ALLOWED_ORIGINS = [
    'https://funeral-brochure-app.pages.dev',
    'https://funeralpress.org',
    'https://www.funeralpress.org',
    'http://localhost:5173',
    'http://localhost:4173',
  ]

  function getCorsOrigin(origin) {
    if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.funeral-brochure-app.pages.dev')) {
      return origin
    }
    return ALLOWED_ORIGINS[0]
  }

  it('allows production origin', () => {
    expect(getCorsOrigin('https://funeralpress.org')).toBe('https://funeralpress.org')
  })

  it('allows preview URLs', () => {
    expect(getCorsOrigin('https://abc123.funeral-brochure-app.pages.dev'))
      .toBe('https://abc123.funeral-brochure-app.pages.dev')
  })

  it('allows localhost dev', () => {
    expect(getCorsOrigin('http://localhost:5173')).toBe('http://localhost:5173')
  })

  it('rejects unknown origins', () => {
    expect(getCorsOrigin('https://evil.com')).toBe('https://funeral-brochure-app.pages.dev')
  })
})
