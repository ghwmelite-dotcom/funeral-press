# Memorial Donation Rail + Phone Auth — Implementation Plan, Part 2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Continuation of:** `docs/superpowers/plans/2026-04-28-memorial-donation-rail-plan.md` (Part 1, commit `d680a83`).

**Goal:** Complete the donation rail subsystem from where Part 1 left off (working `donation-api` worker scaffold + phone auth implementation behind feature flags) through to the rollout-ready state with all routes, frontend, e2e tests, docs, and a phased launch plan.

**Tech Stack:** Same as Part 1.

---

## Phase 3 — Memorial init & Family-Head approval

### Task 18: `POST /memorials/:id/donation/init` — self-declared family head path

**Files:**
- Create: `workers/__tests__/donation-init.test.js`
- Modify: `workers/donation-api.js`

- [ ] **Step 1: Write the failing test for self-declared mode**

Create `workers/__tests__/donation-init.test.js`:

```javascript
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
    TERMII_API_KEY: 'fake-termii',
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
      get: async (k) => null,
      put: async (k, v) => undefined,
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
```

- [ ] **Step 2: Run test, expect failure**

```bash
npx vitest run workers/__tests__/donation-init.test.js
```

- [ ] **Step 3: Implement the route in `workers/donation-api.js`**

In `workers/donation-api.js`, inside the `try` block of the `fetch` handler, add the route:

```javascript
import { createSubaccount, resolveAccount } from './utils/paystack.js'
import { generateOtp, hashOtp } from './utils/otp.js'

// ... inside fetch handler:

const memorialMatch = path.match(/^\/memorials\/([^/]+)\/donation\/(init|approve|reject|settings|wall|totals|charge)$/)
if (memorialMatch) {
  const [, memorialId, action] = memorialMatch

  if (action === 'init' && request.method === 'POST') {
    const auth = await authenticate(request, env)
    if (!auth) return error('Auth required', 401, request)

    const body = await request.json().catch(() => ({}))
    const {
      payout_momo_number,
      payout_momo_provider,
      payout_account_name,
      wall_mode,
      goal_amount_pesewas,
      family_head,
    } = body

    // Validation
    if (!payout_momo_number || !/^\+\d{6,15}$/.test(payout_momo_number)) {
      return error('Invalid payout MoMo number', 400, request)
    }
    if (!['mtn', 'vodafone', 'airteltigo'].includes(payout_momo_provider)) {
      return error('Invalid MoMo provider', 400, request)
    }
    if (!payout_account_name || payout_account_name.length > 100) {
      return error('Invalid account name', 400, request)
    }
    if (!['full', 'names_only', 'private'].includes(wall_mode)) {
      return error('Invalid wall_mode', 400, request)
    }
    if (goal_amount_pesewas !== undefined && goal_amount_pesewas !== null) {
      if (!Number.isInteger(goal_amount_pesewas) || goal_amount_pesewas < 100) {
        return error('Invalid goal amount', 400, request)
      }
    }
    if (!family_head || !['self', 'invite'].includes(family_head.mode)) {
      return error('Invalid family_head.mode', 400, request)
    }
    if (family_head.mode === 'invite' && !/^\+\d{6,15}$/.test(family_head.phone || '')) {
      return error('Invalid family_head.phone for invite mode', 400, request)
    }

    // Fetch memorial from KV; verify creator
    const kvRaw = await env.MEMORIAL_PAGES_KV.get(memorialId)
    if (!kvRaw) return error('Memorial not found', 404, request)
    let memorialData
    try { memorialData = JSON.parse(kvRaw) } catch { return error('Memorial corrupted', 500, request) }
    if (Number(memorialData.creator_user_id) !== Number(auth.sub)) {
      return error('Only the memorial creator can enable donations', 403, request)
    }

    // Verify MoMo with Paystack
    const resolved = await resolveAccount({
      secretKey: env.PAYSTACK_SECRET_KEY,
      momoNumber: payout_momo_number,
      providerCode: { mtn: 'MTN', vodafone: 'VOD', airteltigo: 'ATL' }[payout_momo_provider],
    })
    if (!resolved.ok) {
      return error('Could not verify MoMo number. Please check the number and provider.', 400, request)
    }

    // Create Paystack subaccount
    const sub = await createSubaccount({
      secretKey: env.PAYSTACK_SECRET_KEY,
      businessName: `${memorialData.deceased_name || 'Memorial'} Donations`,
      momoNumber: payout_momo_number,
      provider: payout_momo_provider,
      accountName: payout_account_name,
    })
    if (!sub.ok) {
      return error(`Could not create payout account: ${sub.error || 'unknown'}`, 502, request)
    }

    const now = Date.now()
    const slug = memorialData.slug || memorialId
    const sanitizedAccountName = sanitizeInput(payout_account_name)

    if (family_head.mode === 'self') {
      // Self-declared — immediate approval
      await env.DB.prepare(
        `INSERT INTO memorials (
          id, slug, creator_user_id, family_head_user_id, family_head_phone, family_head_name,
          family_head_self_declared, paystack_subaccount_code, payout_momo_number, payout_momo_provider,
          payout_account_name, wall_mode, goal_amount_pesewas, approval_status, approved_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        memorialId, slug, Number(auth.sub), Number(auth.sub),
        memorialData.creator_phone || null, memorialData.creator_name || null,
        1, sub.subaccount_code, payout_momo_number, payout_momo_provider,
        sanitizedAccountName, wall_mode, goal_amount_pesewas || null,
        'approved', now, now, now
      ).run()

      // Update KV cache
      memorialData.donation = {
        memorial_id: memorialId,
        enabled: true,
        wall_mode,
        goal_amount_pesewas: goal_amount_pesewas || null,
        total_raised_pesewas: 0,
        total_donor_count: 0,
        approval_status: 'approved',
      }
      await env.MEMORIAL_PAGES_KV.put(memorialId, JSON.stringify(memorialData))

      await logDonationAudit(env.DB, {
        memorialId,
        actorUserId: Number(auth.sub),
        action: 'family_head.self_declared',
        detail: {
          declared_name: payout_account_name,
          declared_phone: family_head.phone || null,
          wall_mode, goal_amount_pesewas,
        },
        ipAddress: getClientIP(request),
      })

      return json({
        memorial_id: memorialId,
        approval_status: 'approved',
        subaccount_code: sub.subaccount_code,
      }, 200, request)
    }

    // mode === 'invite' — handled in Task 19
    return error('Invite mode not yet implemented', 501, request)
  }
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
npx vitest run workers/__tests__/donation-init.test.js
```

- [ ] **Step 5: Commit**

```bash
git add workers/donation-api.js workers/__tests__/donation-init.test.js
git commit -m "feat: add POST /memorials/:id/donation/init for self-declared family head"
```

---

### Task 19: Memorial init — invite-mode (SMS to family head)

**Files:**
- Modify: `workers/donation-api.js`
- Modify: `workers/__tests__/donation-init.test.js`

- [ ] **Step 1: Add tests for invite mode**

Append to `donation-init.test.js`:

```javascript
describe('POST /memorials/:id/donation/init — invite mode', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: true, data: { account_name: 'AKOSUA' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: true, data: { subaccount_code: 'ACCT_xyz' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ code: 'ok', message_id: 'm1' }) })  // Termii SMS
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
    // Termii fetch was called
    const termiiCalled = global.fetch.mock.calls.some(c => String(c[0]).includes('termii'))
    expect(termiiCalled).toBe(true)
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
```

- [ ] **Step 2: Replace the `Invite mode not yet implemented` placeholder**

In `workers/donation-api.js`, replace the `return error('Invite mode not yet implemented', 501, request)` line with:

```javascript
// mode === 'invite'
if (!family_head.name || family_head.name.length > 100) {
  return error('Invalid family_head.name', 400, request)
}

// Generate single-use approval token (JWT, scope='family_head_approval', 24h)
const tokenPayload = {
  sub: family_head.phone,
  memorial_id: memorialId,
  scope: 'family_head_approval',
  jti: crypto.randomUUID(),
  exp: Math.floor(Date.now() / 1000) + 24 * 3600,
}
const approvalToken = await signJWT(tokenPayload, env.JWT_SECRET)

// Hash for storage (so DB compromise doesn't expose token)
const tokenHashBuf = await crypto.subtle.digest(
  'SHA-256',
  new TextEncoder().encode(approvalToken)
)
const tokenHash = Array.from(new Uint8Array(tokenHashBuf))
  .map(b => b.toString(16).padStart(2, '0')).join('')

await env.DB.prepare(
  `INSERT INTO memorials (
    id, slug, creator_user_id, family_head_phone, family_head_name, family_head_self_declared,
    paystack_subaccount_code, payout_momo_number, payout_momo_provider, payout_account_name,
    wall_mode, goal_amount_pesewas, approval_status, approval_token_hash, approval_token_expires_at,
    created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
).bind(
  memorialId, slug, Number(auth.sub),
  family_head.phone, sanitizeInput(family_head.name), 0,
  sub.subaccount_code, payout_momo_number, payout_momo_provider, sanitizedAccountName,
  wall_mode, goal_amount_pesewas || null,
  'pending', tokenHash, tokenPayload.exp * 1000,
  now, now
).run()

// KV cache reflects pending state
memorialData.donation = {
  memorial_id: memorialId,
  enabled: false,                   // not yet
  wall_mode,
  goal_amount_pesewas: goal_amount_pesewas || null,
  total_raised_pesewas: 0,
  total_donor_count: 0,
  approval_status: 'pending',
}
await env.MEMORIAL_PAGES_KV.put(memorialId, JSON.stringify(memorialData))

// Send SMS via Termii (always Termii for Ghana invites; international family heads handled differently)
const { selectProvider } = await import('./utils/phoneRouter.js')
const { sendTermiiOtp } = await import('./utils/termii.js')
const { sendTwilioOtp } = await import('./utils/twilioVerify.js')

const provider = (() => { try { return selectProvider(family_head.phone) } catch { return null } })()
if (!provider) return error('Invalid family head phone country code', 400, request)

const approvalLink = `https://funeralpress.org/approve/${approvalToken}`
const smsMessage = `${family_head.name}: You've been named family head for ${memorialData.deceased_name || 'a memorial'} on FuneralPress. Review and approve: ${approvalLink}`

const sendResult = provider === 'termii'
  ? await sendTermiiOtp({ apiKey: env.TERMII_API_KEY, toE164: family_head.phone, code: smsMessage })
  : await sendTwilioOtp({
      accountSid: env.TWILIO_ACCOUNT_SID,
      authToken: env.TWILIO_AUTH_TOKEN,
      fromNumber: env.TWILIO_FROM_NUMBER,
      toE164: family_head.phone,
      code: smsMessage,
    })

if (!sendResult.ok) {
  // Audit but don't 500 — memorial is created, family head can be re-invited
  await logDonationAudit(env.DB, {
    memorialId, actorUserId: Number(auth.sub),
    action: 'family_head.invite_sms_failed',
    detail: { provider, error: sendResult.error },
    ipAddress: getClientIP(request),
  })
}

await logDonationAudit(env.DB, {
  memorialId, actorUserId: Number(auth.sub),
  action: 'family_head.invited',
  detail: { phone: family_head.phone, name: family_head.name, expires_at: tokenPayload.exp * 1000 },
  ipAddress: getClientIP(request),
})

return json({
  memorial_id: memorialId,
  approval_status: 'pending',
  invite_sent_to: family_head.phone,
  expires_at: tokenPayload.exp * 1000,
}, 200, request)
```

**Important** — note that the Termii client's `sendTermiiOtp` parameter `code` is misnamed for this case (we're sending a full SMS, not just a code). For now, the existing function works because it just embeds whatever string is passed into the message body. **Better:** rename `sendTermiiOtp` → `sendTermiiSms` accepting a `message` parameter, and have the OTP-specific call site pass a templated string. Add this rename as a small refactor in this task.

- [ ] **Step 3: Refactor Termii client to be SMS-generic**

Edit `workers/utils/termii.js`:

```javascript
const TERMII_BASE = 'https://api.ng.termii.com/api/sms/send'

export async function sendTermiiSms({ apiKey, fromSenderId = 'FuneralPress', toE164, message }) {
  if (!apiKey) throw new Error('TERMII_API_KEY missing')

  const body = {
    to: toE164.replace(/^\+/, ''),
    from: fromSenderId,
    sms: message,
    type: 'plain',
    channel: 'generic',
    api_key: apiKey,
  }

  const res = await fetch(TERMII_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.code !== 'ok') {
    return { ok: false, status: res.status, error: data.message || 'Termii send failed', raw: data }
  }
  return { ok: true, message_id: data.message_id, balance: data.balance }
}

// Legacy alias for OTP call sites — wraps sendTermiiSms with the OTP message template.
export async function sendTermiiOtp({ apiKey, fromSenderId, toE164, code }) {
  return sendTermiiSms({
    apiKey, fromSenderId, toE164,
    message: `Your FuneralPress code is ${code}. Expires in 10 minutes. Do not share.`,
  })
}
```

Apply the same pattern to `workers/utils/twilioVerify.js` (rename core function to `sendTwilioSms({ ..., message })`, keep `sendTwilioOtp` as wrapper).

In Task 19 step 2, the SMS-send call sites already pass `message: smsMessage` if you use the new `sendTermiiSms` / `sendTwilioSms` directly — update those call sites accordingly (replace `code: smsMessage` with `message: smsMessage` and use the renamed functions).

- [ ] **Step 4: Run all tests**

```bash
npx vitest run workers/__tests__/
```

Expected: existing OTP tests still pass (using the OTP wrapper); new invite-mode tests pass.

- [ ] **Step 5: Commit**

```bash
git add workers/donation-api.js workers/utils/termii.js workers/utils/twilioVerify.js workers/__tests__/donation-init.test.js
git commit -m "feat: add invite-mode init with SMS to family head; refactor SMS clients"
```

---

### Task 20: `POST /memorials/:id/donation/approve` and `/reject`

**Files:**
- Create: `workers/__tests__/donation-approval.test.js`
- Modify: `workers/donation-api.js`

- [ ] **Step 1: Write failing tests**

Cover:
- Approve with valid one-time token (after fresh OTP verify) — succeeds, memorial flips to approved.
- Approve with already-consumed token — 401.
- Approve without OTP-verified phone match — 401.
- Approve flips KV cache to `approval_status: 'approved'` and `enabled: true`.
- Reject with valid token + reason — memorial flips to `rejected`.
- After approval, family_head_user_id is set to the resolved user record (creating one if the phone wasn't already in users).

Test skeleton:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from '../donation-api.js'
import { signJWT } from '../utils/jwt.js'

// reuse mockEnv from donation-init.test.js — copy here for self-containment

describe('POST /memorials/:id/donation/approve', () => {
  it('succeeds with valid token + verified OTP', async () => { /* ... */ })
  it('rejects already-approved memorial', async () => { /* ... */ })
  it('rejects mismatched phone', async () => { /* ... */ })
  it('marks token consumed atomically', async () => { /* ... */ })
})
```

- [ ] **Step 2: Implement the routes in `donation-api.js`**

Inside the `memorialMatch` block:

```javascript
if (action === 'approve' && request.method === 'POST') {
  const body = await request.json().catch(() => ({}))
  const { token, otp_code, phone } = body

  if (!token || !otp_code || !phone) return error('Missing fields', 400, request)

  // Verify token
  const tokenPayload = await verifyJWT(token, env.JWT_SECRET)
  if (!tokenPayload) return error('Invalid or expired approval link', 401, request)
  if (tokenPayload.scope !== 'family_head_approval') return error('Wrong token scope', 401, request)
  if (tokenPayload.memorial_id !== memorialId) return error('Token does not match memorial', 401, request)
  if (tokenPayload.sub !== phone) return error('Phone does not match invite', 401, request)

  // Verify token hash matches DB (single-use enforcement)
  const tokenHashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  const tokenHash = Array.from(new Uint8Array(tokenHashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

  const memRow = await env.DB.prepare(
    `SELECT * FROM memorials WHERE id = ? AND approval_status = 'pending' AND approval_token_hash = ?`
  ).bind(memorialId, tokenHash).first()
  if (!memRow) return error('Approval link is no longer valid', 401, request)
  if (memRow.approval_token_expires_at < Date.now()) return error('Approval link expired', 401, request)

  // Verify the OTP for purpose=family_head_approval — call the auth-api helper logic locally
  // We'll inline the OTP verify here against the same phone_otps table.
  const otpRow = await env.DB.prepare(
    `SELECT id, code_hash, expires_at, attempts, consumed_at
     FROM phone_otps
     WHERE phone_e164 = ? AND purpose = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`
  ).bind(phone, 'family_head_approval').first()

  if (!otpRow) return error('No verification code pending', 401, request)
  if (otpRow.expires_at < Date.now()) return error('Verification code expired', 401, request)
  if (otpRow.attempts >= 5) return error('Too many wrong attempts', 429, request)

  await env.DB.prepare(`UPDATE phone_otps SET attempts = attempts + 1 WHERE id = ?`).bind(otpRow.id).run()

  const { verifyOtp } = await import('./utils/otp.js')
  const codeOk = await verifyOtp(otp_code, otpRow.code_hash, env.OTP_PEPPER)
  if (!codeOk) return error('Wrong code', 401, request)

  // Mark OTP consumed
  await env.DB.prepare(`UPDATE phone_otps SET consumed_at = ? WHERE id = ?`).bind(Date.now(), otpRow.id).run()

  // Find or create user for the phone
  let user = await env.DB.prepare(`SELECT id FROM users WHERE phone_e164 = ?`).bind(phone).first()
  if (!user) {
    const result = await env.DB.prepare(
      `INSERT INTO users (email, name, phone_e164, phone_verified_at, auth_methods, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      `phone-${phone}@phone.funeralpress.org`,
      memRow.family_head_name || 'Family head',
      phone, Date.now(), 'phone', Date.now()
    ).run()
    user = { id: result.meta.last_row_id }
  }

  // Atomically: flip memorial to approved, clear token hash (single-use), set family_head_user_id
  const updateRes = await env.DB.prepare(
    `UPDATE memorials
     SET approval_status = 'approved',
         approved_at = ?,
         approval_token_hash = NULL,
         family_head_user_id = ?,
         updated_at = ?
     WHERE id = ? AND approval_status = 'pending'`
  ).bind(Date.now(), user.id, Date.now(), memorialId).run()

  if (updateRes.meta.changes !== 1) {
    return error('Memorial state changed; reload and try again', 409, request)
  }

  // Update KV cache
  const kvRaw = await env.MEMORIAL_PAGES_KV.get(memorialId)
  if (kvRaw) {
    const memData = JSON.parse(kvRaw)
    memData.donation = {
      ...(memData.donation || {}),
      enabled: true,
      approval_status: 'approved',
    }
    await env.MEMORIAL_PAGES_KV.put(memorialId, JSON.stringify(memData))
  }

  await logDonationAudit(env.DB, {
    memorialId,
    actorUserId: user.id,
    actorPhone: phone,
    action: 'memorial.approve',
    detail: {},
    ipAddress: getClientIP(request),
  })

  return json({ ok: true, approval_status: 'approved' }, 200, request)
}

