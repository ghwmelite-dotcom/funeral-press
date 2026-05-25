import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildAnniversaryEmail,
  runAnniversarySweep,
  HOLIDAYS,
} from '../utils/anniversaryEmail.js'

// ─── Mock D1 helpers ─────────────────────────────────────────────────────────

/**
 * Build a minimal mock D1 database that understands the queries issued by
 * handleFollowMemorial (tested via the handler logic exercised through
 * makeMockDbForFollow) and runAnniversarySweep.
 */
function makeMockDbForSweep({ metaRows = [], followersByMemorial = {}, updatedMeta = [] }) {
  const state = {
    metaRows: metaRows.map(r => ({ ...r })),
    followersByMemorial,
    updatedMeta, // tracks memorial_id → last_reminder_md updates
    updates: [],
  }

  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        all: async () => {
          if (sql.includes('FROM memorial_meta')) {
            // Sweep query: birth_md=? OR death_md=? AND last_reminder_md != ?
            const today = args[0]
            const results = state.metaRows.filter(r => {
              const notSweptToday = !r.last_reminder_md || r.last_reminder_md !== today
              if (sql.includes('birth_md = ?') && sql.includes('death_md = ?')) {
                // birthday / death anniversary pass (args: today, today, today)
                return (r.birth_md === today || r.death_md === today) && notSweptToday
              }
              // holiday pass — everything not swept today
              return notSweptToday
            })
            return { results }
          }
          if (sql.includes('FROM memorial_followers')) {
            const memId = args[0]
            return { results: state.followersByMemorial[memId] || [] }
          }
          return { results: [] }
        },
        run: async () => {
          if (sql.includes('UPDATE memorial_meta')) {
            // args: [lastReminderMd, memorialId]
            const [md, memId] = args
            state.updates.push({ memId, md })
            // mutate in-place so second sweep query sees the guard
            const row = state.metaRows.find(r => r.memorial_id === memId)
            if (row) row.last_reminder_md = md
            return { meta: { changes: 1 } }
          }
          return { meta: { changes: 0 } }
        },
        first: async () => null,
      }),
    }),
  }
}

/**
 * Minimal mock DB for the follow handler tests (handleFollowMemorial path
 * exercised by instantiating the function from auth-api.js via the worker).
 * We test the handler through the full worker fetch() call.
 */
function makeMockDbForFollow() {
  const state = {
    meta: {},        // memorial_id → row
    followers: {},   // `${memorial_id}:${email}` → row
    inserts: [],
    upsertMeta: [],
  }

  return {
    _state: state,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.includes('INSERT INTO memorial_meta')) {
            const [memId, decName, birthMd, deathMd, _null, updatedAt] = args
            state.meta[memId] = { memorial_id: memId, deceased_name: decName, birth_md: birthMd, death_md: deathMd, updated_at: updatedAt }
            state.upsertMeta.push({ memId, decName, birthMd, deathMd })
            return { meta: { changes: 1 } }
          }
          if (sql.includes('INSERT INTO memorial_followers')) {
            // SQL: VALUES (?, ?, ?, NULL, ?, ?) → bind args: [id, memId, email, token, createdAt]
            // user_id is the literal NULL in the SQL, not a bind arg
            const [id, memId, email, token, createdAt] = args
            const key = `${memId}:${email}`
            if (!state.followers[key]) {
              // ON CONFLICT DO NOTHING — only insert if not present
              state.followers[key] = { id, memorial_id: memId, email, unsubscribe_token: token, created_at: createdAt }
              state.inserts.push({ memId, email, token })
            }
            return { meta: { changes: state.followers[key] ? 1 : 0 } }
          }
          return { meta: { changes: 0 } }
        },
        first: async () => {
          if (sql.includes('SELECT unsubscribe_token FROM memorial_followers')) {
            const [memId, email] = args
            const key = `${memId}:${email}`
            return state.followers[key] || null
          }
          return null
        },
        all: async () => ({ results: [] }),
      }),
    }),
  }
}

function makeEnvForSweep({ metaRows = [], followersByMemorial = {}, resendKey = 'rs_test' } = {}) {
  return {
    RESEND_API_KEY: resendKey,
    DB: makeMockDbForSweep({ metaRows, followersByMemorial }),
  }
}

// ─── buildAnniversaryEmail ───────────────────────────────────────────────────

