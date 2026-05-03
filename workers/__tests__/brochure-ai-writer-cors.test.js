import { describe, it, expect } from 'vitest'

// Pure function — extracted to be testable. Mirrors the function in brochure-ai-writer.js.
function corsHeadersFor(origin, env) {
  const ALLOWED = [
    'https://funeralpress.org',
    'https://www.funeralpress.org',
    'https://funeral-brochure-app.pages.dev',
  ]
  const isAllowed = ALLOWED.includes(origin) || (origin && origin.endsWith('.funeral-brochure-app.pages.dev'))
  if (env?.ENVIRONMENT === 'dev' && origin && /^http:\/\/localhost:\d+$/.test(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  }
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://funeralpress.org',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

describe('brochure-ai-writer CORS', () => {
  it('echoes allowlisted production origin', () => {
    expect(corsHeadersFor('https://funeralpress.org', { ENVIRONMENT: 'production' })['Access-Control-Allow-Origin'])
      .toBe('https://funeralpress.org')
  })

  it('echoes www subdomain', () => {
    expect(corsHeadersFor('https://www.funeralpress.org', { ENVIRONMENT: 'production' })['Access-Control-Allow-Origin'])
      .toBe('https://www.funeralpress.org')
  })

  it('echoes Pages preview subdomains', () => {
    expect(corsHeadersFor('https://abc.funeral-brochure-app.pages.dev', { ENVIRONMENT: 'production' })['Access-Control-Allow-Origin'])
      .toBe('https://abc.funeral-brochure-app.pages.dev')
  })

  it('falls back to canonical origin for unknown origins', () => {
    expect(corsHeadersFor('https://attacker.example.com', { ENVIRONMENT: 'production' })['Access-Control-Allow-Origin'])
      .toBe('https://funeralpress.org')
  })

  it('does NOT return wildcard', () => {
    expect(corsHeadersFor('https://attacker.example.com', { ENVIRONMENT: 'production' })['Access-Control-Allow-Origin'])
      .not.toBe('*')
  })

  it('echoes localhost only when ENVIRONMENT=dev', () => {
    expect(corsHeadersFor('http://localhost:5173', { ENVIRONMENT: 'dev' })['Access-Control-Allow-Origin'])
      .toBe('http://localhost:5173')
  })

  it('rejects localhost in production', () => {
    expect(corsHeadersFor('http://localhost:5173', { ENVIRONMENT: 'production' })['Access-Control-Allow-Origin'])
      .toBe('https://funeralpress.org')
  })
})