if (action === 'reject' && request.method === 'POST') {
  const body = await request.json().catch(() => ({}))
  const { token, otp_code, phone, reason } = body
  if (!token || !otp_code || !phone) return error('Missing fields', 400, request)
  if (reason && reason.length > 500) return error('Reason too long', 400, request)

  // Same verification as approve, but flip to 'rejected'
  // (Extract the verification logic into a helper to DRY.)
  const verification = await verifyApprovalRequest(env, request, memorialId, token, otp_code, phone)
  if (!verification.ok) return verification.response

  await env.DB.prepare(
    `UPDATE memorials
     SET approval_status = 'rejected',
         rejected_at = ?,
         rejection_reason = ?,
         approval_token_hash = NULL,
         updated_at = ?
     WHERE id = ? AND approval_status = 'pending'`
  ).bind(Date.now(), sanitizeInput(reason || ''), Date.now(), memorialId).run()

  // KV cache update — keep enabled=false
  const kvRaw = await env.MEMORIAL_PAGES_KV.get(memorialId)
  if (kvRaw) {
    const memData = JSON.parse(kvRaw)
    memData.donation = { ...(memData.donation || {}), enabled: false, approval_status: 'rejected' }
    await env.MEMORIAL_PAGES_KV.put(memorialId, JSON.stringify(memData))
  }

  await logDonationAudit(env.DB, {
    memorialId, actorPhone: phone,
    action: 'memorial.reject',
    detail: { reason: reason || null },
    ipAddress: getClientIP(request),
  })

  // TODO: notify creator via SMS+email (handled in Resend wiring task)
  return json({ ok: true, approval_status: 'rejected' }, 200, request)
}
```

Add the `verifyApprovalRequest` helper above the route block (it factors out the token + OTP check used by both approve and reject). The helper returns `{ ok: true, user }` on success or `{ ok: false, response }` with an error response.

- [ ] **Step 3: Run tests, expect pass**

- [ ] **Step 4: Commit**

```bash
git add workers/donation-api.js workers/__tests__/donation-approval.test.js
git commit -m "feat: add memorial approve/reject routes with token + OTP verification"
```

---

### Task 21: `PATCH /memorials/:id/donation/settings` with payout MoMo cool-down

**Files:**
- Modify: `workers/donation-api.js`
- Modify: `workers/__tests__/donation-approval.test.js` (or new `donation-settings.test.js`)

- [ ] **Step 1: Add tests**

Cover:
- Family head can update wall_mode, goal, paused.
- Non-family-head returns 403.
- Changing payout_momo_number sets a 24h cool-down + audit + requires fresh OTP.
- During cool-down, donations still route to old MoMo (DB has `pending_payout_momo` and `pending_payout_effective_at` columns? — see implementation note below).

**Schema addition required:** add columns to memorials for the 24h MoMo cool-down. This was not in the original migration. Add in this task:

- [ ] **Step 2: Schema patch**

Create `workers/migrations/migration-donation-rail-momo-cooldown.sql`:

```sql
ALTER TABLE memorials ADD COLUMN pending_payout_momo_number   TEXT;
ALTER TABLE memorials ADD COLUMN pending_payout_momo_provider TEXT;
ALTER TABLE memorials ADD COLUMN pending_payout_account_name  TEXT;
ALTER TABLE memorials ADD COLUMN pending_payout_effective_at  INTEGER;
```

Apply locally and remotely (with user confirmation for remote).

- [ ] **Step 3: Implement the settings route**

```javascript
if (action === 'settings' && request.method === 'PATCH') {
  const auth = await authenticate(request, env)
  if (!auth) return error('Auth required', 401, request)

  const memRow = await env.DB.prepare(
    `SELECT id, family_head_user_id, payout_momo_number FROM memorials WHERE id = ? AND deleted_at IS NULL`
  ).bind(memorialId).first()
  if (!memRow) return error('Memorial not found', 404, request)
  if (Number(memRow.family_head_user_id) !== Number(auth.sub)) {
    return error('Only the family head can change settings', 403, request)
  }

  const body = await request.json().catch(() => ({}))
  const updates = []
  const args = []
  let kvUpdates = {}

  if (body.wall_mode !== undefined) {
    if (!['full', 'names_only', 'private'].includes(body.wall_mode)) return error('Invalid wall_mode', 400, request)
    updates.push('wall_mode = ?'); args.push(body.wall_mode)
    kvUpdates.wall_mode = body.wall_mode
    await logDonationAudit(env.DB, {
      memorialId, actorUserId: Number(auth.sub),
      action: 'memorial.wall_mode_changed',
      detail: { new_mode: body.wall_mode },
      ipAddress: getClientIP(request),
    })
  }
  if (body.goal_amount_pesewas !== undefined) {
    if (body.goal_amount_pesewas !== null) {
      if (!Number.isInteger(body.goal_amount_pesewas) || body.goal_amount_pesewas < 100) {
        return error('Invalid goal', 400, request)
      }
    }
    updates.push('goal_amount_pesewas = ?'); args.push(body.goal_amount_pesewas)
    kvUpdates.goal_amount_pesewas = body.goal_amount_pesewas
  }
  if (body.donation_paused !== undefined) {
    updates.push('donation_paused = ?'); args.push(body.donation_paused ? 1 : 0)
    await logDonationAudit(env.DB, {
      memorialId, actorUserId: Number(auth.sub),
      action: 'memorial.pause',
      detail: { paused: !!body.donation_paused },
      ipAddress: getClientIP(request),
    })
  }

  // Payout MoMo change → cool-down path (requires fresh OTP)
  if (body.payout_momo_number || body.payout_momo_provider || body.payout_account_name) {
    if (!body.otp_code || !body.phone) {
      return error('Changing payout requires fresh OTP verification', 401, request, 'otp_required')
    }
    // Verify OTP for purpose='link' (treat as elevated re-auth)
    const otpRow = await env.DB.prepare(
      `SELECT id, code_hash, expires_at, attempts, consumed_at
       FROM phone_otps
       WHERE phone_e164 = ? AND purpose = 'link' AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1`
    ).bind(body.phone).first()
    if (!otpRow) return error('No verification code pending', 401, request)
    if (otpRow.expires_at < Date.now()) return error('Code expired', 401, request)
    const { verifyOtp } = await import('./utils/otp.js')
    const codeOk = await verifyOtp(body.otp_code, otpRow.code_hash, env.OTP_PEPPER)
    if (!codeOk) {
      await env.DB.prepare(`UPDATE phone_otps SET attempts = attempts + 1 WHERE id = ?`).bind(otpRow.id).run()
      return error('Wrong code', 401, request)
    }
    await env.DB.prepare(`UPDATE phone_otps SET consumed_at = ? WHERE id = ?`).bind(Date.now(), otpRow.id).run()

    // Schedule cool-down — 24 hours
    const effectiveAt = Date.now() + 24 * 3600 * 1000
    updates.push('pending_payout_momo_number = ?', 'pending_payout_momo_provider = ?', 'pending_payout_account_name = ?', 'pending_payout_effective_at = ?')
    args.push(body.payout_momo_number, body.payout_momo_provider, sanitizeInput(body.payout_account_name || ''), effectiveAt)

    await logDonationAudit(env.DB, {
      memorialId, actorUserId: Number(auth.sub),
      action: 'memorial.payout_changed',
      detail: {
        old_number_masked: maskMomo(memRow.payout_momo_number),
        new_number_masked: maskMomo(body.payout_momo_number),
        effective_at: effectiveAt,
      },
      ipAddress: getClientIP(request),
    })

    // TODO: send notification SMS + email to old AND new MoMo account holders
  }

  if (updates.length === 0) return error('No updates provided', 400, request)
  updates.push('updated_at = ?'); args.push(Date.now())
  args.push(memorialId)

  await env.DB.prepare(`UPDATE memorials SET ${updates.join(', ')} WHERE id = ?`).bind(...args).run()

  // KV cache update
  if (Object.keys(kvUpdates).length > 0) {
    const kvRaw = await env.MEMORIAL_PAGES_KV.get(memorialId)
    if (kvRaw) {
      const memData = JSON.parse(kvRaw)
      memData.donation = { ...(memData.donation || {}), ...kvUpdates }
      await env.MEMORIAL_PAGES_KV.put(memorialId, JSON.stringify(memData))
    }
  }

  return json({ ok: true }, 200, request)
}

function maskMomo(num) {
  if (!num) return ''
  return num.slice(0, 4) + '*'.repeat(Math.max(0, num.length - 7)) + num.slice(-3)
}
```

**A daily cron** activates pending MoMo changes after the cool-down (added in the reconciliation task). For now, the cool-down is recorded; activation comes later.

- [ ] **Step 4: Run tests, expect pass**

- [ ] **Step 5: Commit**

```bash
git add workers/donation-api.js workers/migrations/migration-donation-rail-momo-cooldown.sql workers/__tests__/donation-approval.test.js
git commit -m "feat: add donation settings PATCH with payout MoMo 24h cool-down"
```

---

## Phase 4 — Donation charging & wall

### Task 22: `POST /memorials/:id/donation/charge`

**Files:**
- Create: `workers/__tests__/donation-charge.test.js`
- Create: `workers/__tests__/donation-currency-display.test.js`
- Modify: `workers/donation-api.js`

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from '../donation-api.js'

// reuse mockEnv. Add fx fetch mock.

describe('POST /memorials/:id/donation/charge', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('rejects when memorial is paused', async () => {
    const env = mockEnv()
    seedApprovedPausedMemorial(env, 'mem_abc')
    const res = await worker.fetch(makeChargeReq('mem_abc', validBody()), env)
    expect(res.status).toBe(403)
  })

  it('rejects when wall_mode is private but visibility is non-anonymous (allowed but treated)', async () => { /* ... */ })

  it('initialises Paystack transaction for GHS donor', async () => {
    const env = mockEnv()
    seedApprovedMemorial(env, 'mem_abc', { paystack_subaccount_code: 'ACCT_xyz' })
    global.fetch.mockResolvedValueOnce({  // Paystack init
      ok: true,
      json: async () => ({ status: true, data: { authorization_url: 'https://paystack/x', access_code: 'ac_y' } }),
    })
    const body = {
      display_amount_minor: 5000,  // GHS 50.00
      display_currency: 'GHS',
      tip_pesewas: 250,            // 5% tip
      donor: { display_name: 'John K.', visibility: 'public', country_code: 'GH' },
    }
    const res = await worker.fetch(makeChargeReq('mem_abc', body), env)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.authorization_url).toContain('paystack')
    expect(j.amount_in_ghs_pesewas).toBe(5000)  // 50.00 GHS = 5000 pesewas
  })

  it('converts GBP donor amount via FX cache', async () => {
    const env = mockEnv()
    seedApprovedMemorial(env, 'mem_abc', { paystack_subaccount_code: 'ACCT_xyz' })
    // FX cache hit (rate 20.0): £25 → GHS 500 → 50000 pesewas
    env._state.rateLimits.set('fx:GBP_GHS', JSON.stringify({ rate: 20.0, fetched_at: Date.now() }))
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: true, data: { authorization_url: 'p', access_code: 'a' } }),
    })
    const res = await worker.fetch(makeChargeReq('mem_abc', {
      display_amount_minor: 2500,
      display_currency: 'GBP',
      tip_pesewas: 2500,    // 5% of 50000 GHS pesewas
      donor: { display_name: 'John', visibility: 'public', country_code: 'GB' },
    }), env)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.amount_in_ghs_pesewas).toBe(50000)
    expect(j.fx_rate_used).toBe(20.0)
  })

  it('rejects profanity in display_name', async () => { /* ... */ })

  it('rate-limits per-IP after 5 charges in 10 min', async () => { /* ... */ })

  it('refuses non-GHS charge when FX rate fetch fails and no cache', async () => { /* ... */ })

  it('refuses non-GHS when INTERNATIONAL_DONATIONS_ENABLED=false', async () => { /* ... */ })
})
```

- [ ] **Step 2: Implement the route**

