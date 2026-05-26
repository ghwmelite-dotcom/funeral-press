import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resolveRetentionTtl } from '../live-service-api.js'
import { LIVESTREAM_RETENTION_DAYS } from '../tierConfig.js'

const DAY = 24 * 60 * 60
const FREE_TTL = LIVESTREAM_RETENTION_DAYS.free * DAY

function mockEntitlementResponse(body, { ok = true } = {}) {
  return { ok, json: async () => body }
}

describe('resolveRetentionTtl — livestream retention by tier', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns free retention when no memorialId is linked (no lookup)', async () => {
    const ttl = await resolveRetentionTtl({}, undefined)
    expect(ttl).toBe(FREE_TTL)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('scales retention up for premium and heritage memorials', async () => {
    global.fetch.mockResolvedValueOnce(mockEntitlementResponse({ tier: 'premium' }))
    expect(await resolveRetentionTtl({}, 'mem1')).toBe(LIVESTREAM_RETENTION_DAYS.premium * DAY)

    global.fetch.mockResolvedValueOnce(mockEntitlementResponse({ tier: 'heritage' }))
    expect(await resolveRetentionTtl({}, 'mem2')).toBe(LIVESTREAM_RETENTION_DAYS.heritage * DAY)
  })

  it('uses the configured AUTH_API_ORIGIN override when provided', async () => {
    global.fetch.mockResolvedValueOnce(mockEntitlementResponse({ tier: 'free' }))
    await resolveRetentionTtl({ AUTH_API_ORIGIN: 'https://auth.test' }, 'mem3')
    expect(global.fetch).toHaveBeenCalledWith('https://auth.test/memorial-premium/mem3')
  })

  it('fails open to free retention on a non-ok entitlement response', async () => {
    global.fetch.mockResolvedValueOnce(mockEntitlementResponse({}, { ok: false }))
    expect(await resolveRetentionTtl({}, 'mem4')).toBe(FREE_TTL)
  })

  it('fails open to free retention when the lookup throws', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network down'))
    expect(await resolveRetentionTtl({}, 'mem5')).toBe(FREE_TTL)
  })

  it('falls back to free retention for an unknown tier', async () => {
    global.fetch.mockResolvedValueOnce(mockEntitlementResponse({ tier: 'platinum' }))
    expect(await resolveRetentionTtl({}, 'mem6')).toBe(FREE_TTL)
  })
})
