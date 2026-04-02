import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value }),
    removeItem: vi.fn((key) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('Auth persistence', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('stores auth data with fp-auth key', () => {
    const authData = { token: 'test-jwt', user: { id: '1', name: 'Test' } }
    localStorage.setItem('fp-auth', JSON.stringify(authData))

    const stored = JSON.parse(localStorage.getItem('fp-auth'))
    expect(stored.token).toBe('test-jwt')
    expect(stored.user.name).toBe('Test')
  })

  it('returns null for missing auth', () => {
    expect(localStorage.getItem('fp-auth')).toBeNull()
  })

  it('clears auth on remove', () => {
    localStorage.setItem('fp-auth', JSON.stringify({ token: 'x' }))
    localStorage.removeItem('fp-auth')
    expect(localStorage.getItem('fp-auth')).toBeNull()
  })
})

describe('Token expiry check', () => {
  function isTokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      return payload.exp * 1000 < Date.now() - 60000
    } catch {
      return true
    }
  }

  it('detects expired token', () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 120 }))
      .replace(/=/g, '')
    expect(isTokenExpired(`h.${payload}.s`)).toBe(true)
  })

  it('allows valid token', () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
      .replace(/=/g, '')
    expect(isTokenExpired(`h.${payload}.s`)).toBe(false)
  })

  it('treats malformed token as expired', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(true)
    expect(isTokenExpired('')).toBe(true)
  })
})