```javascript
import { v4 as uuidv4 } from 'uuid'
import { getFxRate } from './utils/fxRate.js'
import { containsProfanity } from './utils/profanity.js'
import { initialiseTransaction } from './utils/paystack.js'

// ... inside memorialMatch:

if (action === 'charge' && request.method === 'POST') {
  // Per-IP rate limit
  const ip = getClientIP(request)
  const ipKey = `donation:ip:10m:${ip}`
  const ipMemKey = `donation:ipmem:1h:${ip}:${memorialId}`
  const ipCount = parseInt(await env.RATE_LIMITS.get(ipKey)) || 0
  if (ipCount >= 5) return error('Too many donations from this network. Try again shortly.', 429, request)
  const ipMemCount = parseInt(await env.RATE_LIMITS.get(ipMemKey)) || 0
  if (ipMemCount >= 3) return error('Too many donations to this memorial from your network.', 429, request)

  const body = await request.json().catch(() => ({}))
  const {
    display_amount_minor,
    display_currency = 'GHS',
    tip_pesewas = 0,
    donor = {},
  } = body

  if (!Number.isInteger(display_amount_minor) || display_amount_minor < 100) {
    return error('Invalid amount', 400, request)
  }
  if (!/^[A-Z]{3}$/.test(display_currency)) return error('Invalid currency', 400, request)
  if (!Number.isInteger(tip_pesewas) || tip_pesewas < 0) return error('Invalid tip', 400, request)

  if (display_currency !== 'GHS' && !featureFlag(env, 'INTERNATIONAL_DONATIONS_ENABLED', true)) {
    return error('International donations temporarily unavailable', 503, request)
  }

  if (!donor.display_name || donor.display_name.length > 60) {
    return error('Invalid display name', 400, request)
  }
  if (containsProfanity(donor.display_name)) {
    return error('Please choose a different name.', 400, request)
  }
  if (!['public', 'anonymous'].includes(donor.visibility || 'public')) {
    return error('Invalid visibility', 400, request)
  }

  // Look up memorial
  const memRow = await env.DB.prepare(
    `SELECT id, paystack_subaccount_code, approval_status, donation_paused, wall_mode
     FROM memorials WHERE id = ? AND deleted_at IS NULL`
  ).bind(memorialId).first()
  if (!memRow) return error('Memorial not found', 404, request)
  if (memRow.approval_status !== 'approved') return error('Donations are not enabled for this memorial', 403, request)
  if (memRow.donation_paused) return error('Donations are paused for this memorial', 403, request)

  // FX
  let fxRate = 1
  let amountPesewas
  if (display_currency === 'GHS') {
    amountPesewas = display_amount_minor   // both pesewas
  } else {
    fxRate = await getFxRate(display_currency, env.RATE_LIMITS, env.OXR_APP_ID)
    if (!fxRate) return error('Currency conversion temporarily unavailable. Try GHS or try again shortly.', 503, request)
    // display_amount_minor is in cents/pence (×100); convert: minor × (rate to GHS) gives GHS pesewas
    amountPesewas = Math.round(display_amount_minor * fxRate)
  }

  // Server-side tip validation: re-derive expected tip and allow ±1 pesewa drift
  const tipDefaultPercent = parseFloat(env.TIP_DEFAULT_PERCENT || '5')
  const expectedTip = Math.round(amountPesewas * tipDefaultPercent / 100)
  if (Math.abs(tip_pesewas - expectedTip) > 1 && tip_pesewas !== 0) {
    // We tolerate exact 0 (donor opted out) or expectedTip ±1; anything else is suspicious
    return error('Invalid tip amount', 400, request)
  }

  const totalChargePesewas = amountPesewas + tip_pesewas
  const donorEmail = donor.email && /\S+@\S+\.\S+/.test(donor.email) ? donor.email : null
  const synthEmail = donorEmail || `anon-${crypto.randomUUID()}@donations.funeralpress.org`

  const donationId = `don_${crypto.randomUUID()}`
  const reference = `FP_${donationId}`

  // Insert pending donation
  await env.DB.prepare(
    `INSERT INTO donations (
      id, memorial_id, donor_user_id, donor_display_name, donor_email, donor_phone,
      donor_country_code, visibility, amount_pesewas, tip_pesewas,
      display_currency, display_amount_minor, fx_rate_to_ghs,
      paystack_reference, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    donationId, memorialId, null,                          // donor_user_id null until claimed
    sanitizeInput(donor.display_name),
    donorEmail, donor.phone || null,
    donor.country_code || null, donor.visibility || 'public',
    amountPesewas, tip_pesewas,
    display_currency, display_amount_minor, fxRate,
    reference, 'pending', Date.now()
  ).run()

  // Initialise Paystack transaction
  const paystackRes = await initialiseTransaction({
    secretKey: env.PAYSTACK_SECRET_KEY,
    reference,
    amountPesewas: totalChargePesewas,
    email: synthEmail,
    subaccount: memRow.paystack_subaccount_code,
    bearer: 'subaccount',
    tipPesewas: tip_pesewas,
    metadata: {
      donation_id: donationId,
      memorial_id: memorialId,
      tip_pesewas,
      display_currency,
      display_amount_minor,
    },
  })

  if (!paystackRes.ok) {
    // Mark donation row as failed
    await env.DB.prepare(`UPDATE donations SET status = 'failed', failure_reason = ? WHERE id = ?`)
      .bind(paystackRes.error || 'paystack init failed', donationId).run()
    return error('Could not start payment. Please try again.', 502, request)
  }

  // Increment rate counters
  await env.RATE_LIMITS.put(ipKey, String(ipCount + 1), { expirationTtl: 600 })
  await env.RATE_LIMITS.put(ipMemKey, String(ipMemCount + 1), { expirationTtl: 3600 })

  return json({
    donation_id: donationId,
    paystack_reference: reference,
    authorization_url: paystackRes.authorization_url,
    amount_in_ghs_pesewas: amountPesewas,
    fx_rate_used: fxRate,
  }, 200, request)
}
```

- [ ] **Step 3: Run tests, expect pass**

- [ ] **Step 4: Commit**

```bash
git add workers/donation-api.js workers/__tests__/donation-charge.test.js workers/__tests__/donation-currency-display.test.js
git commit -m "feat: add donation charge route with FX, tip validation, rate limits"
```

---

### Task 23: `GET /memorials/:id/donation/wall` and `/totals`

**Files:**
- Create: `workers/__tests__/donation-wall.test.js`
- Modify: `workers/donation-api.js`

- [ ] **Step 1: Write failing tests**

```javascript
describe('GET /memorials/:id/donation/wall', () => {
  it('returns full mode with name+amount+time', async () => { /* ... */ })
  it('returns names_only mode without amounts', async () => { /* ... */ })
  it('returns private mode with empty donations array', async () => { /* ... */ })
  it('renders anonymous donations as "Anonymous" with no amount link', async () => { /* ... */ })
  it('paginates with cursor', async () => { /* ... */ })
  it('caches results in KV with 30s TTL', async () => { /* ... */ })
})

describe('GET /memorials/:id/donation/totals', () => {
  it('returns totals from denormalised columns', async () => { /* ... */ })
})
```

- [ ] **Step 2: Implement the routes**

```javascript
if (action === 'totals' && request.method === 'GET') {
  // Try KV cache first
  const cacheKey = `wall:totals:${memorialId}`
  const cached = await env.MEMORIAL_PAGES_KV.get(cacheKey)
  if (cached) return json(JSON.parse(cached), 200, request)

  const row = await env.DB.prepare(
    `SELECT total_raised_pesewas, total_donor_count, goal_amount_pesewas, last_donation_at, wall_mode
     FROM memorials WHERE id = ? AND approval_status = 'approved' AND deleted_at IS NULL`
  ).bind(memorialId).first()

  if (!row) return error('Memorial not found', 404, request)

  const out = {
    total_raised_pesewas: row.total_raised_pesewas,
    total_donor_count: row.total_donor_count,
    goal_amount_pesewas: row.goal_amount_pesewas,
    last_donation_at: row.last_donation_at,
    wall_mode: row.wall_mode,
  }
  await env.MEMORIAL_PAGES_KV.put(cacheKey, JSON.stringify(out), { expirationTtl: 30 })
  return json(out, 200, request)
}

if (action === 'wall' && request.method === 'GET') {
  const url = new URL(request.url)
  const cursor = url.searchParams.get('cursor') || null
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 20, 50)

  const cacheKey = `wall:list:${memorialId}:${cursor || 'start'}:${limit}`
  const cached = await env.MEMORIAL_PAGES_KV.get(cacheKey)
  if (cached) return json(JSON.parse(cached), 200, request)

  const memRow = await env.DB.prepare(
    `SELECT wall_mode, total_raised_pesewas, total_donor_count, goal_amount_pesewas
     FROM memorials WHERE id = ? AND approval_status = 'approved' AND deleted_at IS NULL`
  ).bind(memorialId).first()
  if (!memRow) return error('Memorial not found', 404, request)

  const wall_mode = memRow.wall_mode

  let donations = []
  let nextCursor = null

  if (wall_mode !== 'private') {
    const cursorTs = cursor ? Number(atob(cursor)) : Date.now()
    if (Number.isNaN(cursorTs)) return error('Invalid cursor', 400, request)

    const result = await env.DB.prepare(
      `SELECT id, donor_display_name, amount_pesewas, visibility, created_at
       FROM donations
       WHERE memorial_id = ? AND status = 'succeeded' AND created_at < ?
       ORDER BY created_at DESC LIMIT ?`
    ).bind(memorialId, cursorTs, limit + 1).all()

    const rows = result.results || []
    if (rows.length > limit) {
      const last = rows[limit - 1]
      nextCursor = btoa(String(last.created_at))
      rows.length = limit
    }

    donations = rows.map(r => {
      const isAnon = r.visibility === 'anonymous'
      const base = {
        id: r.id,
        display_name: isAnon ? 'Anonymous' : r.donor_display_name,
        created_at: r.created_at,
      }
      if (wall_mode === 'full' && !isAnon) {
        return { ...base, amount_pesewas: r.amount_pesewas }
      }
      return base
    })
  }

  const out = {
    wall_mode,
    total_raised_pesewas: memRow.total_raised_pesewas,
    total_donor_count: memRow.total_donor_count,
    goal_amount_pesewas: memRow.goal_amount_pesewas,
    donations,
    next_cursor: nextCursor,
  }
  await env.MEMORIAL_PAGES_KV.put(cacheKey, JSON.stringify(out), { expirationTtl: 30 })
  return json(out, 200, request)
}
```

- [ ] **Step 3: Run tests, expect pass**

- [ ] **Step 4: Commit**

```bash
git add workers/donation-api.js workers/__tests__/donation-wall.test.js
git commit -m "feat: add donor wall and totals routes with wall_mode shaping and KV cache"
```

---

### Task 24: `POST /donations/:id/claim`

**Files:**
- Create: `workers/__tests__/donation-claim.test.js`
- Modify: `workers/donation-api.js`

- [ ] **Step 1: Write failing tests**

Cover: claim succeeds for logged-in user against their own anonymous donation; idempotent; updates donor_profiles aggregates; rejects claim of donation already linked to a different user.

- [ ] **Step 2: Implement**

```javascript
const claimMatch = path.match(/^\/donations\/([^/]+)\/claim$/)
if (claimMatch && request.method === 'POST') {
  const donationId = claimMatch[1]
  const auth = await authenticate(request, env)
  if (!auth) return error('Auth required', 401, request)

  const body = await request.json().catch(() => ({}))
  const { claim_token } = body  // Optional — short-lived signed token from receipt link

  const donation = await env.DB.prepare(
    `SELECT id, donor_user_id, donor_email, amount_pesewas, status FROM donations WHERE id = ?`
  ).bind(donationId).first()

  if (!donation) return error('Donation not found', 404, request)
  if (donation.status !== 'succeeded') return error('Donation not yet completed', 400, request)

  // If already claimed by this user, idempotent return
  if (donation.donor_user_id) {
    if (Number(donation.donor_user_id) === Number(auth.sub)) {
      return json({ claimed: true, already: true }, 200, request)
    }
    return error('Donation already claimed', 409, request)
  }

  // Match by email (preferred) or claim_token (alternative)
  const userRow = await env.DB.prepare(`SELECT id, email FROM users WHERE id = ?`).bind(auth.sub).first()
  if (donation.donor_email && userRow?.email !== donation.donor_email && !claim_token) {
    return error('Donation email does not match your account', 403, request)
  }

  // Link
  await env.DB.prepare(`UPDATE donations SET donor_user_id = ? WHERE id = ?`)
    .bind(Number(auth.sub), donationId).run()

  // Upsert donor_profiles
  await env.DB.prepare(
    `INSERT INTO donor_profiles (user_id, total_donated_pesewas, total_donations_count, last_donated_at, created_at, updated_at)
     VALUES (?, ?, 1, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       total_donated_pesewas = total_donated_pesewas + excluded.total_donated_pesewas,
       total_donations_count = total_donations_count + 1,
       last_donated_at = excluded.last_donated_at,
       updated_at = excluded.updated_at`
  ).bind(Number(auth.sub), donation.amount_pesewas, Date.now(), Date.now(), Date.now()).run()

  return json({ claimed: true, donor_total_pesewas: donation.amount_pesewas }, 200, request)
}
```

- [ ] **Step 3: Run tests, expect pass**

- [ ] **Step 4: Commit**

```bash
git add workers/donation-api.js workers/__tests__/donation-claim.test.js
git commit -m "feat: add post-donation profile claim route"
```

---

## Phase 5 — Webhook & reconciliation

### Task 25: `POST /paystack/webhook` for charge.success and charge.failed

**Files:**
- Create: `workers/__tests__/donation-webhook.test.js`
- Modify: `workers/donation-api.js`

- [ ] **Step 1: Write failing tests**

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('POST /paystack/webhook', () => {
  it('rejects without HMAC signature header', async () => { /* ... */ })
  it('rejects with wrong signature', async () => { /* ... */ })
  it('rejects from non-allowlisted IP', async () => { /* ... */ })
  it('processes charge.success: marks donation succeeded, updates totals', async () => { /* ... */ })
  it('is idempotent on duplicate event_id', async () => { /* ... */ })
  it('processes charge.failed: marks donation failed', async () => { /* ... */ })
  it('writes through to KV memorial cache', async () => { /* ... */ })
  it('triggers admin alert when memorial crosses goal threshold', async () => { /* ... */ })
})
```

- [ ] **Step 2: Implement**

```javascript
import { verifyWebhookSignature, PAYSTACK_WEBHOOK_IPS } from './utils/paystack.js'

if (path === '/paystack/webhook' && request.method === 'POST') {
  // IP allowlist
  const cfIp = request.headers.get('CF-Connecting-IP')
  if (!PAYSTACK_WEBHOOK_IPS.includes(cfIp)) {
    return new Response('forbidden', { status: 401 })
  }

  // HMAC verify against raw body
  const sig = request.headers.get('x-paystack-signature')
  const rawBody = await request.text()
  const valid = await verifyWebhookSignature(rawBody, sig, env.PAYSTACK_WEBHOOK_SECRET)
  if (!valid) {
    return new Response('forbidden', { status: 401 })
  }

  let event
  try { event = JSON.parse(rawBody) } catch { return new Response('bad request', { status: 400 }) }

  const eventId = event.id || event.data?.reference || crypto.randomUUID()

  // Idempotency
  const existing = await env.DB.prepare(`SELECT event_id FROM processed_webhooks WHERE event_id = ?`)
    .bind(eventId).first()
  if (existing) return new Response('ok', { status: 200 })

  await env.DB.prepare(
    `INSERT INTO processed_webhooks (event_id, source, processed_at) VALUES (?, ?, ?)`
  ).bind(eventId, 'paystack', Date.now()).run()

  if (event.event === 'charge.success') {
    const ref = event.data.reference
    const donation = await env.DB.prepare(
      `SELECT id, memorial_id, amount_pesewas, status FROM donations WHERE paystack_reference = ?`
    ).bind(ref).first()
    if (!donation) return new Response('ok', { status: 200 })  // not ours
    if (donation.status === 'succeeded') return new Response('ok', { status: 200 })

    const fees = event.data.fees || 0          // pesewas
    const netToFamily = donation.amount_pesewas - fees

    await env.DB.prepare(
      `UPDATE donations
       SET status = 'succeeded', succeeded_at = ?, paystack_fee_pesewas = ?, net_to_family_pesewas = ?, paystack_transaction_id = ?
       WHERE id = ? AND status = 'pending'`
    ).bind(Date.now(), fees, netToFamily, String(event.data.id || ''), donation.id).run()

    // Update memorial totals
    await env.DB.prepare(
      `UPDATE memorials
       SET total_raised_pesewas = total_raised_pesewas + ?,
           total_donor_count = total_donor_count + 1,
           last_donation_at = ?,
           updated_at = ?
       WHERE id = ?`
    ).bind(donation.amount_pesewas, Date.now(), Date.now(), donation.memorial_id).run()

    // Check goal crossing
    const memNow = await env.DB.prepare(
      `SELECT total_raised_pesewas, goal_amount_pesewas FROM memorials WHERE id = ?`
    ).bind(donation.memorial_id).first()
    if (memNow?.goal_amount_pesewas && memNow.total_raised_pesewas >= memNow.goal_amount_pesewas) {
      // Admin notification — fire and forget
      try {
        await env.DB.prepare(
          `INSERT INTO admin_notifications (type, title, detail, created_at) VALUES (?, ?, ?, ?)`
        ).bind(
          'donation.goal_crossed',
          `Memorial reached its donation goal`,
          JSON.stringify({ memorial_id: donation.memorial_id, total: memNow.total_raised_pesewas, goal: memNow.goal_amount_pesewas }),
          Date.now()
        ).run()
      } catch {}
    }

    // KV write-through
    const kvRaw = await env.MEMORIAL_PAGES_KV.get(donation.memorial_id)
    if (kvRaw) {
      try {
        const memData = JSON.parse(kvRaw)
        memData.donation = {
          ...(memData.donation || {}),
          total_raised_pesewas: (memData.donation?.total_raised_pesewas || 0) + donation.amount_pesewas,
          total_donor_count: (memData.donation?.total_donor_count || 0) + 1,
        }
        await env.MEMORIAL_PAGES_KV.put(donation.memorial_id, JSON.stringify(memData))
      } catch {}
    }

    // Invalidate wall caches (KV)
    await env.MEMORIAL_PAGES_KV.delete(`wall:totals:${donation.memorial_id}`).catch(() => {})
    // (For paginated keys we let them expire via TTL; new charges always invalidate the totals cache.)

    // Queue receipt + thank-you email (Resend) — implementation in Task 26
    ctx.waitUntil(queueDonationReceipt(env, donation.id))

  } else if (event.event === 'charge.failed') {
    await env.DB.prepare(
      `UPDATE donations SET status = 'failed', failure_reason = ? WHERE paystack_reference = ? AND status = 'pending'`
    ).bind(event.data.gateway_response || 'failed', event.data.reference).run()

  } else if (event.event === 'refund.processed') {
    // handled in Task 26 with full refund + dispute support
  }

  return new Response('ok', { status: 200 })
}

async function queueDonationReceipt(env, donationId) {
  // Stub for Task 26
}
```

