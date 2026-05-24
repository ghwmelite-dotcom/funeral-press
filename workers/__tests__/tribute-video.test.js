import { describe, it, expect, vi, afterEach } from 'vitest'
import worker from '../auth-api.js'
import { signJWT } from '../utils/jwt.js'

const JWT_SECRET = 'test-jwt-secret'
const USER_ID = 'user-1'
const BASE = 'https://api.example.com'

function makeMockDb({ premium = [], videos = [] } = {}) {
  const state = { premium: premium.map((p) => ({ ...p })), videos: videos.map((v) => ({ ...v })) }
  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.startsWith('INSERT INTO tribute_videos')) {
            state.videos.push({
              id: args[0], memorial_id: args[1], shotstack_id: args[2],
              caption: args[3], created_at: args[4], status: 'rendering',
            })
            return { meta: { changes: 1 } }
          }
          if (sql.startsWith('UPDATE tribute_videos') && sql.includes("'ready'")) {
            const v = state.videos.find((x) => x.id === args[2])
            if (v) { v.status = 'ready'; v.output_url = args[0]; v.ready_at = args[1] }
            return { meta: { changes: 1 } }
          }
          if (sql.startsWith('UPDATE tribute_videos') && sql.includes("'failed'")) {
            const v = state.videos.find((x) => x.id === args[0])
            if (v) v.status = 'failed'
            return { meta: { changes: 1 } }
          }
          return { meta: { changes: 0 } }
        },
        first: async () => {
          if (sql.includes('FROM memorial_premium') && sql.includes("status = 'succeeded'")) {
            return state.premium.find((p) => p.memorial_id === args[0] && p.status === 'succeeded') || null
          }
          if (sql.includes('FROM tribute_videos WHERE id = ?')) {
            return state.videos.find((v) => v.id === args[0]) || null
          }
          if (sql.includes('FROM users WHERE id = ?')) return { id: USER_ID, email: 'u@e.test' }
          return null
        },
        all: async () => ({ results: [] }),
      }),
    }),
  }
}

function makeEnv(dbOpts) {
  return {
    JWT_SECRET,
    CORS_ORIGIN: 'https://funeralpress.org',
    ENVIRONMENT: 'dev',
    SHOTSTACK_ENV: 'stage',
    SHOTSTACK_API_KEY: 'ss_test',
    DB: makeMockDb(dbOpts),
    AI: { run: vi.fn(async () => ({ response: 'A life of love and grace.' })) },
    IMAGES: { put: vi.fn(async () => undefined) },
    RATE_LIMITS: { get: async () => null, put: async () => undefined },
    OTP_KV: { get: async () => null, put: async () => undefined },
    MEMORIAL_PAGES_KV: { get: async () => null, put: async () => undefined },
  }
}

async function authedPost(path, body) {
  const token = await signJWT({ sub: USER_ID, email: 'u@e.test', exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET)
  return new Request(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'CF-Connecting-IP': '1.2.3.4' },
    body: JSON.stringify(body),
  })
}

afterEach(() => vi.restoreAllMocks())

describe('POST /memorial-premium/:id/tribute-video (create)', () => {
  it('403s when the memorial is not premium', async () => {
    const env = makeEnv({ premium: [] })
    const res = await worker.fetch(await authedPost('/memorial-premium/mem1/tribute-video', { title: 'Ama', imageUrls: ['https://img/1.jpg'] }), env)
    expect(res.status).toBe(403)
  })

  it('400s with no photos', async () => {
    const env = makeEnv({ premium: [{ id: 'p1', memorial_id: 'mem1', status: 'succeeded' }] })
    const res = await worker.fetch(await authedPost('/memorial-premium/mem1/tribute-video', { title: 'Ama', imageUrls: [] }), env)
    expect(res.status).toBe(400)
  })

  it('starts a render and inserts a rendering row when premium', async () => {
    const env = makeEnv({ premium: [{ id: 'p1', memorial_id: 'mem1', status: 'succeeded' }] })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ response: { id: 'ss-render-1' } }), { status: 200 }))
    const res = await worker.fetch(await authedPost('/memorial-premium/mem1/tribute-video', {
      title: 'Ama Mensah', subtitle: '1950 — 2026', imageUrls: ['https://img/1.jpg', 'https://img/2.jpg'],
    }), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('rendering')
    expect(body.videoId).toBeTruthy()
    expect(env.DB._state.videos).toHaveLength(1)
    expect(env.DB._state.videos[0].shotstack_id).toBe('ss-render-1')
    expect(env.AI.run).toHaveBeenCalled() // caption generated
  })

  it('falls back to a safe caption when the AI binding throws', async () => {
    const env = makeEnv({ premium: [{ id: 'p1', memorial_id: 'mem1', status: 'succeeded' }] })
    env.AI.run = vi.fn(async () => { throw new Error('AI down') })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ response: { id: 'ss-2' } }), { status: 200 }))
    const res = await worker.fetch(await authedPost('/memorial-premium/mem1/tribute-video', { title: 'Kofi', imageUrls: ['https://img/1.jpg'] }), env)
    expect(res.status).toBe(200)
    expect(env.DB._state.videos[0].caption).toMatch(/In loving memory of Kofi/)
  })

  it('401s without auth', async () => {
    const env = makeEnv({ premium: [{ id: 'p1', memorial_id: 'mem1', status: 'succeeded' }] })
    const res = await worker.fetch(new Request(`${BASE}/memorial-premium/mem1/tribute-video`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' }, body: JSON.stringify({ title: 'X', imageUrls: ['https://img/1.jpg'] }),
    }), env)
    expect(res.status).toBe(401)
  })
})

describe('GET /tribute-video/:id/status', () => {
  it('copies the MP4 to R2 and marks ready when Shotstack is done', async () => {
    const env = makeEnv({ videos: [{ id: 'v1', memorial_id: 'mem1', status: 'rendering', shotstack_id: 'ss-1' }] })
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/render/ss-1')) {
        return new Response(JSON.stringify({ response: { status: 'done', url: 'https://cdn/out.mp4' } }), { status: 200 })
      }
      return new Response('BINARY', { status: 200 }) // the MP4 fetch
    })
    const res = await worker.fetch(new Request(`${BASE}/tribute-video/v1/status`, { headers: { 'CF-Connecting-IP': '1.2.3.4' } }), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ready')
    expect(body.url).toContain('/images/tribute-videos/mem1/v1.mp4')
    expect(env.IMAGES.put).toHaveBeenCalled()
    expect(env.DB._state.videos[0].status).toBe('ready')
  })

  it('returns rendering while Shotstack is still working', async () => {
    const env = makeEnv({ videos: [{ id: 'v1', memorial_id: 'mem1', status: 'rendering', shotstack_id: 'ss-1' }] })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ response: { status: 'rendering' } }), { status: 200 }))
    const res = await worker.fetch(new Request(`${BASE}/tribute-video/v1/status`, { headers: { 'CF-Connecting-IP': '1.2.3.4' } }), env)
    expect((await res.json()).status).toBe('rendering')
    expect(env.IMAGES.put).not.toHaveBeenCalled()
  })

  it('404s for an unknown video', async () => {
    const env = makeEnv({ videos: [] })
    const res = await worker.fetch(new Request(`${BASE}/tribute-video/nope/status`, { headers: { 'CF-Connecting-IP': '1.2.3.4' } }), env)
    expect(res.status).toBe(404)
  })
})