describe('buildAnniversaryEmail', () => {
  it('returns subject + html for birthday occasion', () => {
    const { subject, html } = buildAnniversaryEmail({
      deceasedName: 'Kofi Mensah',
      occasion: 'birthday',
      memorialId: 'mem-001',
      unsubscribeToken: 'tok123',
    })
    expect(subject).toContain('Kofi Mensah')
    expect(html).toContain('birthday')
    expect(html).toContain('/memorial/mem-001')
    expect(html).toContain('unsubscribe?token=tok123')
    // No donate CTA
    expect(html).not.toMatch(/donat/i)
  })

  it('returns correct subject + html for death_anniversary occasion', () => {
    const { subject, html } = buildAnniversaryEmail({
      deceasedName: 'Ama Darko',
      occasion: 'death_anniversary',
      memorialId: 'mem-002',
      unsubscribeToken: 'tok456',
    })
    expect(subject).toContain('Ama Darko')
    expect(html).toContain('anniversary')
    expect(html).toContain('/memorial/mem-002')
    expect(html).toContain('unsubscribe?token=tok456')
    expect(html).not.toMatch(/donat/i)
  })

  it('returns html for remembrance occasion', () => {
    const { subject, html } = buildAnniversaryEmail({
      deceasedName: 'Grace Asante',
      occasion: 'remembrance',
      memorialId: 'mem-003',
      unsubscribeToken: 'tok789',
    })
    expect(subject).toContain('Grace Asante')
    expect(html).toContain('remembrance')
    expect(html).not.toMatch(/donat/i)
  })

  it('includes both memorial CTA links', () => {
    const { html } = buildAnniversaryEmail({
      deceasedName: 'Test',
      occasion: 'birthday',
      memorialId: 'mem-cta',
      unsubscribeToken: 'ttt',
    })
    // "Visit the memorial page" link
    expect(html).toContain('Visit the memorial page')
    // "Light a candle" link
    expect(html).toContain('Light a candle')
    expect(html).toContain('#light-a-candle')
  })

  it('falls back to generic name when deceasedName is empty', () => {
    const { html } = buildAnniversaryEmail({
      deceasedName: '',
      occasion: 'birthday',
      memorialId: 'mem-empty',
      unsubscribeToken: 'tok_empty',
    })
    expect(html).toContain('your loved one')
  })

  it('HTML-escapes a deceasedName containing injection markup', () => {
    const { html } = buildAnniversaryEmail({
      deceasedName: '<img src=x onerror=alert(1)>Bob',
      occasion: 'birthday',
      memorialId: 'mem-inject',
      unsubscribeToken: 'tok_inject',
    })
    // < and > must be escaped to entities — the browser will not parse an img tag
    expect(html).toContain('&lt;img')
    expect(html).toContain('&gt;Bob')
    // Raw unescaped open tag must not appear anywhere in the HTML
    expect(html).not.toContain('<img')
  })

  it('HTML-escapes a deceasedName with anchor phishing payload', () => {
    const { html } = buildAnniversaryEmail({
      deceasedName: '<a href="evil.example.com">click</a>',
      occasion: 'death_anniversary',
      memorialId: 'mem-phish',
      unsubscribeToken: 'tok_phish',
    })
    // Angle brackets and quotes must be escaped
    expect(html).toContain('&lt;a href=')
    expect(html).toContain('&quot;evil.example.com&quot;')
    expect(html).not.toContain('<a href="evil.example.com">')
  })
})

// ─── handleFollowMemorial (via auth-api worker) ───────────────────────────────