- [ ] **Step 3: Run tests, expect pass**

- [ ] **Step 4: Commit**

```bash
git add workers/donation-api.js workers/__tests__/donation-webhook.test.js
git commit -m "feat: add Paystack webhook handler for charge.success and charge.failed"
```

---

### Task 26: Refund + dispute webhook + receipt email

**Files:**
- Create: `workers/__tests__/donation-refund.test.js`
- Modify: `workers/donation-api.js`

- [ ] **Step 1: Add tests for refund and dispute events**

- [ ] **Step 2: Implement refund + dispute handling**

Replace the `// handled in Task 26` block with:

```javascript
} else if (event.event === 'refund.processed') {
  const ref = event.data.transaction?.reference || event.data.reference
  const donation = await env.DB.prepare(
    `SELECT id, memorial_id, amount_pesewas, status FROM donations WHERE paystack_reference = ?`
  ).bind(ref).first()
  if (!donation) return new Response('ok', { status: 200 })

  // Decrement memorial totals if this was a succeeded donation
  if (donation.status === 'succeeded') {
    await env.DB.prepare(
      `UPDATE memorials
       SET total_raised_pesewas = total_raised_pesewas - ?,
           total_donor_count = total_donor_count - 1,
           updated_at = ?
       WHERE id = ?`
    ).bind(donation.amount_pesewas, Date.now(), donation.memorial_id).run()
  }
  await env.DB.prepare(
    `UPDATE donations SET status = 'refunded', refunded_at = ? WHERE id = ?`
  ).bind(Date.now(), donation.id).run()

  await logDonationAudit(env.DB, {
    memorialId: donation.memorial_id,
    donationId: donation.id,
    action: 'donation.refund_processed',
    detail: { reference: ref },
  })

  // Family + admin notification
  try {
    await env.DB.prepare(
      `INSERT INTO admin_notifications (type, title, detail, created_at) VALUES (?, ?, ?, ?)`
    ).bind('donation.refunded', 'Donation refunded', JSON.stringify({ donation_id: donation.id, memorial_id: donation.memorial_id, amount_pesewas: donation.amount_pesewas }), Date.now()).run()
  } catch {}

  // KV write-through
  const kvRaw = await env.MEMORIAL_PAGES_KV.get(donation.memorial_id)
  if (kvRaw) {
    try {
      const memData = JSON.parse(kvRaw)
      memData.donation = {
        ...(memData.donation || {}),
        total_raised_pesewas: Math.max(0, (memData.donation?.total_raised_pesewas || 0) - donation.amount_pesewas),
        total_donor_count: Math.max(0, (memData.donation?.total_donor_count || 0) - 1),
      }
      await env.MEMORIAL_PAGES_KV.put(donation.memorial_id, JSON.stringify(memData))
    } catch {}
  }
  await env.MEMORIAL_PAGES_KV.delete(`wall:totals:${donation.memorial_id}`).catch(() => {})

} else if (event.event === 'charge.dispute.create') {
  const ref = event.data.transaction?.reference || event.data.reference
  await env.DB.prepare(
    `UPDATE donations SET status = 'disputed' WHERE paystack_reference = ? AND status = 'succeeded'`
  ).bind(ref).run()

  try {
    await env.DB.prepare(
      `INSERT INTO admin_notifications (type, title, detail, created_at) VALUES (?, ?, ?, ?)`
    ).bind('donation.disputed', 'Donation dispute opened', JSON.stringify({ reference: ref }), Date.now()).run()
  } catch {}
}
```

- [ ] **Step 3: Implement receipt email via Resend**

Replace the `queueDonationReceipt` stub:

```javascript
async function queueDonationReceipt(env, donationId) {
  if (!env.RESEND_API_KEY) return  // skip in test

  try {
    const d = await env.DB.prepare(
      `SELECT d.id, d.donor_email, d.donor_display_name, d.display_amount_minor, d.display_currency,
              d.amount_pesewas, d.tip_pesewas, d.created_at, d.paystack_reference,
              m.id as memorial_id, m.slug
       FROM donations d JOIN memorials m ON m.id = d.memorial_id
       WHERE d.id = ?`
    ).bind(donationId).first()
    if (!d || !d.donor_email) return

    // Look up deceased name from KV
    const kvRaw = await env.MEMORIAL_PAGES_KV.get(d.memorial_id)
    const deceasedName = (kvRaw && JSON.parse(kvRaw).deceased_name) || 'Memorial'

    const subject = `Your donation to ${deceasedName}'s memorial`
    const total = (d.display_amount_minor / 100).toFixed(2)
    const tip = (d.tip_pesewas / 100).toFixed(2)
    const html = `
      <p>Thank you, ${d.donor_display_name}, for honouring ${deceasedName}'s memory.</p>
      <p><strong>Your donation:</strong> ${d.display_currency} ${total}</p>
      ${Number(tip) > 0 ? `<p><strong>Platform tip:</strong> GHS ${tip}</p>` : ''}
      <p>Reference: ${d.paystack_reference}</p>
      <p>This is a confirmation of payment, not a tax receipt.</p>
      <p><a href="https://funeralpress.org/m/${d.slug}">View memorial</a></p>
    `

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'donations@funeralpress.org',
        to: d.donor_email,
        subject,
        html,
      }),
    })

    await env.DB.prepare(`UPDATE donations SET receipt_sent_at = ? WHERE id = ?`).bind(Date.now(), donationId).run()
  } catch (e) {
    console.error('queueDonationReceipt failed', e)
  }
}
```

- [ ] **Step 4: Run tests, expect pass**

- [ ] **Step 5: Commit**

```bash
git add workers/donation-api.js workers/__tests__/donation-refund.test.js
git commit -m "feat: handle refund + dispute webhooks; queue receipt emails via Resend"
```

---

### Task 27: Daily reconciliation cron

**Files:**
- Create: `workers/__tests__/donation-reconciliation.test.js`
- Modify: `workers/donation-api.js`

- [ ] **Step 1: Write tests for the scheduled handler**

Test: succeeded donations in Paystack but `pending` in D1 → flipped to `succeeded` and totals updated. Pending in D1 with no Paystack record → marked `failed`. Discrepancies → admin notification.

- [ ] **Step 2: Implement the scheduled handler**

```javascript
import { listTransactions } from './utils/paystack.js'

export default {
  // ...existing fetch handler

  async scheduled(event, env, ctx) {
    if (!featureFlag(env, 'RECONCILIATION_ENABLED')) return
    ctx.waitUntil(reconcileDay(env))
    ctx.waitUntil(activatePendingMomoChanges(env))
  },
}

async function reconcileDay(env) {
  const to = Date.now()
  const from = to - 24 * 3600 * 1000

  // Pull Paystack transactions for the window
  const result = await listTransactions({
    secretKey: env.PAYSTACK_SECRET_KEY,
    fromTimestamp: from,
    toTimestamp: to,
    perPage: 100,
  })
  if (!result.ok) {
    console.error('Reconciliation: Paystack list failed', result.message)
    return
  }

  const paystackByRef = new Map()
  for (const t of result.data || []) {
    paystackByRef.set(t.reference, t)
  }

  // For our donations in window
  const ours = await env.DB.prepare(
    `SELECT id, paystack_reference, status FROM donations WHERE created_at >= ? AND created_at < ?`
  ).bind(from, to).all()

  let mismatches = 0
  for (const row of ours.results || []) {
    const ps = paystackByRef.get(row.paystack_reference)
    if (!ps) {
      if (row.status === 'pending') {
        // Paystack has no record — mark as failed
        await env.DB.prepare(`UPDATE donations SET status = 'failed', failure_reason = ? WHERE id = ?`)
          .bind('reconciliation: not found at Paystack', row.id).run()
        mismatches++
      }
      continue
    }
    if (ps.status === 'success' && row.status === 'pending') {
      // Webhook missed — promote
      await env.DB.prepare(
        `UPDATE donations SET status = 'succeeded', succeeded_at = ?, paystack_fee_pesewas = ?, paystack_transaction_id = ? WHERE id = ?`
      ).bind(Date.now(), ps.fees || 0, String(ps.id || ''), row.id).run()
      // (Memorial totals update logic — re-use webhook helper or call here.)
      mismatches++
    }
  }

  if (mismatches > 0) {
    try {
      await env.DB.prepare(
        `INSERT INTO admin_notifications (type, title, detail, created_at) VALUES (?, ?, ?, ?)`
      ).bind('reconciliation.mismatches', `Reconciliation found ${mismatches} mismatches`, JSON.stringify({ from, to, count: mismatches }), Date.now()).run()
    } catch {}
  }
}

async function activatePendingMomoChanges(env) {
  const due = await env.DB.prepare(
    `SELECT id, pending_payout_momo_number, pending_payout_momo_provider, pending_payout_account_name
     FROM memorials
     WHERE pending_payout_effective_at IS NOT NULL AND pending_payout_effective_at <= ?`
  ).bind(Date.now()).all()

  for (const m of due.results || []) {
    // (In a real implementation, also call Paystack to update the subaccount account_number.)
    await env.DB.prepare(
      `UPDATE memorials
       SET payout_momo_number = ?, payout_momo_provider = ?, payout_account_name = ?,
           pending_payout_momo_number = NULL, pending_payout_momo_provider = NULL,
           pending_payout_account_name = NULL, pending_payout_effective_at = NULL,
           updated_at = ?
       WHERE id = ?`
    ).bind(
      m.pending_payout_momo_number, m.pending_payout_momo_provider, m.pending_payout_account_name,
      Date.now(), m.id
    ).run()

    await logDonationAudit(env.DB, {
      memorialId: m.id,
      action: 'memorial.payout_changed',
      detail: { stage: 'cooldown_complete' },
    })
  }
}
```

- [ ] **Step 3: Run tests, expect pass**

- [ ] **Step 4: Commit**

```bash
git add workers/donation-api.js workers/__tests__/donation-reconciliation.test.js
git commit -m "feat: add daily reconciliation cron + MoMo cool-down activation"
```

---

## Phase 6 — Admin routes

### Task 28: Admin donations list + memorial donation status

**Files:**
- Modify: `workers/donation-api.js`

- [ ] **Step 1: Add `requireAdmin` helper**

In `donation-api.js`, add near `authenticate`:

```javascript
async function requireAdmin(request, env) {
  const auth = await authenticate(request, env)
  if (!auth) return { error: error('Auth required', 401, request) }
  const row = await env.DB.prepare(
    `SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND r.name IN ('admin', 'manager')`
  ).bind(auth.sub).first()
  if (!row) return { error: error('Admin only', 403, request) }
  return { userId: auth.sub }
}
```

- [ ] **Step 2: Add admin routes**

```javascript
if (path === '/admin/donations' && request.method === 'GET') {
  const a = await requireAdmin(request, env)
  if (a.error) return a.error

  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200)
  const cursor = url.searchParams.get('cursor')
  const status = url.searchParams.get('status')

  const cursorTs = cursor ? Number(atob(cursor)) : Date.now()
  const conditions = ['created_at < ?']
  const args = [cursorTs]
  if (status) { conditions.push('status = ?'); args.push(status) }

  const result = await env.DB.prepare(
    `SELECT id, memorial_id, donor_display_name, amount_pesewas, tip_pesewas, display_currency,
            display_amount_minor, status, created_at, succeeded_at, refunded_at, paystack_reference
     FROM donations WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC LIMIT ?`
  ).bind(...args, limit + 1).all()

  const rows = result.results || []
  const nextCursor = rows.length > limit ? btoa(String(rows[limit - 1].created_at)) : null
  if (rows.length > limit) rows.length = limit

  return json({ donations: rows, next_cursor: nextCursor }, 200, request)
}

if (path === '/admin/memorials/donation' && request.method === 'GET') {
  const a = await requireAdmin(request, env)
  if (a.error) return a.error

  const result = await env.DB.prepare(
    `SELECT id, slug, family_head_name, family_head_phone, family_head_self_declared,
            wall_mode, approval_status, total_raised_pesewas, total_donor_count, donation_paused,
            created_at, approved_at
     FROM memorials WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 200`
  ).all()

  return json({ memorials: result.results || [] }, 200, request)
}
```

- [ ] **Step 3: Add tests** in `workers/__tests__/donation-fraud.test.js` (later task) covers admin paths; for now, a thin test file `donation-admin.test.js` confirming RBAC.

- [ ] **Step 4: Commit**

```bash
git add workers/donation-api.js workers/__tests__/
git commit -m "feat: add admin donations list and memorials-with-donation status routes"
```

---

### Task 29: Admin refund route

**Files:**
- Modify: `workers/donation-api.js`

- [ ] **Step 1: Implement**

```javascript
const adminRefundMatch = path.match(/^\/admin\/donations\/([^/]+)\/refund$/)
if (adminRefundMatch && request.method === 'POST') {
  const a = await requireAdmin(request, env)
  if (a.error) return a.error
  const donationId = adminRefundMatch[1]

  const d = await env.DB.prepare(`SELECT id, paystack_reference, status FROM donations WHERE id = ?`)
    .bind(donationId).first()
  if (!d) return error('Donation not found', 404, request)
  if (d.status !== 'succeeded') return error(`Cannot refund a ${d.status} donation`, 400, request)

  const { refundTransaction } = await import('./utils/paystack.js')
  const result = await refundTransaction({ secretKey: env.PAYSTACK_SECRET_KEY, transactionRef: d.paystack_reference })
  if (!result.ok) return error(`Refund failed: ${result.message || 'unknown'}`, 502, request)

  // Optimistic audit; the webhook flips status when Paystack processes.
  await logDonationAudit(env.DB, {
    donationId, actorUserId: Number(a.userId),
    action: 'donation.refund_requested',
    detail: { initiated_at: Date.now() },
    ipAddress: getClientIP(request),
  })

  return json({ ok: true, refund_pending: true }, 200, request)
}
```

- [ ] **Step 2: Commit**

```bash
git add workers/donation-api.js
git commit -m "feat: add admin POST /admin/donations/:id/refund route"
```

---

### Task 30: Donation rate-limit + fraud test suite

**Files:**
- Create: `workers/__tests__/donation-rate-limits.test.js`
- Create: `workers/__tests__/donation-fraud.test.js`
- Create: `workers/__tests__/donation-audit.test.js`

- [ ] **Step 1: Write rate-limit tests**

Cover all rate limits from the spec: per-IP 5/10min, per-IP-per-memorial 3/hour, OTP per-phone 3/10min, 10/24h, per-IP 20/hour, per-IP-per-phone 5/hour.

- [ ] **Step 2: Write fraud-scenario tests**

For each threat T1-T12 in the spec: write a test that exercises the threat and verifies the control engaged.

- [ ] **Step 3: Write audit-trail tests**

For each `donation_audit` action: trigger the corresponding mutation, assert the row was written with correct shape.

- [ ] **Step 4: Run all tests, expect pass**

```bash
npx vitest run workers/__tests__/
```

- [ ] **Step 5: Commit**

```bash
git add workers/__tests__/donation-rate-limits.test.js workers/__tests__/donation-fraud.test.js workers/__tests__/donation-audit.test.js
git commit -m "test: add rate limit, fraud scenario, and audit trail test suites"
```

---

## Phase 7 — Frontend foundations

### Task 31: Donation API client utility

**Files:**
- Create: `src/utils/donationApi.js`

- [ ] **Step 1: Implement**

```javascript
import { apiFetch } from './apiClient.js'

const DONATION_API = import.meta.env.VITE_DONATION_API_URL || 'https://donation-api.funeralpress.org'

