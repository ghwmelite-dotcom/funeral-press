import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from '../donation-api.js'

function mockEnv(overrides = {}) {
  const dbState = { rows: [], memorialKv: new Map() }
  const memorialKv = new Map()
  const rateLimits = new Map()
  return {
    DONATIONS_ENABLED: 'true',
    DONATIONS_GLOBAL_PAUSED: 'false',
    INTERNATIONAL_DONATIONS_ENABLED: 'true',
    JWT_SECRET: 'test-jwt-secret',
    PAYSTACK_SECRET_KEY: 'sk_test_fake',
    PAYSTACK_WEBHOOK_SECRET: 'whsec_fake',
    OTP_PEPPER: 'test-pepper',
    TIP_DEFAULT_PERCENT: '5',
    HUBTEL_CLIENT_ID: 'fake-client-id',
    HUBTEL_CLIENT_SECRET: 'fake-client-secret',
    HUBTEL_SENDER_ID: 'FuneralPress',
    DB: makeMockDb(dbState),
    MEMORIAL_PAGES_KV: {
      get: async (k) => memorialKv.get(k) || null,
      put: async (k, v) => memorialKv.set(k, v),
      delete: async (k) => memorialKv.delete(k),
    },
    RATE_LIMITS: {
      get: async (k) => rateLimits.get(k) || null,
      put: async (k, v) => rateLimits.set(k, v),
    },
    OTP_KV: {
      get: async (_k) => null,
      put: async (_k, _v) => undefined,
    },
    _state: { dbState, memorialKv, rateLimits },
    ...overrides,
  }
}

function makeMockDb(state) {
  const handlers = {
    'SELECT id, slug FROM users WHERE id = ?': (args) => ({ id: args[0], slug: 'kwame-mensah' }),
    'INSERT INTO memorials': (args) => { state.rows.push({ table: 'memorials', args }); return { meta: { last_row_id: 1 } } },
    'INSERT INTO donation_audit': (args) => { state.rows.push({ table: 'donation_audit', args }); return { meta: { last_row_id: 1 } } },
  }
  return {
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          const handler = Object.entries(handlers).find(([k]) => sql.includes(k))
          return handler ? handler[1](args) : { meta: { last_row_id: 0 } }
        },
        first: async () => null,
        all: async () => ({ results: [] }),
      }),
    }),
    _state: state,
  }
}