describe('handleFollowMemorial via auth-api worker', () => {
  let worker, db

  beforeEach(async () => {
    // Dynamically import so each test gets a fresh module state
    vi.resetModules()
    const mod = await import('../auth-api.js')
    worker = mod.default

    db = makeMockDbForFollow()

    // Stub fetch globally — used for Resend confirmation + Paystack (none here)
    global.fetch = vi.fn(async () => ({ ok: true, text: async () => 'ok', json: async () => ({}) }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function makeEnv() {
    return {
      DB: db,
      JWT_SECRET: 'test-secret',
      RESEND_API_KEY: 'rs_test',
      RATE_LIMITS: {
        get: vi.fn(async () => null),
        put: vi.fn(async () => {}),
      },
    }
  }

  function makeRequest(memorialId, body) {
    return new Request(`https://auth-api.funeralpress.org/memorial/${memorialId}/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' },
      body: JSON.stringify(body),
    })
  }

  it('upserts memorial_meta with correct birth_md / death_md from ISO dates', async () => {
    const req = makeRequest('mem-abc', {
      email: 'follower@example.com',
      deceasedName: 'Kwame Boateng',
      dateOfBirth: '1948-03-12',
      dateOfDeath: '2022-11-02',
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    const meta = db._state.upsertMeta[0]
    expect(meta.birthMd).toBe('03-12')
    expect(meta.deathMd).toBe('11-02')
  })

  it('stores NULL birth_md / death_md when dates are missing', async () => {
    const req = makeRequest('mem-nodates', {
      email: 'follower@example.com',
      deceasedName: 'Jane Doe',
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(200)

    const meta = db._state.upsertMeta[0]
    expect(meta.birthMd).toBeNull()
    expect(meta.deathMd).toBeNull()
  })

  it('inserts a follower row with an unsubscribe token', async () => {
    const req = makeRequest('mem-abc2', {
      email: 'new@example.com',
      deceasedName: 'Akosua Frimpong',
      dateOfBirth: '1960-07-04',
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(200)

    const key = 'mem-abc2:new@example.com'
    expect(db._state.followers[key]).toBeDefined()
    expect(db._state.followers[key].unsubscribe_token).toBeTruthy()
    expect(db._state.followers[key].unsubscribe_token.length).toBeGreaterThan(20)
  })

  it('returns 400 for an invalid email address', async () => {
    const req = makeRequest('mem-abc3', {
      email: 'not-an-email',
      deceasedName: 'Test',
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/email/i)
  })

  it('following the same memorial+email twice does not duplicate the follower', async () => {
    const env = makeEnv()
    const body = { email: 'dup@example.com', deceasedName: 'Duplicate Test' }

    await worker.fetch(makeRequest('mem-dup', body), env)
    await worker.fetch(makeRequest('mem-dup', body), env)

    // Only one follower row should exist (ON CONFLICT DO NOTHING)
    const inserts = db._state.inserts.filter(i => i.memId === 'mem-dup' && i.email === 'dup@example.com')
    expect(inserts).toHaveLength(1)
  })
})

// ─── handleUnsubscribe (via auth-api worker) ─────────────────────────────────

describe('handleUnsubscribe via auth-api worker', () => {
  let worker

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../auth-api.js')
    worker = mod.default
    global.fetch = vi.fn(async () => ({ ok: true, text: async () => 'ok', json: async () => ({}) }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function makeUnsubDb(existingToken = null) {
    const state = { deleted: [] }
    return {
      _state: state,
      prepare: (sql) => ({
        bind: (...args) => ({
          first: async () => {
            if (sql.includes('SELECT memorial_id') && existingToken && args[0] === existingToken) {
              return { memorial_id: 'mem-xyz' }
            }
            return null
          },
          run: async () => {
            if (sql.includes('DELETE FROM memorial_followers')) {
              state.deleted.push(args[0])
            }
            return { meta: { changes: 1 } }
          },
          all: async () => ({ results: [] }),
        }),
      }),
    }
  }

  function makeEnv(db) {
    return {
      DB: db,
      JWT_SECRET: 'test',
      RATE_LIMITS: {
        get: vi.fn(async () => null),
        put: vi.fn(async () => {}),
      },
    }
  }

  it('removes the follower row by token and returns { ok: true }', async () => {
    const token = 'valid-token-abc'
    const db = makeUnsubDb(token)
    const req = new Request('https://auth-api.funeralpress.org/reminders/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' },
      body: JSON.stringify({ token }),
    })
    const res = await worker.fetch(req, makeEnv(db))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(db._state.deleted).toContain(token)
  })

  it('returns a friendly 200 for an unknown token (idempotent no-op)', async () => {
    const db = makeUnsubDb(null) // no token stored
    const req = new Request('https://auth-api.funeralpress.org/reminders/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' },
      body: JSON.stringify({ token: 'unknown-xyz' }),
    })
    const res = await worker.fetch(req, makeEnv(db))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    // DELETE was not called for a missing row
    expect(db._state.deleted).toHaveLength(0)
  })
})

// ─── runAnniversarySweep ──────────────────────────────────────────────────────

describe('runAnniversarySweep', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({ ok: true, text: async () => 'ok', json: async () => ({}) }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  function resendCalls() {
    return global.fetch.mock.calls.filter(([url]) => String(url).includes('resend.com'))
  }

  // ── birthday / death anniversary ──────────────────────────────────────────

  it('sends a birthday email to each follower when birth_md matches today', async () => {
    // Fix date to 2026-03-12 UTC
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-12T07:00:00Z'))

    const env = makeEnvForSweep({
      metaRows: [{ memorial_id: 'mem-1', deceased_name: 'Kwame Boateng', birth_md: '03-12', death_md: '11-02', last_reminder_md: null }],
      followersByMemorial: {
        'mem-1': [
          { email: 'a@example.com', unsubscribe_token: 'tok-a' },
          { email: 'b@example.com', unsubscribe_token: 'tok-b' },
        ],
      },
    })

    const result = await runAnniversarySweep(env)

    expect(result.birthday).toBe(2)
    expect(result.deathAnniversary).toBe(0)
    expect(result.errors).toBe(0)

    const calls = resendCalls()
    expect(calls).toHaveLength(2)

    // Each Resend payload must contain the memorial CTA URL and the unsubscribe link
    for (const [, init] of calls) {
      const body = JSON.parse(init.body)
      expect(body.html).toContain('/memorial/mem-1')
      expect(body.subject).toContain('Kwame Boateng')
      // No donate CTA
      expect(body.html).not.toMatch(/donat/i)
    }

    // Unsubscribe tokens must be in the respective emails
    const bodies = calls.map(([, init]) => JSON.parse(init.body))
    const htmlBodies = bodies.map(b => b.html)
    expect(htmlBodies.some(h => h.includes('tok-a'))).toBe(true)
    expect(htmlBodies.some(h => h.includes('tok-b'))).toBe(true)
  })

  it('sets last_reminder_md after sweep so a second run sends nothing', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-12T07:00:00Z'))

    const env = makeEnvForSweep({
      metaRows: [{ memorial_id: 'mem-2', deceased_name: 'Ama Darko', birth_md: '03-12', death_md: null, last_reminder_md: null }],
      followersByMemorial: {
        'mem-2': [{ email: 'c@example.com', unsubscribe_token: 'tok-c' }],
      },
    })

    // First sweep
    const r1 = await runAnniversarySweep(env)
    expect(r1.birthday).toBe(1)

    // last_reminder_md should now be '03-12'
    const updatedRow = env.DB._state.metaRows.find(r => r.memorial_id === 'mem-2')
    expect(updatedRow.last_reminder_md).toBe('03-12')

    // Second sweep on the same day — no emails
    global.fetch.mockClear()
    const r2 = await runAnniversarySweep(env)
    expect(r2.birthday).toBe(0)
    expect(resendCalls()).toHaveLength(0)
  })

  it('sends a death_anniversary email when death_md matches today', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-02T07:00:00Z'))

    const env = makeEnvForSweep({
      metaRows: [{ memorial_id: 'mem-3', deceased_name: 'Yaw Asante', birth_md: null, death_md: '11-02', last_reminder_md: null }],
      followersByMemorial: {
        'mem-3': [{ email: 'd@example.com', unsubscribe_token: 'tok-d' }],
      },
    })

    const result = await runAnniversarySweep(env)
    expect(result.deathAnniversary).toBe(1)
    expect(result.birthday).toBe(0)

    const calls = resendCalls()
    expect(calls).toHaveLength(1)
    const body = JSON.parse(calls[0][1].body)
    expect(body.html).toContain('anniversary')
    expect(body.html).toContain('/memorial/mem-3')
  })

  it('sends both birthday and death_anniversary when both match today', async () => {
    vi.useFakeTimers()
    // Unusual edge case: birthday == death day (same MM-DD)
    vi.setSystemTime(new Date('2026-07-04T07:00:00Z'))

    const env = makeEnvForSweep({
      metaRows: [{ memorial_id: 'mem-both', deceased_name: 'Both Day', birth_md: '07-04', death_md: '07-04', last_reminder_md: null }],
      followersByMemorial: {
        'mem-both': [{ email: 'e@example.com', unsubscribe_token: 'tok-e' }],
      },
    })

    const result = await runAnniversarySweep(env)
    expect(result.birthday).toBe(1)
    expect(result.deathAnniversary).toBe(1)
    expect(resendCalls()).toHaveLength(2)
  })

  // ── holiday remembrance ────────────────────────────────────────────────────

  it("sends a remembrance email to followers on All Souls' Day", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-02T07:00:00Z'))

    // This memorial does NOT match birth_md or death_md — holiday only
    const env = makeEnvForSweep({
      metaRows: [{ memorial_id: 'mem-holiday', deceased_name: 'Grace Frimpong', birth_md: '01-01', death_md: '06-15', last_reminder_md: null }],
      followersByMemorial: {
        'mem-holiday': [{ email: 'f@example.com', unsubscribe_token: 'tok-f' }],
      },
    })

    const result = await runAnniversarySweep(env)
    expect(result.remembrance).toBe(1)
    expect(result.birthday).toBe(0)
    expect(result.deathAnniversary).toBe(0)

    const calls = resendCalls()
    expect(calls).toHaveLength(1)
    const body = JSON.parse(calls[0][1].body)
    expect(body.html).toContain('/memorial/mem-holiday')
    expect(body.html).toContain('remembrance')
  })

  it('does not double-email a memorial whose anniversary matches a holiday', async () => {
    vi.useFakeTimers()
    // 11-02 is All Souls' Day AND this memorial's death_md
    vi.setSystemTime(new Date('2026-11-02T07:00:00Z'))

    const env = makeEnvForSweep({
      metaRows: [{ memorial_id: 'mem-overlap', deceased_name: 'Overlap Test', birth_md: null, death_md: '11-02', last_reminder_md: null }],
      followersByMemorial: {
        'mem-overlap': [{ email: 'g@example.com', unsubscribe_token: 'tok-g' }],
      },
    })

    const result = await runAnniversarySweep(env)
    // Pass 1 sweeps it and sets last_reminder_md; pass 2 skips it
    expect(result.deathAnniversary).toBe(1)
    expect(result.remembrance).toBe(0) // not double-sent
    expect(resendCalls()).toHaveLength(1)
  })

  it('continues after a Resend failure and reports the error count', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-12T07:00:00Z'))

    // First send succeeds, second fails
    let callCount = 0
    global.fetch = vi.fn(async () => {
      callCount++
      if (callCount === 1) return { ok: false, text: async () => 'bad request', json: async () => ({}) }
      return { ok: true, text: async () => 'ok', json: async () => ({}) }
    })

    const env = makeEnvForSweep({
      metaRows: [{ memorial_id: 'mem-err', deceased_name: 'Error Test', birth_md: '03-12', death_md: null, last_reminder_md: null }],
      followersByMemorial: {
        'mem-err': [
          { email: 'fail@example.com', unsubscribe_token: 'tok-fail' },
          { email: 'ok@example.com', unsubscribe_token: 'tok-ok' },
        ],
      },
    })

    const result = await runAnniversarySweep(env)
    // One error, one success
    expect(result.errors).toBe(1)
    expect(result.birthday).toBe(1)
    // Sweep still marks the memorial — partial send is still swept
    const updated = env.DB._state.updates.find(u => u.memId === 'mem-err')
    expect(updated).toBeDefined()
  })

  it('returns zeroes without throwing when DB is missing', async () => {
    const result = await runAnniversarySweep({})
    expect(result.birthday).toBe(0)
    expect(result.deathAnniversary).toBe(0)
    expect(result.remembrance).toBe(0)
    expect(result.errors).toBe(0)
  })

  it('sends no emails on a non-anniversary, non-holiday date', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T07:00:00Z'))

    const env = makeEnvForSweep({
      metaRows: [{ memorial_id: 'mem-quiet', deceased_name: 'Quiet Day', birth_md: '03-12', death_md: '11-02', last_reminder_md: null }],
      followersByMemorial: {
        'mem-quiet': [{ email: 'h@example.com', unsubscribe_token: 'tok-h' }],
      },
    })

    const result = await runAnniversarySweep(env)
    expect(result.birthday).toBe(0)
    expect(result.deathAnniversary).toBe(0)
    expect(result.remembrance).toBe(0)
    expect(resendCalls()).toHaveLength(0)
  })
})

// ─── HOLIDAYS constant ────────────────────────────────────────────────────────

describe('HOLIDAYS', () => {
  it('defines All Souls Day on 11-02', () => {
    expect(HOLIDAYS['11-02']).toBeTruthy()
  })

  it('defines Christmas on 12-25', () => {
    expect(HOLIDAYS['12-25']).toBeTruthy()
  })
})
