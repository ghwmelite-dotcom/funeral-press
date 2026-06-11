// src/stores/__tests__/currencyStore.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCurrencyStore } from '../currencyStore'

describe('currencyStore', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useCurrencyStore.setState({ currency: 'GHS', country: null, hydrated: false })
  })

  it('defaults to GHS', () => {
    expect(useCurrencyStore.getState().currency).toBe('GHS')
  })

  it('hydrates from /geo and stores the result', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ country: 'GB', currency: 'GBP' }),
    })))
    await useCurrencyStore.getState().hydrate()
    expect(useCurrencyStore.getState().currency).toBe('GBP')
    expect(useCurrencyStore.getState().country).toBe('GB')
    vi.unstubAllGlobals()
  })

  it('a manual session override beats geo', async () => {
    sessionStorage.setItem('fp-currency', 'USD')
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ country: 'GH', currency: 'GHS' }),
    })))
    await useCurrencyStore.getState().hydrate()
    expect(useCurrencyStore.getState().currency).toBe('USD')
    vi.unstubAllGlobals()
  })

  it('setCurrency persists per session and rejects disabled currencies', () => {
    useCurrencyStore.getState().setCurrency('GBP')
    expect(useCurrencyStore.getState().currency).toBe('GBP')
    expect(sessionStorage.getItem('fp-currency')).toBe('GBP')
    useCurrencyStore.getState().setCurrency('NGN') // dormant
    expect(useCurrencyStore.getState().currency).toBe('GBP')
  })

  it('falls back silently to GHS when /geo fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    await useCurrencyStore.getState().hydrate()
    expect(useCurrencyStore.getState().currency).toBe('GHS')
    expect(useCurrencyStore.getState().hydrated).toBe(true)
    vi.unstubAllGlobals()
  })
})