async function makeReq(memorialId, body, jwt) {
  return new Request(`https://example.com/memorials/${memorialId}/donation/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
      'CF-Connecting-IP': '1.2.3.4',
    },
    body: JSON.stringify(body),
  })
}

async function makeJwt(env, sub = '42') {
  const { signJWT } = await import('../utils/jwt.js')
  return signJWT({ sub: String(sub), exp: Math.floor(Date.now() / 1000) + 3600 }, env.JWT_SECRET)
}

describe('POST /memorials/:id/donation/init — self-declared mode', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: true, data: { subaccount_code: 'ACCT_test' } }),
    })
  })

  it('rejects unauthenticated request', async () => {
    const env = mockEnv()
    const res = await worker.fetch(
      new Request('https://example.com/memorials/mem_abc/donation/init', { method: 'POST' }),
      env
    )
    expect(res.status).toBe(401)
  })

  it('creates Paystack subaccount and inserts memorial row in self mode', async () => {
    const env = mockEnv()
    // Seed KV memorial — this is the existing memorial-page-api format
    await env.MEMORIAL_PAGES_KV.put('mem_abc', JSON.stringify({
      slug: 'akua-mensah',
      deceased_name: 'Akua Mensah',
      creator_user_id: 42,
    }))
    // Seed Paystack resolve mock to succeed
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: true, data: { account_name: 'AKOSUA MENSAH' } }) })  // /bank/resolve
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: true, data: { subaccount_code: 'ACCT_xyz' } }) })  // /subaccount

    const jwt = await makeJwt(env)
    const res = await worker.fetch(await makeReq('mem_abc', {
      payout_momo_number: '+233244111222',
      payout_momo_provider: 'mtn',
      payout_account_name: 'Akosua Mensah',
      wall_mode: 'full',
      goal_amount_pesewas: 5000000,
      family_head: { mode: 'self' },
    }, jwt), env)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.approval_status).toBe('approved')
    expect(body.subaccount_code).toBe('ACCT_xyz')
    // donation_audit row written
    expect(env._state.dbState.rows.some(r => r.table === 'donation_audit')).toBe(true)
  })

  it('rejects when caller did not create the memorial', async () => {
    const env = mockEnv()
    await env.MEMORIAL_PAGES_KV.put('mem_abc', JSON.stringify({
      slug: 'akua-mensah', creator_user_id: 99,  // different user
    }))
    const jwt = await makeJwt(env, '42')
    const res = await worker.fetch(await makeReq('mem_abc', {
      payout_momo_number: '+233244111222',
      payout_momo_provider: 'mtn',
      payout_account_name: 'Akosua',
      wall_mode: 'full',
      family_head: { mode: 'self' },
    }, jwt), env)
    expect(res.status).toBe(403)
  })

  it('rejects invalid wall_mode', async () => {
    const env = mockEnv()
    await env.MEMORIAL_PAGES_KV.put('mem_abc', JSON.stringify({ slug: 'a', creator_user_id: 42 }))
    const jwt = await makeJwt(env)
    const res = await worker.fetch(await makeReq('mem_abc', {
      payout_momo_number: '+233244111222',
      payout_momo_provider: 'mtn',
      payout_account_name: 'X',
      wall_mode: 'invalid_mode',
      family_head: { mode: 'self' },
    }, jwt), env)
    expect(res.status).toBe(400)
  })

  it('rejects when MoMo verify fails', async () => {
    const env = mockEnv()
    await env.MEMORIAL_PAGES_KV.put('mem_abc', JSON.stringify({ slug: 'a', creator_user_id: 42 }))
    global.fetch.mockResolvedValueOnce({
      ok: false, status: 422, json: async () => ({ status: false, message: 'Account not found' }),
    })
    const jwt = await makeJwt(env)
    const res = await worker.fetch(await makeReq('mem_abc', {
      payout_momo_number: '+233244111222',
      payout_momo_provider: 'mtn',
      payout_account_name: 'X',
      wall_mode: 'full',
      family_head: { mode: 'self' },
    }, jwt), env)
    expect(res.status).toBe(400)
  })
})

describe('POST /memorials/:id/donation/init — invite mode', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: true, data: { account_name: 'AKOSUA' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: true, data: { subaccount_code: 'ACCT_xyz' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ Status: 0, MessageId: 'm1' }) })  // Hubtel SMS
  })

  it('sends SMS invite and returns pending status', async () => {
    const env = mockEnv()
    await env.MEMORIAL_PAGES_KV.put('mem_abc', JSON.stringify({
      slug: 'akua-mensah', creator_user_id: 42, deceased_name: 'Akua Mensah',
    }))
    const jwt = await makeJwt(env, '42')
    const res = await worker.fetch(await makeReq('mem_abc', {
      payout_momo_number: '+233244111222',
      payout_momo_provider: 'mtn',
      payout_account_name: 'Akosua Mensah',
      wall_mode: 'full',
      family_head: { mode: 'invite', phone: '+233207777777', name: 'Akosua' },
    }, jwt), env)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.approval_status).toBe('pending')
    expect(body.invite_sent_to).toContain('+233')
    // Hubtel fetch was called
    const hubtelCalled = global.fetch.mock.calls.some(c => String(c[0]).includes('hubtel'))
    expect(hubtelCalled).toBe(true)
  })

  it('rejects invite mode without family_head.phone', async () => {
    const env = mockEnv()
    await env.MEMORIAL_PAGES_KV.put('mem_abc', JSON.stringify({ slug: 'a', creator_user_id: 42 }))
    const jwt = await makeJwt(env)
    const res = await worker.fetch(await makeReq('mem_abc', {
      payout_momo_number: '+233244111222',
      payout_momo_provider: 'mtn',
      payout_account_name: 'X',
      wall_mode: 'full',
      family_head: { mode: 'invite' },
    }, jwt), env)
    expect(res.status).toBe(400)
  })
})
