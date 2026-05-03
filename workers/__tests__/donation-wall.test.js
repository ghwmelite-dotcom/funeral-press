import { describe, it, expect, beforeEach } from 'vitest'
import worker from '../donation-api.js'

const MEMORIAL_ID = 'mem_abc'

function makeMockDb({ memorial = null, donations = [] }) {
  const state = { memorial, donations: donations.slice(), queries: [] }
  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => ({ meta: { changes: 0 } }),
        first: async () => {
          if (sql.includes('FROM memorials')) {
            const m = state.memorial
            if (!m) return null
            return m
          }
          return null
        },
        all: async () => {
          state.queries.push({ sql, args })
          if (sql.includes('FROM donations')) {
            // args = (memorialId, cursorTs, limit+1)
            const cursorTs = args[1]
            const limit = args[2]
            const rows = state.donations
              .filter(d => d.created_at < cursorTs)
              .sort((a, b) => b.created_at - a.created_at)
              .slice(0, limit)
            return { results: rows }
          }
          return { results: [] }
        },
      }),
    }),
  }
}

function approvedMemorial(overrides = {}) {
  return {
    id: MEMORIAL_ID,
    wall_mode: 'full',
    total_raised_pesewas: 12500,
    total_donor_count: 4,
    goal_amount_pesewas: 100000,
    last_donation_at: 1700000000000,
    approval_status: 'approved',
    deleted_at: null,
    ...overrides,
  }
}

function donation(id, name, amountPesewas, createdAt, visibility = 'public') {
  return {
    id, donor_display_name: name, amount_pesewas: amountPesewas,
    visibility, created_at: createdAt, status: 'succeeded', memorial_id: MEMORIAL_ID,
  }
}

function makeEnv({ memorial = approvedMemorial(), donations = [], kvSeed = {} } = {}) {
  const kvMap = new Map(Object.entries(kvSeed))
  return {
    DONATIONS_ENABLED: 'true',
    DONATIONS_GLOBAL_PAUSED: 'false',
    INTERNATIONAL_DONATIONS_ENABLED: 'true',
    JWT_SECRET: 'test-jwt-secret',
    PAYSTACK_SECRET_KEY: 'sk_test_fake',
    OTP_PEPPER: 'test-pepper',
    DB: makeMockDb({ memorial, donations }),
    MEMORIAL_PAGES_KV: {
      get: async (k) => kvMap.get(k) || null,
      put: async (k, v) => kvMap.set(k, v),
    },
    RATE_LIMITS: { get: async () => null, put: async () => undefined },
    OTP_KV: { get: async () => null, put: async () => undefined },
    _kv: kvMap,
  }
}

function getReq(action, query = '') {
  const url = `https://example.com/memorials/${MEMORIAL_ID}/donation/${action}${query}`
  return new Request(url, { method: 'GET', headers: { 'CF-Connecting-IP': '1.2.3.4' } })
}

describe('GET /memorials/:id/donation/totals', () => {
  it('returns totals from denormalised columns', async () => {
    const env = makeEnv({ memorial: approvedMemorial() })
    const res = await worker.fetch(getReq('totals'), env)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.total_raised_pesewas).toBe(12500)
    expect(j.total_donor_count).toBe(4)
    expect(j.goal_amount_pesewas).toBe(100000)
    expect(j.last_donation_at).toBe(1700000000000)
    expect(j.wall_mode).toBe('full')
  })

  it('returns 404 when memorial not found', async () => {
    const env = makeEnv({ memorial: null })
    const res = await worker.fetch(getReq('totals'), env)
    expect(res.status).toBe(404)
  })

  it('returns 404 when memorial not approved', async () => {
    const env = makeEnv({ memorial: null })  // route filters approval_status='approved'; null mocks that
    const res = await worker.fetch(getReq('totals'), env)
    expect(res.status).toBe(404)
  })

  it('caches totals in KV with TTL', async () => {
    const env = makeEnv({ memorial: approvedMemorial() })
    await worker.fetch(getReq('totals'), env)
    expect(env._kv.has(`wall:totals:${MEMORIAL_ID}`)).toBe(true)
  })

  it('serves from KV cache on second request', async () => {
    const cachedPayload = { total_raised_pesewas: 999999, total_donor_count: 99, wall_mode: 'full' }
    const env = makeEnv({
      memorial: null,  // DB would 404, but cache should hit first
      kvSeed: { [`wall:totals:${MEMORIAL_ID}`]: JSON.stringify(cachedPayload) },
    })
    const res = await worker.fetch(getReq('totals'), env)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.total_raised_pesewas).toBe(999999)
  })
})