export const donationApi = {
  async initDonation(memorialId, body) {
    return apiFetch(`${DONATION_API}/memorials/${memorialId}/donation/init`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
  async charge(memorialId, body) {
    return apiFetch(`${DONATION_API}/memorials/${memorialId}/donation/charge`, {
      method: 'POST',
      body: JSON.stringify(body),
      auth: false,
    })
  },
  async getWall(memorialId, cursor = null) {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
    return apiFetch(`${DONATION_API}/memorials/${memorialId}/donation/wall${q}`, { auth: false })
  },
  async getTotals(memorialId) {
    return apiFetch(`${DONATION_API}/memorials/${memorialId}/donation/totals`, { auth: false })
  },
  async approve(memorialId, body) {
    return apiFetch(`${DONATION_API}/memorials/${memorialId}/donation/approve`, {
      method: 'POST',
      body: JSON.stringify(body),
      auth: false,
    })
  },
  async reject(memorialId, body) {
    return apiFetch(`${DONATION_API}/memorials/${memorialId}/donation/reject`, {
      method: 'POST',
      body: JSON.stringify(body),
      auth: false,
    })
  },
  async updateSettings(memorialId, body) {
    return apiFetch(`${DONATION_API}/memorials/${memorialId}/donation/settings`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },
  async claim(donationId) {
    return apiFetch(`${DONATION_API}/donations/${donationId}/claim`, { method: 'POST' })
  },
  async getDonation(donationId) {
    return apiFetch(`${DONATION_API}/donations/${donationId}`)
  },
}

// Phone auth — lives in auth-api
export const phoneAuthApi = {
  async sendOtp(phone, purpose) {
    return apiFetch('/auth/phone/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, purpose }),
      auth: false,
    })
  },
  async verify(phone, code, purpose) {
    return apiFetch('/auth/phone/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code, purpose }),
      auth: false,
    })
  },
  async link(phone, code) {
    return apiFetch('/auth/phone/link', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    })
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/donationApi.js
git commit -m "feat: add donation-api and phone-auth API client utilities"
```

---

### Task 32: Currency utility

**Files:**
- Create: `src/utils/currency.js`

- [ ] **Step 1: Implement**

```javascript
const LOCALE_TO_CURRENCY = {
  'GH': 'GHS', 'GB': 'GBP', 'US': 'USD', 'CA': 'CAD', 'NG': 'NGN',
  'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR',
}

export function detectCurrency() {
  // Try navigator.language country, fall back to GH
  const lang = navigator.language || 'en-GH'
  const country = lang.split('-')[1] || 'GH'
  return LOCALE_TO_CURRENCY[country] || 'GHS'
}

export function formatMinor(minor, currency) {
  const major = (minor / 100).toFixed(2)
  const symbols = { GHS: 'GHS ', GBP: '£', USD: '$', CAD: 'C$', EUR: '€', NGN: '₦' }
  return `${symbols[currency] || `${currency} `}${major}`
}

export function quickAmounts(currency) {
  return {
    GHS: [50, 100, 200, 500],     // pesewas? major? — major: 50 GHS = 5000 pesewas
    GBP: [25, 50, 100, 200],
    USD: [25, 50, 100, 200],
    CAD: [25, 50, 100, 200],
    EUR: [25, 50, 100, 200],
    NGN: [10000, 25000, 50000, 100000],
  }[currency] || [25, 50, 100, 200]
}

export function majorToMinor(major, currency) {
  // For all currencies in v1, minor = major * 100
  return Math.round(parseFloat(major) * 100)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/currency.js
git commit -m "feat: add currency detection and formatting utilities"
```

---

### Task 33: `donationStore`, `phoneAuthStore`, `familyHeadStore`

**Files:**
- Create: `src/stores/donationStore.js`
- Create: `src/stores/phoneAuthStore.js`
- Create: `src/stores/familyHeadStore.js`

- [ ] **Step 1: Implement donationStore**

```javascript
import { create } from 'zustand'
import { donationApi } from '../utils/donationApi.js'

export const useDonationStore = create((set, get) => ({
  // Charge state
  chargeStep: 'amount',  // 'amount' | 'donor' | 'review' | 'redirecting'
  amount: { displayMinor: 0, displayCurrency: 'GHS', tipPesewas: 0, includeTip: true },
  donor: { display_name: '', visibility: 'names_only', email: '', phone: '', country_code: 'GH' },
  chargeError: null,
  chargeLoading: false,

  // Wall state
  walls: {},  // { [memorialId]: { wall_mode, donations, next_cursor, total_raised_pesewas, total_donor_count, goal_amount_pesewas } }
  wallLoading: {},

  setStep: (chargeStep) => set({ chargeStep }),
  setAmount: (amount) => set({ amount: { ...get().amount, ...amount } }),
  setDonor: (donor) => set({ donor: { ...get().donor, ...donor } }),
  reset: () => set({
    chargeStep: 'amount',
    amount: { displayMinor: 0, displayCurrency: 'GHS', tipPesewas: 0, includeTip: true },
    donor: { display_name: '', visibility: 'names_only', email: '', phone: '', country_code: 'GH' },
    chargeError: null, chargeLoading: false,
  }),

  initiateCharge: async (memorialId) => {
    set({ chargeLoading: true, chargeError: null })
    const { amount, donor } = get()
    try {
      const res = await donationApi.charge(memorialId, {
        display_amount_minor: amount.displayMinor,
        display_currency: amount.displayCurrency,
        tip_pesewas: amount.includeTip ? amount.tipPesewas : 0,
        donor,
      })
      set({ chargeLoading: false, chargeStep: 'redirecting' })
      return res
    } catch (e) {
      set({ chargeLoading: false, chargeError: e.message })
      throw e
    }
  },

  loadWall: async (memorialId, cursor = null) => {
    set(s => ({ wallLoading: { ...s.wallLoading, [memorialId]: true } }))
    try {
      const res = await donationApi.getWall(memorialId, cursor)
      set(s => ({
        walls: { ...s.walls, [memorialId]: cursor ? {
          ...s.walls[memorialId],
          donations: [...(s.walls[memorialId]?.donations || []), ...res.donations],
          next_cursor: res.next_cursor,
        } : res },
        wallLoading: { ...s.wallLoading, [memorialId]: false },
      }))
    } catch (e) {
      set(s => ({ wallLoading: { ...s.wallLoading, [memorialId]: false } }))
    }
  },
}))
```

- [ ] **Step 2: Implement phoneAuthStore**

```javascript
import { create } from 'zustand'
import { phoneAuthApi } from '../utils/donationApi.js'
import { useAuthStore } from './authStore.js'

export const usePhoneAuthStore = create((set, get) => ({
  step: 'phone',           // 'phone' | 'code'
  phone: '',
  countryCode: 'GH',
  purpose: 'login',
  provider: null,
  resendAvailableAt: 0,
  attemptsLeft: 5,
  locked: false,
  error: null,
  loading: false,

  setPhone: (phone) => set({ phone }),
  setCountryCode: (countryCode) => set({ countryCode }),
  setPurpose: (purpose) => set({ purpose }),
  reset: () => set({
    step: 'phone', phone: '', error: null, locked: false, loading: false,
    resendAvailableAt: 0, attemptsLeft: 5,
  }),

  sendOtp: async () => {
    set({ loading: true, error: null })
    try {
      const res = await phoneAuthApi.sendOtp(get().phone, get().purpose)
      set({
        loading: false, step: 'code',
        provider: res.provider,
        resendAvailableAt: Date.now() + (res.resend_after || 30) * 1000,
      })
    } catch (e) {
      const locked = e.status === 429
      set({ loading: false, error: e.message, locked })
    }
  },

  verify: async (code) => {
    set({ loading: true, error: null })
    try {
      const res = await phoneAuthApi.verify(get().phone, code, get().purpose)
      set({ loading: false })
      // For login purpose, hand off to authStore
      if (get().purpose === 'login' && res.token) {
        useAuthStore.getState().setSession(res)
      }
      return res
    } catch (e) {
      set({ loading: false, error: e.message, attemptsLeft: Math.max(0, get().attemptsLeft - 1) })
      throw e
    }
  },
}))
```

- [ ] **Step 3: Implement familyHeadStore**

Similar pattern, exposing memorial settings load/update + approval/reject actions.

- [ ] **Step 4: Update authStore with phone fields**

In `src/stores/authStore.js`, extend the user shape and add `linkPhone`:

```javascript
// Add to existing setSession to handle the new user shape from /auth/phone/verify
// Add new action:
linkPhone: async (phone, code) => {
  const res = await phoneAuthApi.link(phone, code)
  set(s => ({ user: { ...s.user, phone_e164: res.phone_e164, auth_methods: res.auth_methods } }))
}
```

- [ ] **Step 5: Add unit test**

`src/__tests__/stores/donationStore.test.js`: test setStep, setAmount, setDonor, reset, plus initiateCharge with mocked donationApi.

- [ ] **Step 6: Commit**

```bash
git add src/stores/donationStore.js src/stores/phoneAuthStore.js src/stores/familyHeadStore.js src/stores/authStore.js src/__tests__/stores/donationStore.test.js
git commit -m "feat: add donation, phone-auth, and family-head Zustand stores"
```

---

## Phase 8 — Phone Auth UI

### Task 34: PhoneInput + OtpCodeInput components

**Files:**
- Create: `src/components/auth/PhoneInput.jsx`
- Create: `src/components/auth/OtpCodeInput.jsx`

- [ ] **Step 1: Implement PhoneInput**

```jsx
import { useState } from 'react'
import { parsePhoneNumberFromString, getCountryCallingCode } from 'libphonenumber-js'

const COUNTRIES = [
  { code: 'GH', flag: '🇬🇭', name: 'Ghana' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria' },
]

export function PhoneInput({ value, onChange, country, onCountryChange, autoFocus, className = '' }) {
  const [local, setLocal] = useState('')

  const handleLocalChange = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, '')
    setLocal(raw)
    const parsed = parsePhoneNumberFromString(raw, country)
    onChange?.(parsed?.isValid() ? parsed.number : '')
  }

  return (
    <div className={`flex items-stretch border rounded-lg overflow-hidden bg-bg-primary border-border-default ${className}`}>
      <select
        className="bg-bg-secondary px-3 py-2 border-r border-border-default focus:outline-none focus:ring-2 focus:ring-accent-primary"
        value={country}
        onChange={(e) => onCountryChange?.(e.target.value)}
        aria-label="Country"
      >
        {COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>{c.flag} +{getCountryCallingCode(c.code)}</option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        autoFocus={autoFocus}
        value={local}
        onChange={handleLocalChange}
        placeholder="24 123 4567"
        className="flex-1 px-3 py-2 bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        aria-label="Phone number"
      />
    </div>
  )
}
```

- [ ] **Step 2: Implement OtpCodeInput**

```jsx
import { useRef, useEffect } from 'react'

export function OtpCodeInput({ value = '', onChange, length = 6, autoFocus = true, disabled = false }) {
  const refs = useRef([])

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])

  const handleChange = (i, raw) => {
    const digit = raw.slice(-1).replace(/[^\d]/g, '')
    const next = (value.padEnd(length, ' ').split('')).map((c, idx) => idx === i ? (digit || ' ') : c).join('').trimEnd()
    onChange?.(next)
    if (digit && i < length - 1) refs.current[i + 1]?.focus()
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/[^\d]/g, '').slice(0, length)
    if (pasted.length === length) {
      onChange?.(pasted)
      refs.current[length - 1]?.focus()
      e.preventDefault()
    }
  }

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          value={value[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className="w-12 h-14 text-2xl text-center border rounded-lg bg-bg-primary border-border-default focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/PhoneInput.jsx src/components/auth/OtpCodeInput.jsx
git commit -m "feat: add PhoneInput and OtpCodeInput components"
```

---

### Task 35: PhoneAuthDialog

**Files:**
- Create: `src/components/auth/PhoneAuthDialog.jsx`

- [ ] **Step 1: Implement**

```jsx
import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { PhoneInput } from './PhoneInput.jsx'
import { OtpCodeInput } from './OtpCodeInput.jsx'
import { usePhoneAuthStore } from '../../stores/phoneAuthStore.js'

export function PhoneAuthDialog({ open, onOpenChange, purpose = 'login', onSuccess }) {
  const store = usePhoneAuthStore()
  const [code, setCode] = useState('')
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (!open) return
    store.reset()
    store.setPurpose(purpose)
  }, [open, purpose])

  useEffect(() => {
    if (store.step !== 'code') return
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((store.resendAvailableAt - Date.now()) / 1000))
      setResendIn(remaining)
    }, 500)
    return () => clearInterval(id)
  }, [store.step, store.resendAvailableAt])

  const handleSend = async () => {
    await store.sendOtp()
  }

  const handleVerify = async () => {
    try {
      const res = await store.verify(code)
      onSuccess?.(res)
      onOpenChange(false)
    } catch {}
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-primary border border-border-default rounded-2xl p-6 w-full max-w-md shadow-glow">
          {store.step === 'phone' && (
            <>
              <Dialog.Title className="text-xl font-semibold text-text-primary mb-2">
                Sign in with phone
              </Dialog.Title>
              <Dialog.Description className="text-text-secondary mb-4">
                We&apos;ll send a 6-digit code by SMS.
              </Dialog.Description>
              <PhoneInput
                value={store.phone}
                onChange={store.setPhone}
                country={store.countryCode}
                onCountryChange={store.setCountryCode}
                autoFocus
              />
              {store.error && <p className="text-burgundy-300 text-sm mt-2">{store.error}</p>}
              <button
                onClick={handleSend}
                disabled={!store.phone || store.loading}
                className="mt-4 w-full bg-accent-primary text-bg-primary font-medium py-3 rounded-lg disabled:opacity-50"
              >
                {store.loading ? 'Sending…' : 'Send code'}
              </button>
            </>
          )}

          {store.step === 'code' && (
            <>
              <Dialog.Title className="text-xl font-semibold text-text-primary mb-2">
                Enter your code
              </Dialog.Title>
              <Dialog.Description className="text-text-secondary mb-4">
                We sent a code to {store.phone}
              </Dialog.Description>
              <OtpCodeInput value={code} onChange={setCode} autoFocus />
              {store.error && <p className="text-burgundy-300 text-sm mt-3 text-center">{store.error}</p>}
              <div className="flex justify-between text-sm text-text-secondary mt-4">
                {resendIn > 0
                  ? <span>Resend in {resendIn}s</span>
                  : <button onClick={handleSend} className="underline">Resend code</button>
                }
                <button onClick={() => usePhoneAuthStore.setState({ step: 'phone' })} className="underline">
                  Wrong number?
                </button>
              </div>
              <button
                onClick={handleVerify}
                disabled={code.length < 6 || store.loading}
                className="mt-4 w-full bg-accent-primary text-bg-primary font-medium py-3 rounded-lg disabled:opacity-50"
              >
                {store.loading ? 'Verifying…' : 'Verify'}
              </button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

- [ ] **Step 2: Add `src/components/auth/__tests__/PhoneAuthDialog.test.jsx`**

Tests: dialog renders phone step initially; sending OTP advances to code step; entering 6 digits enables verify button; locked state disables send.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/PhoneAuthDialog.jsx src/components/auth/__tests__/PhoneAuthDialog.test.jsx
git commit -m "feat: add PhoneAuthDialog with two-step OTP flow"
```

---

### Task 36: Sign-in chooser + Navbar integration

**Files:**
- Create: `src/components/auth/SignInChooser.jsx`
- Modify: `src/components/layout/Navbar.jsx`

- [ ] **Step 1: Implement SignInChooser**

```jsx
import { useState } from 'react'
import { GoogleLoginButton } from './GoogleLoginButton.jsx'
import { PhoneAuthDialog } from './PhoneAuthDialog.jsx'

export function SignInChooser() {
  const [phoneOpen, setPhoneOpen] = useState(false)
  return (
    <>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <GoogleLoginButton />
        <button
          onClick={() => setPhoneOpen(true)}
          className="w-full border border-border-default text-text-primary font-medium py-3 rounded-lg hover:bg-bg-secondary"
        >
          Continue with phone
        </button>
      </div>
      <PhoneAuthDialog
        open={phoneOpen}
        onOpenChange={setPhoneOpen}
        purpose="login"
      />
    </>
  )
}
```

- [ ] **Step 2: Update Navbar**

In `src/components/layout/Navbar.jsx`, replace the existing unauthenticated `<GoogleLoginButton />` render with `<SignInChooser />`. Keep the authenticated user-menu logic unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/SignInChooser.jsx src/components/layout/Navbar.jsx
git commit -m "feat: replace Google-only sign-in with chooser (Google + phone)"
```

---

## Phase 9 — Donate flow UI

### Task 37: DonatePanel (memorial-page embed)

**Files:**
- Create: `src/components/donation/DonatePanel.jsx`
- Create: `src/components/donation/ProgressBar.jsx`
- Create: `src/components/donation/DonateButton.jsx`
- Create: `src/components/donation/__tests__/DonatePanel.test.jsx`

- [ ] **Step 1: Implement ProgressBar**

```jsx
import { formatMinor } from '../../utils/currency.js'

export function ProgressBar({ raised, goal }) {
  if (!goal) {
    return <p className="text-text-secondary">{formatMinor(raised, 'GHS')} raised</p>
  }
  const pct = Math.min(100, Math.round((raised / goal) * 100))
  return (
    <div>
      <p className="text-text-primary mb-2">
        <span className="font-semibold">{formatMinor(raised, 'GHS')}</span>
        <span className="text-text-secondary"> raised of {formatMinor(goal, 'GHS')} goal</span>
      </p>
      <div className="h-2 bg-bg-secondary rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-accent-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement DonateButton**

```jsx
import { useNavigate } from 'react-router-dom'

export function DonateButton({ slug, disabled, className = '' }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/m/${slug}/donate`)}
      disabled={disabled}
      className={`bg-accent-primary text-bg-primary font-medium py-3 px-6 rounded-lg disabled:opacity-50 hover:bg-accent-secondary transition-colors ${className}`}
    >
      Donate
    </button>
  )
}
```

- [ ] **Step 3: Implement DonatePanel**

```jsx
import { useEffect } from 'react'
import { useDonationStore } from '../../stores/donationStore.js'
import { ProgressBar } from './ProgressBar.jsx'
import { DonateButton } from './DonateButton.jsx'
import { DonorWall } from './DonorWall.jsx'
import { ShareDonationDialog } from './ShareDonationDialog.jsx'

export function DonatePanel({ memorial }) {
  const { walls, loadWall } = useDonationStore()
  const wall = walls[memorial.id]

  useEffect(() => {
    if (memorial.donation?.enabled) loadWall(memorial.id)
  }, [memorial.id, memorial.donation?.enabled])

  if (!memorial.donation?.enabled || memorial.donation.approval_status !== 'approved') {
    return null
  }

  return (
    <section className="bg-bg-secondary border border-border-default rounded-2xl p-6 my-6">
      <h3 className="text-xl font-semibold text-text-primary mb-4">In memory of {memorial.deceased_name}</h3>

      <ProgressBar
        raised={wall?.total_raised_pesewas ?? memorial.donation.total_raised_pesewas ?? 0}
        goal={memorial.donation.goal_amount_pesewas}
      />

      <p className="text-text-secondary mt-2">
        {wall?.total_donor_count ?? memorial.donation.total_donor_count ?? 0} {((wall?.total_donor_count ?? 0) === 1) ? 'person has' : 'people have'} donated
      </p>

      <div className="flex gap-3 mt-4">
        <DonateButton slug={memorial.slug} />
        <ShareDonationDialog memorial={memorial} />
      </div>

      {wall && wall.wall_mode !== 'private' && wall.donations?.length > 0 && (
        <div className="mt-6">
          <DonorWall memorialId={memorial.id} />
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Tests**

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DonatePanel } from '../DonatePanel.jsx'

describe('DonatePanel', () => {
  it('renders nothing when donation not enabled', () => {
    const { container } = render(<MemoryRouter><DonatePanel memorial={{ id: 'm', donation: { enabled: false } }} /></MemoryRouter>)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when approval pending', () => {
    const { container } = render(<MemoryRouter><DonatePanel memorial={{ id: 'm', donation: { enabled: true, approval_status: 'pending' } }} /></MemoryRouter>)
    expect(container.firstChild).toBeNull()
  })

  it('renders donate button when approved', () => {
    render(<MemoryRouter><DonatePanel memorial={{ id: 'm', slug: 's', deceased_name: 'X', donation: { enabled: true, approval_status: 'approved' } }} /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Donate' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Commit**

```bash
git add src/components/donation/DonatePanel.jsx src/components/donation/ProgressBar.jsx src/components/donation/DonateButton.jsx src/components/donation/__tests__/DonatePanel.test.jsx
git commit -m "feat: add DonatePanel with progress bar and donate button"
```

---

### Task 38: DonorWall component

**Files:**
- Create: `src/components/donation/DonorWall.jsx`
- Create: `src/components/donation/__tests__/DonorWall.test.jsx`

- [ ] **Step 1: Implement**

```jsx
import { useDonationStore } from '../../stores/donationStore.js'
import { formatMinor } from '../../utils/currency.js'

function relativeTime(ts) {
  const diff = Date.now() - ts
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(ts).toLocaleDateString('en-GH')
}

export function DonorWall({ memorialId }) {
  const { walls, wallLoading, loadWall } = useDonationStore()
  const wall = walls[memorialId]
  if (!wall) return null

  const showAmounts = wall.wall_mode === 'full'

  return (
    <div>
      <h4 className="text-lg font-medium text-text-primary mb-3">Recent donations</h4>
      <ul className="divide-y divide-border-default">
        {wall.donations.map(d => (
          <li key={d.id} className="py-3 flex justify-between items-center">
            <span className="text-text-primary">{d.display_name}</span>
            <span className="flex items-center gap-3 text-text-secondary text-sm">
              {showAmounts && d.amount_pesewas !== undefined && (
                <span className="text-text-primary font-medium">{formatMinor(d.amount_pesewas, 'GHS')}</span>
              )}
              <span>{relativeTime(d.created_at)}</span>
            </span>
          </li>
        ))}
      </ul>
      {wall.next_cursor && (
        <button
          onClick={() => loadWall(memorialId, wall.next_cursor)}
          disabled={wallLoading[memorialId]}
          className="mt-4 w-full text-text-secondary hover:text-text-primary border border-border-default rounded-lg py-2 disabled:opacity-50"
        >
          {wallLoading[memorialId] ? 'Loading…' : 'Show more'}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Tests**

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DonorWall } from '../DonorWall.jsx'
import { useDonationStore } from '../../../stores/donationStore.js'

describe('DonorWall', () => {
  it('hides amounts in names_only mode', () => {
    useDonationStore.setState({
      walls: { m: { wall_mode: 'names_only', donations: [{ id: 'd1', display_name: 'John', created_at: Date.now() }] } },
      wallLoading: {},
    })
    render(<DonorWall memorialId="m" />)
    expect(screen.getByText('John')).toBeInTheDocument()
    expect(screen.queryByText(/GHS/)).toBeNull()
  })

  it('shows Anonymous for anonymous donations', () => {
    useDonationStore.setState({
      walls: { m: { wall_mode: 'full', donations: [{ id: 'd1', display_name: 'Anonymous', amount_pesewas: 1000, created_at: Date.now() }] } },
      wallLoading: {},
    })
    render(<DonorWall memorialId="m" />)
    expect(screen.getByText('Anonymous')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Commit**

```bash
git add src/components/donation/DonorWall.jsx src/components/donation/__tests__/DonorWall.test.jsx
git commit -m "feat: add DonorWall component with wall_mode-aware rendering"
```

---

### Task 39: DonationAmountStep + DonationTipToggle

**Files:**
- Create: `src/components/donation/DonationAmountStep.jsx`
- Create: `src/components/donation/DonationTipToggle.jsx`
- Create: `src/components/donation/__tests__/DonationAmountStep.test.jsx`

- [ ] **Step 1: Implement DonationTipToggle**

```jsx
import { formatMinor } from '../../utils/currency.js'

export function DonationTipToggle({ checked, onCheckedChange, baseAmountMinor, currency, percent = 5 }) {
  const tipMinor = Math.round(baseAmountMinor * percent / 100)
  return (
    <div className="flex items-center justify-between p-3 border border-border-default rounded-lg bg-bg-primary">
      <label className="flex items-center gap-3 cursor-pointer flex-1">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="w-4 h-4 accent-accent-primary"
          aria-label={`Add ${percent}% tip to support FuneralPress`}
        />
        <span className="text-text-primary">Add {percent}% to support FuneralPress</span>
      </label>
      <span className="text-text-secondary tabular-nums">{formatMinor(tipMinor, currency)}</span>
    </div>
  )
}
```

- [ ] **Step 2: Implement DonationAmountStep**

```jsx
import { useState, useEffect } from 'react'
import { useDonationStore } from '../../stores/donationStore.js'
import { detectCurrency, formatMinor, quickAmounts, majorToMinor } from '../../utils/currency.js'
import { DonationTipToggle } from './DonationTipToggle.jsx'

export function DonationAmountStep({ tipDefaultPercent = 5, fxRate = 1, onContinue }) {
  const { amount, setAmount } = useDonationStore()
  const [custom, setCustom] = useState('')
  const currency = amount.displayCurrency || detectCurrency()

  useEffect(() => {
    if (!amount.displayCurrency) {
      setAmount({ displayCurrency: currency })
    }
  }, [])

  const setAmountMinor = (minor) => {
    const tipPesewas = Math.round(minor * fxRate * tipDefaultPercent / 100)
    setAmount({ displayMinor: minor, tipPesewas, includeTip: amount.includeTip })
  }

  const handleQuick = (major) => {
    setCustom(String(major))
    setAmountMinor(majorToMinor(major, currency))
  }

  const handleCustom = (v) => {
    setCustom(v)
    setAmountMinor(majorToMinor(v || '0', currency))
  }

  const totalMinor = amount.displayMinor + (amount.includeTip ? Math.round(amount.tipPesewas / fxRate) : 0)
  const ghsTotalPesewas = Math.round(totalMinor * fxRate)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">How much would you like to donate?</h3>

      <div className="grid grid-cols-4 gap-2">
        {quickAmounts(currency).map(v => (
          <button
            key={v}
            onClick={() => handleQuick(v)}
            className={`py-3 border rounded-lg ${custom === String(v) ? 'border-accent-primary bg-accent-primary/10' : 'border-border-default'}`}
          >
            {formatMinor(v * 100, currency)}
          </button>
        ))}
      </div>

      <input
        type="number"
        inputMode="decimal"
        placeholder="Custom amount"
        value={custom}
        onChange={(e) => handleCustom(e.target.value)}
        className="w-full px-4 py-3 border border-border-default rounded-lg bg-bg-primary"
      />

      <DonationTipToggle
        checked={amount.includeTip}
        onCheckedChange={(v) => setAmount({ includeTip: v })}
        baseAmountMinor={amount.displayMinor}
        currency={currency}
        percent={tipDefaultPercent}
      />

      <div className="border-t border-border-default pt-4 space-y-1">
        <div className="flex justify-between text-text-primary font-semibold">
          <span>Total</span>
          <span>{formatMinor(totalMinor, currency)}</span>
        </div>
        {currency !== 'GHS' && (
          <div className="flex justify-between text-text-secondary text-sm">
            <span>In Ghana cedis</span>
            <span>{formatMinor(ghsTotalPesewas, 'GHS')}</span>
          </div>
        )}
      </div>

      <button
        onClick={onContinue}
        disabled={amount.displayMinor < 100}
        className="w-full py-3 bg-accent-primary text-bg-primary font-medium rounded-lg disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Tests**

```jsx
describe('DonationAmountStep', () => {
  it('default-on tip increments total by 5%', () => { /* ... */ })
  it('unchecking tip removes it from total', () => { /* ... */ })
  it('disables continue when amount < minimum', () => { /* ... */ })
  it('shows GHS conversion for non-GHS currency', () => { /* ... */ })
})
```

- [ ] **Step 4: Commit**

```bash
git add src/components/donation/DonationAmountStep.jsx src/components/donation/DonationTipToggle.jsx src/components/donation/__tests__/DonationAmountStep.test.jsx
git commit -m "feat: add donation amount step with tip toggle and GHS conversion"
```

---

### Task 40: DonationDonorStep + DonationReviewStep

**Files:**
- Create: `src/components/donation/DonationDonorStep.jsx`
- Create: `src/components/donation/DonationReviewStep.jsx`

- [ ] **Step 1: Implement DonationDonorStep**

```jsx
import { useDonationStore } from '../../stores/donationStore.js'

export function DonationDonorStep({ wallMode, onBack, onContinue }) {
  const { donor, setDonor } = useDonationStore()
  const showAnon = wallMode !== 'private'

  const visibilityOptions = [
    { value: 'name_amount', label: 'Show my name and amount' },
    { value: 'name_only',   label: 'Show my name only' },
    ...(showAnon ? [{ value: 'anonymous', label: 'Donate anonymously' }] : []),
  ]
  // donor.visibility is 'public'|'anonymous' on wire; map name_amount/name_only both to 'public'
  // (Wall mode shapes the response; donor visibility only signals "anonymous" preference.)

  const onVis = (v) => {
    setDonor({ visibility: v === 'anonymous' ? 'anonymous' : 'public' })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">How would you like to appear on the wall?</h3>

      <div>
        <label className="block text-sm text-text-secondary mb-1">Display name</label>
        <input
          type="text"
          autoFocus
          value={donor.display_name}
          onChange={(e) => setDonor({ display_name: e.target.value })}
          maxLength={60}
          placeholder="John K."
          className="w-full px-4 py-3 border border-border-default rounded-lg bg-bg-primary"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="sr-only">Visibility</legend>
        {visibilityOptions.map(o => (
          <label key={o.value} className="flex items-center gap-2 p-3 border border-border-default rounded-lg cursor-pointer">
            <input
              type="radio"
              name="visibility"
              value={o.value}
              checked={(donor.visibility === 'anonymous') === (o.value === 'anonymous')}
              onChange={() => onVis(o.value)}
              className="accent-accent-primary"
            />
            <span className="text-text-primary">{o.label}</span>
          </label>
        ))}
      </fieldset>

      <div>
        <label className="block text-sm text-text-secondary mb-1">Email (optional)</label>
        <input
          type="email"
          value={donor.email}
          onChange={(e) => setDonor({ email: e.target.value })}
          placeholder="for receipt and the family's thank-you card"
          className="w-full px-4 py-3 border border-border-default rounded-lg bg-bg-primary"
        />
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 border border-border-default rounded-lg">Back</button>
        <button
          onClick={onContinue}
          disabled={!donor.display_name.trim()}
          className="flex-1 py-3 bg-accent-primary text-bg-primary font-medium rounded-lg disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement DonationReviewStep**

```jsx
import { useDonationStore } from '../../stores/donationStore.js'
import { formatMinor } from '../../utils/currency.js'

function maskMomo(num) {
  if (!num) return ''
  return num.slice(0, 4) + '****' + num.slice(-3)
}

function maskName(name) {
  if (!name) return ''
  return name.split(' ').map(p => p[0] + '*****').join(' ')
}

export function DonationReviewStep({ memorial, onBack, onPay, loading }) {
  const { amount } = useDonationStore()
  const tipMinor = Math.round(amount.tipPesewas / (memorial.donation?.fx_rate || 1))
  const totalMinor = amount.displayMinor + (amount.includeTip ? tipMinor : 0)

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <p className="text-text-secondary">In memory of</p>
        <p className="text-xl font-semibold text-text-primary">{memorial.deceased_name}</p>
        <p className="text-text-secondary text-sm">{memorial.dates}</p>
      </div>

      <div className="border border-border-default rounded-lg p-4 space-y-2">
        <div className="flex justify-between"><span>Donation</span><span>{formatMinor(amount.displayMinor, amount.displayCurrency)}</span></div>
        {amount.includeTip && <div className="flex justify-between text-text-secondary"><span>Tip</span><span>{formatMinor(tipMinor, amount.displayCurrency)}</span></div>}
        <div className="border-t border-border-default pt-2 flex justify-between font-semibold">
          <span>Total</span><span>{formatMinor(totalMinor, amount.displayCurrency)}</span>
        </div>
      </div>

      <div className="text-sm text-text-secondary">
        Family receives via {memorial.donation.payout_momo_provider?.toUpperCase()} MoMo<br />
        Account: {maskName(memorial.donation.payout_account_name)}<br />
        Number: {maskMomo(memorial.donation.payout_momo_number)}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 border border-border-default rounded-lg" disabled={loading}>Back</button>
        <button
          onClick={onPay}
          disabled={loading}
          className="flex-1 py-3 bg-accent-primary text-bg-primary font-medium rounded-lg disabled:opacity-50"
        >
          {loading ? 'Starting payment…' : 'Pay with Paystack →'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/donation/DonationDonorStep.jsx src/components/donation/DonationReviewStep.jsx
git commit -m "feat: add donor and review steps for donation flow"
```

---

### Task 41: DonatePage (full-screen route)

**Files:**
- Create: `src/pages/DonatePage.jsx`

- [ ] **Step 1: Implement**

```jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDonationStore } from '../stores/donationStore.js'
import { DonationAmountStep } from '../components/donation/DonationAmountStep.jsx'
import { DonationDonorStep } from '../components/donation/DonationDonorStep.jsx'
import { DonationReviewStep } from '../components/donation/DonationReviewStep.jsx'

export default function DonatePage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [memorial, setMemorial] = useState(null)
  const { chargeStep, setStep, initiateCharge, chargeError, chargeLoading } = useDonationStore()

  useEffect(() => {
    fetch(`/api/memorial-by-slug/${slug}`)
      .then(r => r.json())
      .then(setMemorial)
  }, [slug])

  if (!memorial) return <p className="p-8 text-center">Loading…</p>
  if (!memorial.donation?.enabled || memorial.donation.approval_status !== 'approved') {
    return <p className="p-8 text-center">Donations are not available for this memorial.</p>
  }

  const handlePay = async () => {
    try {
      const res = await initiateCharge(memorial.id)
      window.location.href = res.authorization_url
    } catch (e) { /* shown via chargeError */ }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="text-text-secondary mb-4">← Back to memorial</button>

      <div className="bg-bg-primary border border-border-default rounded-2xl p-6">
        {chargeStep === 'amount' && (
          <DonationAmountStep
            tipDefaultPercent={5}
            onContinue={() => setStep('donor')}
          />
        )}
        {chargeStep === 'donor' && (
          <DonationDonorStep
            wallMode={memorial.donation.wall_mode}
            onBack={() => setStep('amount')}
            onContinue={() => setStep('review')}
          />
        )}
        {(chargeStep === 'review' || chargeStep === 'redirecting') && (
          <DonationReviewStep
            memorial={memorial}
            onBack={() => setStep('donor')}
            onPay={handlePay}
            loading={chargeLoading || chargeStep === 'redirecting'}
          />
        )}
        {chargeError && <p className="text-burgundy-300 text-sm mt-3">{chargeError}</p>}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/DonatePage.jsx
git commit -m "feat: add DonatePage with three-step flow"
```

---

### Task 42: DonationThanksPage with soft-capture

**Files:**
- Create: `src/pages/DonationThanksPage.jsx`
- Create: `src/components/donation/DonationThankYouCard.jsx`

- [ ] **Step 1: Implement DonationThankYouCard**

```jsx
import { formatMinor } from '../../utils/currency.js'

export function DonationThankYouCard({ memorial, donor, amountMinor, currency }) {
  return (
    <div className="bg-gradient-to-br from-bg-primary to-bg-secondary border border-accent-primary rounded-2xl p-6 text-center shadow-glow">
      <p className="text-text-secondary text-sm">{memorial.deceased_name}</p>
      <p className="text-text-secondary text-xs mb-3">{memorial.dates}</p>
      <p className="text-text-primary mb-3">A donation has been made in their memory by</p>
      <p className="text-accent-primary text-lg font-semibold">{donor.display_name}</p>
      {amountMinor && <p className="text-text-secondary mt-2">{formatMinor(amountMinor, currency)}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Implement DonationThanksPage**

```jsx
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { donationApi } from '../utils/donationApi.js'
import { DonationThankYouCard } from '../components/donation/DonationThankYouCard.jsx'
import { PhoneAuthDialog } from '../components/auth/PhoneAuthDialog.jsx'
import { GoogleLoginButton } from '../components/auth/GoogleLoginButton.jsx'

export default function DonationThanksPage() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const reference = params.get('ref')
  const [donation, setDonation] = useState(null)
  const [phoneOpen, setPhoneOpen] = useState(false)

  useEffect(() => {
    if (!reference) return
    // Look up donation by reference (anon-readable endpoint, optional — or polling)
    fetch(`/api/donation-by-ref/${reference}`).then(r => r.json()).then(setDonation)
  }, [reference])

  return (
    <main className="max-w-md mx-auto px-4 py-8 text-center">
      <div className="text-5xl mb-4">✓</div>
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Your donation was successful</h1>
      {donation && (
        <p className="text-text-secondary mb-6">
          Thank you for honouring {donation.deceased_name}'s memory with {donation.amount_display}.
          <br /><br />
          The family will receive your donation through {donation.momo_provider?.toUpperCase()} MoMo within 24 hours.
        </p>
      )}

      {donation && (
        <DonationThankYouCard
          memorial={{ deceased_name: donation.deceased_name, dates: donation.dates }}
          donor={{ display_name: donation.donor_display_name }}
          amountMinor={donation.display_amount_minor}
          currency={donation.display_currency}
        />
      )}

      <hr className="my-8 border-border-default" />

      <h2 className="text-lg font-semibold text-text-primary mb-2">Save this donation to your profile</h2>
      <p className="text-text-secondary mb-4">
        Get reminded of one-week and 40-day observances. View all your tributes in one place.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => setPhoneOpen(true)}
          className="w-full py-3 bg-accent-primary text-bg-primary font-medium rounded-lg"
        >
          Continue with phone
        </button>
        <GoogleLoginButton fullWidth />
      </div>

      <p className="mt-6">
        <a href={`/m/${slug}`} className="text-text-secondary underline">No thanks</a>
      </p>

      <PhoneAuthDialog
        open={phoneOpen}
        onOpenChange={setPhoneOpen}
        purpose="login"
        onSuccess={async () => {
          if (donation) await donationApi.claim(donation.id)
        }}
      />
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/DonationThanksPage.jsx src/components/donation/DonationThankYouCard.jsx
git commit -m "feat: add post-donation thanks page with soft-capture flow"
```

---

## Phase 10 — Family-head UI

### Task 43: FamilyHeadApprovalView + page route

**Files:**
- Create: `src/components/family-head/FamilyHeadApprovalView.jsx`
- Create: `src/pages/FamilyHeadApprovalPage.jsx`

- [ ] **Step 1: Implement FamilyHeadApprovalView**

```jsx
import { useState } from 'react'
import { OtpCodeInput } from '../auth/OtpCodeInput.jsx'
import { phoneAuthApi } from '../../utils/donationApi.js'
import { donationApi } from '../../utils/donationApi.js'
import { formatMinor } from '../../utils/currency.js'

export function FamilyHeadApprovalView({ memorial, token }) {
  const [stage, setStage] = useState('details') // 'details' | 'otp' | 'decision' | 'rejecting' | 'done'
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [reason, setReason] = useState('')
  const [outcome, setOutcome] = useState(null)

  const sendOtp = async () => {
    setError(null)
    try {
      await phoneAuthApi.sendOtp(memorial.family_head_phone, 'family_head_approval')
      setStage('otp')
    } catch (e) {
      setError(e.message)
    }
  }

  const verifyOtp = async () => {
    setError(null)
    try {
      // We don't issue JWT for family_head_approval — we just need the OTP consumed against this phone
      await phoneAuthApi.verify(memorial.family_head_phone, code, 'family_head_approval')
      setStage('decision')
    } catch (e) {
      setError(e.message)
    }
  }

  const approve = async () => {
    setError(null)
    try {
      await donationApi.approve(memorial.id, { token, otp_code: code, phone: memorial.family_head_phone })
      setOutcome('approved')
      setStage('done')
    } catch (e) {
      setError(e.message)
    }
  }

  const reject = async () => {
    setError(null)
    try {
      await donationApi.reject(memorial.id, { token, otp_code: code, phone: memorial.family_head_phone, reason })
      setOutcome('rejected')
      setStage('done')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <p className="text-text-secondary">Hello {memorial.family_head_name},</p>
      <p className="text-text-primary">You've been named the family head for the memorial of:</p>
      <div className="bg-bg-secondary border border-border-default rounded-2xl p-4 text-center">
        <p className="text-xl font-semibold text-text-primary">{memorial.deceased_name}</p>
        <p className="text-text-secondary text-sm">{memorial.dates}</p>
      </div>
      <p className="text-text-secondary">This memorial was created by {memorial.creator_name}.</p>

      <div className="border border-border-default rounded-lg p-4 space-y-2 text-sm">
        <p>✓ Public memorial page on funeralpress.org</p>
        <p>✓ Donations to {memorial.donation?.payout_momo_provider?.toUpperCase()} MoMo: ****{memorial.donation?.payout_momo_number?.slice(-3)}</p>
        <p>✓ Account: {memorial.donation?.payout_account_name}</p>
        {memorial.donation?.goal_amount_pesewas && <p>✓ Donation goal: {formatMinor(memorial.donation.goal_amount_pesewas, 'GHS')}</p>}
        <p>✓ Wall mode: {memorial.donation?.wall_mode}</p>
      </div>

      {stage === 'details' && (
        <button onClick={sendOtp} className="w-full py-3 bg-accent-primary text-bg-primary rounded-lg font-medium">
          Verify with SMS code
        </button>
      )}

      {stage === 'otp' && (
        <>
          <p className="text-text-secondary text-sm">Code sent to {memorial.family_head_phone}</p>
          <OtpCodeInput value={code} onChange={setCode} />
          <button
            onClick={verifyOtp}
            disabled={code.length < 6}
            className="w-full py-3 bg-accent-primary text-bg-primary rounded-lg font-medium disabled:opacity-50"
          >
            Verify
          </button>
        </>
      )}

      {stage === 'decision' && (
        <div className="flex gap-3">
          <button onClick={() => setStage('rejecting')} className="flex-1 py-3 border border-burgundy-300 text-burgundy-300 rounded-lg">Reject</button>
          <button onClick={approve} className="flex-1 py-3 bg-accent-primary text-bg-primary font-medium rounded-lg">Approve</button>
        </div>
      )}

      {stage === 'rejecting' && (
        <>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="Reason (optional)"
            className="w-full p-3 border border-border-default rounded-lg bg-bg-primary"
          />
          <div className="flex gap-3">
            <button onClick={() => setStage('decision')} className="flex-1 py-3 border border-border-default rounded-lg">Cancel</button>
            <button onClick={reject} className="flex-1 py-3 bg-burgundy-500 text-bg-primary font-medium rounded-lg">Confirm reject</button>
          </div>
        </>
      )}

      {stage === 'done' && (
        <div className="text-center py-6">
          <p className="text-2xl font-semibold text-text-primary">{outcome === 'approved' ? '✓ Approved' : '✗ Rejected'}</p>
          <p className="text-text-secondary mt-2">Thank you for your decision.</p>
        </div>
      )}

      {error && <p className="text-burgundy-300 text-sm">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Implement FamilyHeadApprovalPage**

```jsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FamilyHeadApprovalView } from '../components/family-head/FamilyHeadApprovalView.jsx'

export default function FamilyHeadApprovalPage() {
  const { token } = useParams()
  const [memorial, setMemorial] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`/api/approval/lookup?token=${encodeURIComponent(token)}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Invalid or expired link')))
      .then(setMemorial)
      .catch(e => setError(e.message))
  }, [token])

  if (error) return <main className="p-8 text-center text-burgundy-300">{error}</main>
  if (!memorial) return <main className="p-8 text-center">Loading…</main>
  return <FamilyHeadApprovalView memorial={memorial} token={token} />
}
```

Note: `/api/approval/lookup` is a thin server endpoint that decodes the JWT token, returns memorial public details — implement in `donation-api.js` as `GET /memorials/approval-lookup?token=...`. This is a convenience endpoint to avoid embedding sensitive details in the JWT.

- [ ] **Step 3: Commit**

```bash
git add src/components/family-head/FamilyHeadApprovalView.jsx src/pages/FamilyHeadApprovalPage.jsx
git commit -m "feat: add family head approval view and page"
```

---

### Task 44: Family-head dashboard + settings + share assets

**Files:**
- Create: `src/components/family-head/DonationSettingsForm.jsx`
- Create: `src/components/family-head/PayoutDetailsForm.jsx`
- Create: `src/components/family-head/FamilyHeadDashboard.jsx`
- Create: `src/pages/FamilyHeadDashboardPage.jsx`
- Create: `src/components/donation/ShareDonationDialog.jsx`

- [ ] **Step 1: Implement settings/payout forms and dashboard**

(Pattern follows existing forms in `src/components/`. Forms call `donationApi.updateSettings`. PayoutDetailsForm requires fresh phone OTP step before submitting.)

- [ ] **Step 2: Implement ShareDonationDialog**

```jsx
import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'

export function ShareDonationDialog({ memorial }) {
  const [open, setOpen] = useState(false)
  const url = `https://funeralpress.org/m/${memorial.slug}/donate`

  const onWhatsApp = () => {
    const text = `Help honour ${memorial.deceased_name}'s memory: ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const onCopy = () => {
    navigator.clipboard.writeText(url)
    alert('Link copied')
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="py-3 px-6 border border-border-default rounded-lg">Share</button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-primary border border-border-default rounded-2xl p-6 w-full max-w-md">
            <Dialog.Title className="text-lg font-semibold mb-4">Share donation link</Dialog.Title>
            <div className="space-y-2">
              <button onClick={onWhatsApp} className="w-full py-3 bg-[#25D366] text-white rounded-lg">WhatsApp</button>
              <button onClick={onCopy} className="w-full py-3 border border-border-default rounded-lg">Copy link</button>
              <a href={`/family-head/${memorial.id}/qr`} className="block w-full py-3 border border-border-default rounded-lg text-center">
                Print QR poster
              </a>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
```

- [ ] **Step 3: QR poster route — server-side PDF generation**

Add to `donation-api.js`:

```javascript
const qrMatch = path.match(/^\/family-head\/([^/]+)\/qr$/)
if (qrMatch && request.method === 'GET') {
  const auth = await authenticate(request, env)
  if (!auth) return error('Auth required', 401, request)
  // ... fetch memorial, verify family head, return PDF with QR
  // (Implementation note: use a Workers-compatible QR library + serve the existing react-pdf renderer; defer to implementer)
  return error('QR poster generation not yet implemented in v1', 501, request)
}
```

For v1, the QR poster can be a frontend-rendered downloadable PDF using existing `qrcode` and `@react-pdf/renderer`. Replace the stub with a frontend `/family-head/:id/qr` page.

- [ ] **Step 4: Commit**

```bash
git add src/components/family-head/ src/pages/FamilyHeadDashboardPage.jsx src/components/donation/ShareDonationDialog.jsx
git commit -m "feat: add family-head dashboard, settings, payout, and share dialog"
```

---

## Phase 11 — Admin UI + privacy

### Task 45: AdminDashboard `DonationsTab`

**Files:**
- Create: `src/components/admin/DonationsTab.jsx`
- Create: `src/components/admin/DonationKillSwitch.jsx`
- Modify: `src/pages/AdminDashboardPage.jsx`

- [ ] **Step 1: Implement DonationsTab**

```jsx
import { useEffect, useState } from 'react'
import { donationApi } from '../../utils/donationApi.js'
import { formatMinor } from '../../utils/currency.js'

export function DonationsTab() {
  const [donations, setDonations] = useState([])
  const [filter, setFilter] = useState('')
  const [cursor, setCursor] = useState(null)

  useEffect(() => {
    fetch(`/admin/donations${filter ? `?status=${filter}` : ''}`)
      .then(r => r.json()).then(d => { setDonations(d.donations); setCursor(d.next_cursor) })
  }, [filter])

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['', 'pending', 'succeeded', 'failed', 'refunded', 'disputed'].map(s => (
          <button
            key={s || 'all'}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded ${filter === s ? 'bg-accent-primary text-bg-primary' : 'border border-border-default'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border-default">
            <th className="text-left py-2">Donor</th>
            <th className="text-left py-2 hidden sm:table-cell">Memorial</th>
            <th className="text-left py-2">Amount</th>
            <th className="text-left py-2 hidden md:table-cell">Status</th>
            <th className="text-left py-2 hidden md:table-cell">When</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {donations.map(d => (
            <tr key={d.id} className="border-b border-border-default">
              <td className="py-2">{d.donor_display_name}</td>
              <td className="py-2 hidden sm:table-cell">{d.memorial_id}</td>
              <td className="py-2">{formatMinor(d.amount_pesewas, 'GHS')}</td>
              <td className="py-2 hidden md:table-cell">{d.status}</td>
              <td className="py-2 hidden md:table-cell">{new Date(d.created_at).toLocaleDateString()}</td>
              <td className="py-2">
                {d.status === 'succeeded' && (
                  <button
                    onClick={async () => {
                      if (!confirm(`Refund ${formatMinor(d.amount_pesewas, 'GHS')} to ${d.donor_display_name}?`)) return
                      await donationApi.adminRefund?.(d.id) ?? fetch(`/admin/donations/${d.id}/refund`, { method: 'POST' })
                      alert('Refund initiated')
                    }}
                    className="text-burgundy-300 underline"
                  >
                    Refund
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Implement DonationKillSwitch**

```jsx
import { useState } from 'react'

export function DonationKillSwitch() {
  const [paused, setPaused] = useState(false)

  const toggle = async () => {
    if (!confirm(paused ? 'Resume all donations?' : 'Pause ALL donations globally? This stops every memorial.')) return
    await fetch('/admin/donations/kill-switch', {
      method: 'POST',
      body: JSON.stringify({ paused: !paused }),
    })
    setPaused(!paused)
  }

  return (
    <div className="border border-burgundy-500 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-text-primary">Donation kill switch</h3>
      <p className="text-text-secondary text-sm mb-3">Globally pauses every donation. Use only in emergencies.</p>
      <button
        onClick={toggle}
        className={`px-6 py-2 rounded-lg font-medium ${paused ? 'bg-accent-primary text-bg-primary' : 'bg-burgundy-500 text-bg-primary'}`}
      >
        {paused ? 'Resume donations' : 'Pause all donations'}
      </button>
    </div>
  )
}
```

(Backend route `POST /admin/donations/kill-switch` flips a runtime KV flag read by the worker before processing charges. Implement as a small addition to `donation-api.js`.)

- [ ] **Step 3: Wire into AdminDashboardPage**

In `src/pages/AdminDashboardPage.jsx`, import and add a tab. Match the existing tab pattern.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/DonationsTab.jsx src/components/admin/DonationKillSwitch.jsx src/pages/AdminDashboardPage.jsx workers/donation-api.js
git commit -m "feat: add admin DonationsTab and global kill switch"
```

---

### Task 46: Privacy notice page + i18n placeholder + route registration

**Files:**
- Create: `src/pages/DonationPrivacyPage.jsx`
- Create: `src/i18n/strings/donation.en.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: Implement DonationPrivacyPage**

Use existing `PageMeta` for SEO; render the spec's privacy notice content (verbatim from spec Section "Privacy notice").

- [ ] **Step 2: Implement i18n placeholder**

```javascript
// src/i18n/strings/donation.en.js
export const donationStrings = {
  donateButton: 'Donate',
  share: 'Share',
  inMemoryOf: 'In memory of',
  raised: 'raised',
  ofGoal: 'of {{goal}} goal',
  recentDonations: 'Recent donations',
  showMore: 'Show more',
  loading: 'Loading…',
  anonymous: 'Anonymous',
  // ... extracted UI strings
}
```

(The next subsystem — Twi i18n — will add `donation.tw.js`, `donation.ga.js`, etc., and a runtime selector. This file is the structural placeholder.)

- [ ] **Step 3: Register all new routes in `App.jsx`**

Add lazy-loaded routes:

```jsx
const DonatePage = lazy(() => import('./pages/DonatePage.jsx'))
const DonationThanksPage = lazy(() => import('./pages/DonationThanksPage.jsx'))
const FamilyHeadApprovalPage = lazy(() => import('./pages/FamilyHeadApprovalPage.jsx'))
const PhoneAuthPage = lazy(() => import('./pages/PhoneAuthPage.jsx'))
const FamilyHeadDashboardPage = lazy(() => import('./pages/FamilyHeadDashboardPage.jsx'))
const DonorMePage = lazy(() => import('./pages/DonorMePage.jsx'))
const DonationPrivacyPage = lazy(() => import('./pages/DonationPrivacyPage.jsx'))

// In <Routes>:
<Route path="/m/:slug/donate" element={<DonatePage />} />
<Route path="/m/:slug/donation-thanks" element={<DonationThanksPage />} />
<Route path="/approve/:token" element={<FamilyHeadApprovalPage />} />
<Route path="/auth/phone" element={<PhoneAuthPage />} />
<Route path="/family-head/:memorial" element={<FamilyHeadDashboardPage />} />
<Route path="/donor/me" element={<DonorMePage />} />
<Route path="/privacy/donations" element={<DonationPrivacyPage />} />
```

- [ ] **Step 4: Mount DonatePanel on MemorialPage**

In `src/pages/MemorialPage.jsx`, import `DonatePanel` and render it conditionally:

```jsx
import { DonatePanel } from '../components/donation/DonatePanel.jsx'

// In the JSX, above the guest-book section:
<DonatePanel memorial={memorial} />
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/DonationPrivacyPage.jsx src/i18n/strings/donation.en.js src/App.jsx src/pages/MemorialPage.jsx
git commit -m "feat: register donation routes, privacy notice, mount DonatePanel"
```

---

## Phase 12 — End-to-end tests

### Task 47: Playwright setup + donation-flow.spec.js

**Files:**
- Create: `playwright.config.js`
- Create: `e2e/donation-flow.spec.js`

- [ ] **Step 1: Install and configure Playwright**

```bash
npx playwright install --with-deps
```

Create `playwright.config.js`:

```javascript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
  },
})
```

- [ ] **Step 2: Write donation-flow.spec.js**

```javascript
import { test, expect } from '@playwright/test'

test('anon Ghana donor full happy path with Paystack test mode', async ({ page }) => {
  // Assumes test memorial seeded with donations enabled and Paystack test-mode subaccount
  await page.goto('/m/test-memorial-akua/donate')

  // Step 1: amount
  await page.click('button:has-text("GHS 100.00")')
  await page.click('button:has-text("Continue")')

  // Step 2: donor
  await page.fill('[aria-label="Display name" i], [placeholder="John K."]', 'E2E Tester')
  await page.click('button:has-text("Continue")')

  // Step 3: review → Paystack
  await page.click('button:has-text("Pay with Paystack")')

  // We land on Paystack hosted checkout — use Paystack test card
  // (Cross-domain; Playwright handles this. Assert URL changed.)
  await expect(page).toHaveURL(/checkout\.paystack\.com/, { timeout: 10000 })
})
```

- [ ] **Step 3: Commit**

```bash
git add playwright.config.js e2e/donation-flow.spec.js
git commit -m "test(e2e): add Playwright setup and donation-flow happy path spec"
```

---

### Task 48: family-head-approval + post-donation-claim e2e specs

**Files:**
- Create: `e2e/family-head-approval.spec.js`
- Create: `e2e/post-donation-claim.spec.js`

- [ ] **Step 1: Write family-head-approval.spec.js**

```javascript
import { test, expect } from '@playwright/test'

test('family head invite → SMS link → OTP → approve', async ({ page }) => {
  // This spec uses a known-good approval token seeded for test
  const token = process.env.E2E_APPROVAL_TOKEN
  test.skip(!token, 'requires E2E_APPROVAL_TOKEN env')

  await page.goto(`/approve/${token}`)
  await expect(page.locator('text=family head')).toBeVisible()

  await page.click('button:has-text("Verify with SMS code")')

  // OTP fixture: in test mode worker accepts code "000000"
  for (const digit of '000000') {
    await page.locator('input[aria-label^="Digit"]:not(:focus-visible)').first().pressSequentially(digit)
  }

  await page.click('button:has-text("Verify")')
  await page.click('button:has-text("Approve")')
  await expect(page.locator('text=Approved')).toBeVisible()
})
```

- [ ] **Step 2: Write post-donation-claim.spec.js**

Test flow: donate as anon → on thanks page click "Continue with phone" → enter test phone → enter test OTP → claim succeeds → user can navigate to `/donor/me` and see donation.

- [ ] **Step 3: Commit**

```bash
git add e2e/family-head-approval.spec.js e2e/post-donation-claim.spec.js
git commit -m "test(e2e): add approval and post-donation claim specs"
```

---

## Phase 13 — Documentation & Rollout

### Task 49: Documentation deliverables

**Files:**
- Create: `docs/compliance/donation-rail-pci-scope.md`
- Create: `docs/runbooks/donation-incidents.md`
- Create: `docs/api/donation-api.md`
- Create: `docs/donation-privacy-notice.md`

- [ ] **Step 1: Write `donation-rail-pci-scope.md`**

```markdown
# Donation Rail — PCI DSS Scope (SAQ-A)

**Date:** [implementation date]

## Scope statement

FuneralPress's donation rail is in **SAQ-A scope** (the simplest PCI level for merchants who outsource all card processing).

## Justification

- Cardholder data is **never transmitted to or stored on FuneralPress infrastructure**.
- Donors complete card entry on **Paystack's hosted checkout** (a PCI-DSS Level 1 service provider).
- Our application:
  - Initialises the transaction via Paystack server-to-server (passing only amount, reference, donor email).
  - Receives webhook notifications containing transaction status — never card numbers, CVVs, or expiry dates.
  - Stores Paystack-issued references and metadata, no PAN.
- The redirect URL to Paystack is served from `paystack.co`, not embedded in our origin.

## Annual review

Re-confirm SAQ-A scope every year by:
1. Verifying no PAN appears in any database column or log statement (grep audit).
2. Confirming Paystack remains PCI-DSS Level 1 certified.
3. Reviewing any new payment integration for scope drift.
```

- [ ] **Step 2: Write `donation-incidents.md`**

Include sections for: kill switch activation, refund/dispute procedure, reconciliation mismatch resolution, SMS pumping incident, family-head fraud report. Each section: trigger, immediate response (with exact commands), follow-up actions, communication templates.

- [ ] **Step 3: Write `donation-api.md`**

Public API reference for partners. Document each route from the spec's API Surface section with: endpoint, method, auth, request shape, response shape, error codes, example curl.

- [ ] **Step 4: Write `donation-privacy-notice.md`**

Same content as the in-app `/privacy/donations` page, in markdown form for documentation.

- [ ] **Step 5: Commit**

```bash
git add docs/compliance/donation-rail-pci-scope.md docs/runbooks/donation-incidents.md docs/api/donation-api.md docs/donation-privacy-notice.md
git commit -m "docs: add donation rail compliance, runbook, API reference, privacy notice"
```

---

### Task 50: Rollout — Phase 0 deploy

- [ ] **Step 1: Apply remote D1 migration (with user confirmation)**

```bash
npx wrangler d1 execute funeralpress --remote --file=workers/migrations/migration-donation-rail.sql
npx wrangler d1 execute funeralpress --remote --file=workers/migrations/migration-donation-rail-momo-cooldown.sql
```

- [ ] **Step 2: Deploy `donation-api` worker to staging**

```bash
npx wrangler deploy --config workers/donation-api-wrangler.toml --env staging
```

Verify: feature flags `DONATIONS_ENABLED=false`, `RECONCILIATION_ENABLED=false`. All routes return 503.

- [ ] **Step 3: Deploy updated `auth-api` to staging**

```bash
npx wrangler deploy --config workers/auth-api-wrangler.toml --env staging
```

Verify: `PHONE_AUTH_ENABLED=false`. Phone routes return 503. Existing Google flow still works.

- [ ] **Step 4: Run all CI**

```bash
npm test
npx playwright test --grep-invert @smoke
```

All tests must pass.

- [ ] **Step 5: Document deployment in runbook**

Append a deployment log entry to `docs/runbooks/donation-incidents.md`.

- [ ] **Step 6: Commit any deployment-config changes**

```bash
git add workers/auth-api-wrangler.toml workers/donation-api-wrangler.toml
git commit -m "chore: deploy donation rail to staging (Phase 0)"
```

---

### Task 51: Rollout — Phase 1 internal alpha

- [ ] **Step 1: Enable flags for internal user IDs**

Add a `DONATION_RAIL_ALLOWED_USER_IDS` comma-separated env var to both workers. In each route's gating logic, replace the simple `featureFlag(env, 'DONATIONS_ENABLED')` check with:

```javascript
const allowedIds = (env.DONATION_RAIL_ALLOWED_USER_IDS || '').split(',').filter(Boolean)
const userIsAllowed = allowedIds.includes(String(authUserId))
if (!featureFlag(env, 'DONATIONS_ENABLED') && !userIsAllowed) return error('Not enabled', 503, request)
```

- [ ] **Step 2: Run the manual scenarios from Spec § Phase 1**

Execute every critical-path scenario manually in staging. Record outcomes in a checklist.

- [ ] **Step 3: Bug bash session (2-3h)**

Document found issues, fix, redeploy.

- [ ] **Step 4: End-of-day reconciliation verification**

Manually trigger the cron via `wrangler` and verify zero mismatches.

---

### Task 52: Rollout — Phase 2 closed beta

- [ ] **Step 1: Identify 5 hand-picked families**

Selection criteria: upcoming funeral, willing to use the platform, contactable, mix of denominations and regions.

- [ ] **Step 2: Personal walk-through with each family**

15-minute call. Document feedback.

- [ ] **Step 3: Switch from Paystack test mode to live mode**

Update `PAYSTACK_SECRET_KEY` to live key in production worker secrets. Verify webhook signature also switched to live secret.

- [ ] **Step 4: Daily review for 2 weeks**

Check: donations received, payouts settled, complaints, abandons. Apply stop conditions if triggered.

---

### Task 53: Rollout — Phase 3 public soft-launch

- [ ] **Step 1: Flip global flags**

```bash
npx wrangler secret put DONATIONS_ENABLED --config workers/donation-api-wrangler.toml
# enter "true"
npx wrangler secret put PHONE_AUTH_ENABLED --config workers/auth-api-wrangler.toml
# enter "true"
```

- [ ] **Step 2: Send announcement email to existing users via Resend**

Quiet, dignified copy. Link to a 60-second explainer.

- [ ] **Step 3: 30-day cohort tracking**

Daily admin dashboard review. Pull metrics defined in spec § Success Metrics.

---

### Task 54: Rollout — Phase 4 press & partnerships

- [ ] **Step 1: TechCabal / Graphic Online press push**

Frame as "platform infrastructure for Ghanaian funeral generosity," not SaaS feature.

- [ ] **Step 2: MoFFA outreach update**

Donation rail is now part of partner offering.

- [ ] **Step 3: Denominational partners early look**

Methodist / Catholic / Presbyterian / Pentecostal contacts get demo access.

- [ ] **Step 4: Begin design work on next subsystem (Cultural Template Engine)**

Donation rail enters maintenance.

---

## Self-Review

**Spec coverage check (running through the 1009-line spec):**

✓ Locked decisions 1-9 — all implemented (compliance Model A, optional sign-in with claim, locale display, family-set wall mode, family-head approval, tip model, Termii+Twilio, worker split, KV+D1 storage)
✓ System architecture — Tasks 16, 22, 25 wire the worker topology
✓ Data model — all 5 tables created in Task 1; users column adds; KV extensions written by routes
✓ API surface — every route from the spec is in Tasks 13-15, 18-29
✓ Frontend surface — every page and component listed in spec is in Tasks 31-46
✓ Security & fraud — controls implemented across rate limits (Task 13), MoMo verify (Task 18), token + OTP for approval (Task 20), payout cool-down (Task 21), profanity (Task 22), webhook hardening (Task 25)
✓ Operations — reconciliation (Task 27), feature flags (Task 10, 16), kill switch (Task 45)
✓ Testing — backend tests in every backend task, frontend tests in components, e2e in Tasks 47-48
✓ Rollout — Tasks 50-54 mirror spec phases 0-4
✓ Documentation — Task 49 covers all four spec deliverables

**Placeholder scan:**

- Task 21 step 1 says "or new `donation-settings.test.js`" — minor ambiguity; either path is fine. Implementer chooses.
- Task 33 step 3 says "Similar pattern" for familyHeadStore — replaced below with explicit guidance: "exposing memorial settings load/update + approval/reject actions, mirroring the donationStore structure but for /memorials/:id/donation/settings, /approve, /reject endpoints."
- Task 44 step 1 says "(Pattern follows existing forms in `src/components/`. Forms call ...)" — this is a guidance note, not source code; the implementer must write the components. If you want fully-spelled-out form code, it adds ~150 lines per form; given they follow Tailwind + existing forms idiomatically, this is a reasonable pattern reference rather than a placeholder.
- Task 49 task descriptions say "Include sections for ..." rather than fully writing the runbook content — this is intentional; runbook content depends on operational specifics (Slack channel names, on-call rotation) that should be filled in at implementation time, not pre-specified.

**Type / name consistency check:**

- `donor.visibility` is `'public' | 'anonymous'` on the wire; UI maps `name_amount` and `name_only` both to `'public'`. Consistent across donate-step, charge route, wall.
- `wall_mode` is `'full' | 'names_only' | 'private'` — same in DB, route validation, frontend rendering, response shapes.
- `approval_status` is `'pending' | 'approved' | 'rejected'` — same.
- `donations.status` is `'pending' | 'succeeded' | 'failed' | 'refunded' | 'disputed'` — `'disputed'` added in webhook handler (Task 26) and admin filter (Task 45).
- `phone_otps.purpose` is `'login' | 'link' | 'family_head_approval'` — same in send (Task 13), verify (Task 14), settings cool-down (Task 21), approval (Task 20).
- Function names: `signJWT/verifyJWT` (Task 3), `generateOtp/hashOtp/verifyOtp` (Task 4), `selectProvider/normalisePhone` (Task 5), `sendTermiiSms/sendTermiiOtp` (Task 19, refactored), `sendTwilioSms/sendTwilioOtp` (Task 19), `getFxRate` (Task 8), `containsProfanity` (Task 9), `featureFlag` (Task 10), `logDonationAudit` (Task 11), Paystack `createSubaccount/initialiseTransaction/refundTransaction/listTransactions/resolveAccount/verifyWebhookSignature` (Task 17). All used consistently in subsequent tasks.

**Outstanding implementation questions** (carried from spec § Open Implementation Questions):

1. WhatsApp share asset rendering pipeline — Task 44 implements text-link sharing only; dynamic 1080×1920 PNG is deferred. Frontend-rendered fallback is the default. If dynamic rendering is needed pre-Phase 4, add a Cloudflare Browser Rendering or Workers + Canvas API task between Task 44 and Task 47.
2. Profanity denylist tuning — Task 9 seeds 4 entries; final list must be reviewed by moderation before Phase 3.
3. FX provider — Task 8 uses Open Exchange Rates as default; if rate-limit free tier is exceeded, switch to exchangerate.host.
4. Paystack International — must be enabled on Paystack account before Phase 1 alpha.
5. Resend transactional templates — Task 26 inlines basic HTML; designer should refine before Phase 3.
6. `OTP_KV` — Task 12 creates a dedicated namespace per Open Question 6.
7. `processed_webhooks` table — created in Task 1's migration.
8. Cloudflare Turnstile — not added in v1; Task 30's auto-hide rule is a future hook.

---

**Plan complete. Total: ~54 tasks across 13 phases plus Part 1's 17 tasks → 71 total tasks.**
