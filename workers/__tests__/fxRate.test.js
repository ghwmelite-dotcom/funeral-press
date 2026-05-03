import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFxRate } from '../utils/fxRate.js'

function mockKV() {
  const store = new Map()
  return {
    get: vi.fn(async (k) => store.get(k) || null),
    put: vi.fn(async (k, v, _opts) => store.set(k, v)),
    store,
  }
}

describe('getFxRate', () => {
  beforeEach(() => { global.fetch = vi.fn() })

  it('returns 1 for GHS→GHS without fetching', async () => {
    const kv = mockKV()
    const rate = await getFxRate('GHS', kv, 'fake-key')
    expect(rate).toBe(1)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('fetches and caches a fresh rate', async () => {
    // Open Exchange Rates uses USD base. GBP→GHS = 20.0/1.0 = 20.0
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ base: 'USD', rates: { GBP: 1.0, GHS: 20.0 } }),
    })
    const kv = mockKV()
    const rate = await getFxRate('GBP', kv, 'fake-key')
    expect(rate).toBe(20.0)
    expect(kv.put).toHaveBeenCalled()
  })

  it('returns cached rate without fetching', async () => {
    const kv = mockKV()
    kv.store.set('fx:GBP_GHS', JSON.stringify({ rate: 19.5, fetched_at: Date.now() }))
    const rate = await getFxRate('GBP', kv, 'fake-key')
    expect(rate).toBe(19.5)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('refetches if cache is older than 5 min', async () => {
    const kv = mockKV()
    kv.store.set('fx:GBP_GHS', JSON.stringify({
      rate: 19.5,
      fetched_at: Date.now() - 6 * 60 * 1000,
    }))
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ base: 'USD', rates: { GBP: 1.0, GHS: 21.0 } }),
    })
    const rate = await getFxRate('GBP', kv, 'fake-key')
    expect(rate).toBe(21.0)
    expect(global.fetch).toHaveBeenCalled()
  })

  it('returns null on fetch failure with no cache', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network'))
    const kv = mockKV()
    const rate = await getFxRate('GBP', kv, 'fake-key')
    expect(rate).toBeNull()
  })
})
