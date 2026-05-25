import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import worker from '../auth-api.js'

const BASE = 'https://api.example.com'

// ─── Mock DB ──────────────────────────────────────────────────────────────────

function makeMockDb({ premiumRow = null } = {}) {
  return {
    prepare: (sql) => ({
      bind: (...args) => ({
        first: async () => {
          if (sql.includes('FROM memorial_premium') && sql.includes("status = 'succeeded'")) {
            // Filter by memorial_id (first bind arg)
            if (premiumRow && premiumRow.memorial_id === args[0]) {
              return premiumRow
            }
            return null
          }
          // Other lookups (users, etc.) return null — not relevant here
          return null
        },
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { changes: 0 } }),
      }),
    }),
  }
}

function makeEnv(dbOpts) {
  return {
    JWT_SECRET: 'test-jwt-secret',
    ENVIRONMENT: 'dev',
    DB: makeMockDb(dbOpts),
    RATE_LIMITS: { get: async () => null, put: async () => undefined },
    OTP_KV: { get: async () => null, put: async () => undefined },
    MEMORIAL_PAGES_KV: { get: async () => null, put: async () => undefined },
  }
}

function getReq(memorialId) {
  return new Request(`${BASE}/memorial-premium/${memorialId}`, {
    method: 'GET',
    headers: { 'CF-Connecting-IP': '1.2.3.4' },
  })
}

afterEach(() => { vi.restoreAllMocks() })

// ─── GET /memorial-premium/:id ─────────────────────────────────────────────────

describe('GET /memorial-premium/:id — resolveMemorialEntitlement', () => {
  it('no row → tier:free, active:false, premium:false, all features false', async () => {
    const env = makeEnv({ premiumRow: null })
    const res = await worker.fetch(getReq('mem-none'), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tier).toBe('free')
    expect(body.active).toBe(false)
    expect(body.premium).toBe(false)
    expect(body.features.unlimitedPhotos).toBe(false)
    expect(body.features.allThemes).toBe(false)
    expect(body.features.tributeVideo).toBe(false)
    expect(body.features.removeBranding).toBe(false)
    expect(body.features.passwordProtect).toBe(false)
    expect(body.features.customDomain).toBe(false)
    expect(body.features.multiLanguage).toBe(false)
  })

  it('lifetime premium row (plan_type:lifetime, expires_at:null) → active, premium:true, removeBranding:true, customDomain:false', async () => {
    const env = makeEnv({
      premiumRow: {
        memorial_id: 'mem-premium',
        tier: 'premium',
        plan_type: 'lifetime',
        expires_at: null,
        status: 'succeeded',
      },
    })
    const res = await worker.fetch(getReq('mem-premium'), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tier).toBe('premium')
    expect(body.active).toBe(true)
    expect(body.premium).toBe(true)
    expect(body.planType).toBe('lifetime')
    expect(body.expiresAt).toBeNull()
    expect(body.features.removeBranding).toBe(true)
    expect(body.features.unlimitedPhotos).toBe(true)
    expect(body.features.allThemes).toBe(true)
    expect(body.features.tributeVideo).toBe(true)
    expect(body.features.passwordProtect).toBe(true)
    // premium rank=1, customDomain needs rank=2
    expect(body.features.customDomain).toBe(false)
    expect(body.features.multiLanguage).toBe(false)
  })

  it('annual premium not yet expired → active premium', async () => {
    const futureExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000 // +30 days
    const env = makeEnv({
      premiumRow: {
        memorial_id: 'mem-annual',
        tier: 'premium',
        plan_type: 'annual',
        expires_at: futureExpiry,
        status: 'succeeded',
      },
    })
    const res = await worker.fetch(getReq('mem-annual'), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tier).toBe('premium')
    expect(body.active).toBe(true)
    expect(body.premium).toBe(true)
    expect(body.expiresAt).toBe(futureExpiry)
  })

  it('annual premium expired (expires_at = now − 1 day) → resolves to free, premium:false', async () => {
    const pastExpiry = Date.now() - 24 * 60 * 60 * 1000 // −1 day
    const env = makeEnv({
      premiumRow: {
        memorial_id: 'mem-expired',
        tier: 'premium',
        plan_type: 'annual',
        expires_at: pastExpiry,
        status: 'succeeded',
      },
    })
    const res = await worker.fetch(getReq('mem-expired'), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tier).toBe('free')
    expect(body.active).toBe(false)
    expect(body.premium).toBe(false)
    expect(body.features.removeBranding).toBe(false)
    expect(body.features.customDomain).toBe(false)
  })

  it('heritage lifetime → features.customDomain:true and features.multiLanguage:true', async () => {
    const env = makeEnv({
      premiumRow: {
        memorial_id: 'mem-heritage',
        tier: 'heritage',
        plan_type: 'lifetime',
        expires_at: null,
        status: 'succeeded',
      },
    })
    const res = await worker.fetch(getReq('mem-heritage'), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tier).toBe('heritage')
    expect(body.active).toBe(true)
    expect(body.premium).toBe(true)
    expect(body.features.customDomain).toBe(true)
    expect(body.features.multiLanguage).toBe(true)
    expect(body.features.removeBranding).toBe(true)
  })

  it('when DB has both a lifetime row and an expired annual row, ORDER BY prefers the lifetime — DB mock simulates this by returning the lifetime row', async () => {
    // The SQL ORDER BY (expires_at IS NULL) DESC, expires_at DESC picks the
    // lifetime row first. Our mock already returns whichever row we pass in,
    // so we test the resolver logic: if the returned row is the lifetime one,
    // the result is active.
    const env = makeEnv({
      premiumRow: {
        memorial_id: 'mem-both',
        tier: 'premium',
        plan_type: 'lifetime',
        expires_at: null,
        status: 'succeeded',
      },
    })
    const res = await worker.fetch(getReq('mem-both'), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tier).toBe('premium')
    expect(body.active).toBe(true)
    expect(body.premium).toBe(true)
  })

  it('backward-compat: response always includes the premium boolean', async () => {
    // Ensures the legacy { premium } field is never dropped
    const env = makeEnv({ premiumRow: null })
    const res = await worker.fetch(getReq('mem-compat'), env)
    const body = await res.json()
    expect(Object.prototype.hasOwnProperty.call(body, 'premium')).toBe(true)
  })
})