describe('GET /memorials/:id/donation/wall', () => {
  beforeEach(() => {})

  it('returns 404 when memorial not approved', async () => {
    const env = makeEnv({ memorial: null })
    const res = await worker.fetch(getReq('wall'), env)
    expect(res.status).toBe(404)
  })

  it('full mode includes name + amount + time', async () => {
    const env = makeEnv({
      memorial: approvedMemorial({ wall_mode: 'full' }),
      donations: [
        donation('d1', 'Akua', 5000, 1700000003000),
        donation('d2', 'Kofi', 3000, 1700000002000),
      ],
    })
    const res = await worker.fetch(getReq('wall'), env)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.wall_mode).toBe('full')
    expect(j.donations).toHaveLength(2)
    expect(j.donations[0]).toMatchObject({ display_name: 'Akua', amount_pesewas: 5000, created_at: 1700000003000 })
    expect(j.donations[1]).toMatchObject({ display_name: 'Kofi', amount_pesewas: 3000 })
  })

  it('names_only mode strips amounts', async () => {
    const env = makeEnv({
      memorial: approvedMemorial({ wall_mode: 'names_only' }),
      donations: [donation('d1', 'Akua', 5000, 1700000003000)],
    })
    const res = await worker.fetch(getReq('wall'), env)
    const j = await res.json()
    expect(j.wall_mode).toBe('names_only')
    expect(j.donations[0].display_name).toBe('Akua')
    expect(j.donations[0].amount_pesewas).toBeUndefined()
  })

  it('private mode returns empty donations array', async () => {
    const env = makeEnv({
      memorial: approvedMemorial({ wall_mode: 'private' }),
      donations: [donation('d1', 'Akua', 5000, 1700000003000)],
    })
    const res = await worker.fetch(getReq('wall'), env)
    const j = await res.json()
    expect(j.wall_mode).toBe('private')
    expect(j.donations).toEqual([])
    // Totals still returned
    expect(j.total_raised_pesewas).toBe(12500)
  })

  it('renders anonymous donations as "Anonymous" with no amount in full mode', async () => {
    const env = makeEnv({
      memorial: approvedMemorial({ wall_mode: 'full' }),
      donations: [
        donation('d1', 'My Real Name', 5000, 1700000003000, 'anonymous'),
        donation('d2', 'Kofi', 3000, 1700000002000, 'public'),
      ],
    })
    const res = await worker.fetch(getReq('wall'), env)
    const j = await res.json()
    expect(j.donations[0].display_name).toBe('Anonymous')
    expect(j.donations[0].amount_pesewas).toBeUndefined()
    expect(j.donations[1].display_name).toBe('Kofi')
    expect(j.donations[1].amount_pesewas).toBe(3000)
  })

  it('paginates with cursor and includes next_cursor when more rows exist', async () => {
    const ds = []
    for (let i = 0; i < 25; i++) ds.push(donation(`d${i}`, `Name${i}`, 1000, 1700000000000 + i))
    const env = makeEnv({
      memorial: approvedMemorial({ wall_mode: 'full' }),
      donations: ds,
    })
    const res = await worker.fetch(getReq('wall', '?limit=20'), env)
    const j = await res.json()
    expect(j.donations).toHaveLength(20)
    expect(j.next_cursor).toBeTruthy()
    // Decode cursor — should be base64-encoded created_at of the 20th newest
    const cursorTs = Number(atob(j.next_cursor))
    expect(cursorTs).toBe(j.donations[19].created_at)
  })

  it('returns null next_cursor when fewer rows than limit', async () => {
    const env = makeEnv({
      memorial: approvedMemorial({ wall_mode: 'full' }),
      donations: [donation('d1', 'Akua', 5000, 1700000003000)],
    })
    const res = await worker.fetch(getReq('wall'), env)
    const j = await res.json()
    expect(j.next_cursor).toBeNull()
  })

  it('rejects malformed cursor with 400', async () => {
    const env = makeEnv({ memorial: approvedMemorial() })
    const res = await worker.fetch(getReq('wall', '?cursor=not-a-number'), env)
    expect(res.status).toBe(400)
  })

  it('caches wall response in KV', async () => {
    const env = makeEnv({
      memorial: approvedMemorial({ wall_mode: 'full' }),
      donations: [donation('d1', 'Akua', 5000, 1700000003000)],
    })
    await worker.fetch(getReq('wall'), env)
    expect(env._kv.has(`wall:list:${MEMORIAL_ID}:start:20`)).toBe(true)
  })

  it('serves from KV cache on second request', async () => {
    const cached = { wall_mode: 'full', donations: [{ id: 'cached', display_name: 'Cached User' }], next_cursor: null, total_raised_pesewas: 1, total_donor_count: 1 }
    const env = makeEnv({
      memorial: null,
      kvSeed: { [`wall:list:${MEMORIAL_ID}:start:20`]: JSON.stringify(cached) },
    })
    const res = await worker.fetch(getReq('wall'), env)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.donations[0].display_name).toBe('Cached User')
  })
})
