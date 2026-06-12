// src/stores/__tests__/currencyStore.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCurrencyStore } from '../currencyStore'

describe('currencyStore', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useCurrencyStore.setState({ currency: 'GHS', country: null, hydrated: false, _hydrating: null })
  })

  it('defaults to GHS', () => {
    expect(useCurrencyStore.getState().currency).toBe('GHS')
  })

  it('hydrates from /geo and stores the result', async () => {
    // /geo returns GH → GHS (the only enabled currency while USD is dormant)
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ country: 'GH', currency: 'GHS' }),
    })))
    await useCurrencyStore.getState().hydrate()
    expect(useCurrencyStore.getState().currency).toBe('GHS')
    expect(useCurrencyStore.getState().country).toBe('GH')
    vi.unstubAllGlobals()
  })

  it('a manual session override beats geo', async () => {
    // GHS is the only enabled currency; a stored GHS override should survive
    sessionStorage.setItem('fp-currency', 'GHS')
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ country: 'GH', currency: 'GHS' }),
    })))
    await useCurrencyStore.getState().hydrate()
    expect(useCurrencyStore.getState().currency).toBe('GHS')
    vi.unstubAllGlobals()
  })

  it('setCurrency persists per session and rejects disabled currencies', () => {
    // GHS is enabled — should persist
    useCurrencyStore.getState().setCurrency('GHS')
    expect(useCurrencyStore.getState().currency).toBe('GHS')
    expect(sessionStorage.getItem('fp-currency')).toBe('GHS')
    // NGN is dormant — should be rejected (currency stays GHS)
    useCurrencyStore.getState().setCurrency('NGN')
    expect(useCurrencyStore.getState().currency).toBe('GHS')
  })

  it('falls back silently to GHS when /geo fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    await useCurrencyStore.getState().hydrate()
    expect(useCurrencyStore.getState().currency).toBe('GHS')
    expect(useCurrencyStore.getState().hydrated).toBe(true)
    vi.unstubAllGlobals()
  })

  it('concurrent hydrate calls share one /geo request', async () => {
    // Both calls share one fetch; result is GHS (Ghana geo response)
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ country: 'GH', currency: 'GHS' }),
    })))
    await Promise.all([
      useCurrencyStore.getState().hydrate(),
      useCurrencyStore.getState().hydrate(),
    ])
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(useCurrencyStore.getState().currency).toBe('GHS')
    vi.unstubAllGlobals()
  })
})
