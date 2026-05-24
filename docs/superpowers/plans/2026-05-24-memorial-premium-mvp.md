# Memorial Premium MVP (Step 1) Implementation Plan

> **For agentic workers:** steps use checkbox (`- [ ]`) syntax. Backend tasks follow TDD against the existing mock-DB pattern in `workers/__tests__/`.

**Goal:** Let a memorial's creator unlock a one-time "Forever Tribute" premium upgrade (GHS 150) via Paystack, recorded as a per-memorial entitlement, and gate premium features on the memorial page. No video yet (that's MVP step 3). Paystack-only (cards + mobile money; single GHS price for all buyers).

**Architecture:** Mirror the existing one-time payment flow in `auth-api` (`handlePaymentInitialize` → inline PaystackPop on the client → `/payments/verify`, with `handlePaymentWebhook` routing by reference prefix). Premium uses an `fp-premium-` reference prefix and a new `memorial_premium` D1 table owned by `auth-api` (which already has D1 + Paystack + webhook). The memorial page reads entitlement via a public status endpoint and gates features client-side.

**Tech Stack:** Cloudflare Workers (auth-api), D1, Paystack (PaystackPop inline + verify + webhook), React 19, Vitest.

**Pricing:** GHS 150 = `15000` pesewas, one-time, `tier = 'tribute'`.

---

## File structure
- **Create** `workers/migrations/migration-memorial-premium.sql` — the entitlement table.
- **Modify** `workers/auth-api.js` — add `handlePremiumInitialize`, `handlePremiumVerify`, `handlePremiumStatus`; add an `fp-premium-` branch to `handlePaymentWebhook`; register routes.
- **Create** `workers/__tests__/memorial-premium.test.js` — TDD for the three handlers + webhook branch.
- **Modify** `src/utils/memorialApi.js` — `getMemorialPremium(id)`, `initMemorialPremium(id)`, `verifyMemorialPremium(reference)`.
- **Create** `src/components/memorial/UpgradeTributeCard.jsx` — dignified upsell + PaystackPop trigger.
- **Modify** `src/pages/MemorialPage.jsx` — fetch entitlement, gate branding/theme/link, render the upgrade card when not premium.

---

## Task 1: `memorial_premium` D1 table

**File:** Create `workers/migrations/migration-memorial-premium.sql`

```sql
-- Per-memorial one-time premium entitlement (Memorial Premium MVP).
-- Owned by auth-api (has DB + Paystack). memorial_id is the KV memorial id
-- served by brochure-memorial-api. One paid row per memorial; status flips
-- pending -> succeeded on Paystack verify/webhook.
CREATE TABLE IF NOT EXISTS memorial_premium (
  id                  TEXT PRIMARY KEY,
  memorial_id         TEXT NOT NULL,
  tier                TEXT NOT NULL DEFAULT 'tribute',
  status              TEXT NOT NULL DEFAULT 'pending',   -- pending | succeeded | failed
  paystack_reference  TEXT NOT NULL UNIQUE,
  amount_pesewas      INTEGER NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'GHS',
  buyer_user_id       TEXT,
  created_at          INTEGER NOT NULL,
  succeeded_at        INTEGER
);
CREATE INDEX IF NOT EXISTS idx_memorial_premium_memorial ON memorial_premium(memorial_id, status);
CREATE INDEX IF NOT EXISTS idx_memorial_premium_ref ON memorial_premium(paystack_reference);
```

- [ ] Apply locally: `npx wrangler d1 execute funeralpress-db --local --config workers/auth-api-wrangler.toml --file workers/migrations/migration-memorial-premium.sql`
- [ ] Commit migration.

(Remote apply happens at deploy time per the runbook — do NOT auto-run `--remote`.)

## Task 2: `handlePremiumStatus` (public entitlement check) — TDD

Public `GET /memorial-premium/:memorialId` → `{ premium: boolean, tier: string|null }`. Premium = any `succeeded` row for that memorial.

- [ ] Test (mock-DB): succeeded row → `{premium:true,tier:'tribute'}`; no row → `{premium:false,tier:null}`.
- [ ] Implement:
```js
async function handlePremiumStatus(request, env, memorialId) {
  const row = await env.DB.prepare(
    `SELECT tier FROM memorial_premium WHERE memorial_id = ? AND status = 'succeeded' LIMIT 1`
  ).bind(memorialId).first()
  return json({ premium: !!row, tier: row?.tier || null }, 200, request)
}
```
- [ ] Route (public, before auth gate): `const m = path.match(/^\/memorial-premium\/([^/]+)$/); if (method === 'GET' && m) return handlePremiumStatus(request, env, m[1])`
- [ ] Run test → pass. Commit.

## Task 3: `handlePremiumInitialize` (auth required) — TDD

`POST /memorial-premium/initialize` body `{ memorialId }` → pending row + `{ reference, amount, email, currency }` (client opens PaystackPop). Mirrors `handlePaymentInitialize`.

- [ ] Test: valid → inserts pending row with `fp-premium-` reference, returns amount 15000 + user email; missing memorialId → 400; already-succeeded memorial → 409 (`{error:'Already premium'}`).
- [ ] Implement:
```js
const PREMIUM_AMOUNT_PESEWAS = 15000  // GHS 150 one-time "Forever Tribute"

async function handlePremiumInitialize(request, env, userId) {
  const { memorialId } = await request.json().catch(() => ({}))
  if (!memorialId) return error('Missing memorialId', 400, request)

  const existing = await env.DB.prepare(
    `SELECT id FROM memorial_premium WHERE memorial_id = ? AND status = 'succeeded' LIMIT 1`
  ).bind(memorialId).first()
  if (existing) return error('Already premium', 409, request)

  const user = await env.DB.prepare('SELECT id, email FROM users WHERE id = ?').bind(userId).first()
  if (!user) return error('User not found', 404, request)

  const reference = `fp-premium-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  await env.DB.prepare(
    `INSERT INTO memorial_premium (id, memorial_id, tier, status, paystack_reference, amount_pesewas, currency, buyer_user_id, created_at)
     VALUES (?, ?, 'tribute', 'pending', ?, ?, 'GHS', ?, ?)`
  ).bind(generateId(), memorialId, reference, PREMIUM_AMOUNT_PESEWAS, userId, Date.now()).run()

  return json({ reference, amount: PREMIUM_AMOUNT_PESEWAS, email: user.email, currency: 'GHS' }, 200, request)
}
```
- [ ] Route (auth group): `if (method === 'POST' && path === '/memorial-premium/initialize') return handlePremiumInitialize(request, env, userId)`
- [ ] Run test → pass. Commit.

## Task 4: `handlePremiumVerify` (auth) — TDD

`POST /memorial-premium/verify` body `{ reference }` → verify with Paystack, mark `succeeded` (amount-checked, idempotent). Mirrors `handlePaymentVerify`.

- [ ] Test: pending row + Paystack `success` w/ matching amount → row becomes succeeded, `{verified:true,premium:true}`; amount mismatch → 400; already succeeded → `{verified:true}` no-op. (Mock `fetch` for the Paystack verify call.)
- [ ] Implement (mark via a shared helper so the webhook reuses it):
```js
async function markPremiumSucceeded(env, row) {
  if (row.status === 'succeeded') return
  await env.DB.prepare(
    `UPDATE memorial_premium SET status = 'succeeded', succeeded_at = ? WHERE id = ? AND status = 'pending'`
  ).bind(Date.now(), row.id).run()
}

async function handlePremiumVerify(request, env, userId) {
  const { reference } = await request.json().catch(() => ({}))
  if (!reference) return error('Missing reference', 400, request)
  const row = await env.DB.prepare(
    `SELECT * FROM memorial_premium WHERE paystack_reference = ? AND buyer_user_id = ?`
  ).bind(reference, userId).first()
  if (!row) return error('Not found', 404, request)
  if (row.status === 'succeeded') return json({ verified: true, premium: true }, 200, request)

  const psRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
  })
  const psData = await psRes.json()
  if (!psData.status || psData.data?.status !== 'success') {
    await env.DB.prepare("UPDATE memorial_premium SET status = 'failed' WHERE id = ?").bind(row.id).run()
    return error('Payment not successful', 400, request)
  }
  if (psData.data.amount !== row.amount_pesewas) return error('Amount mismatch', 400, request)
  await markPremiumSucceeded(env, row)
  return json({ verified: true, premium: true }, 200, request)
}
```
- [ ] Route (auth group): `if (method === 'POST' && path === '/memorial-premium/verify') return handlePremiumVerify(request, env, userId)`
- [ ] Run test → pass. Commit.

## Task 5: Webhook branch (backstop) — TDD

Extend `handlePaymentWebhook`: after the `fp-print-` branch, add `fp-premium-` handling so entitlement is granted even if the client closes before verify.

- [ ] Test: `charge.success` with `fp-premium-` reference for a pending row → row succeeded.
- [ ] Implement — insert after the `fp-print-` block in `handlePaymentWebhook`:
```js
  if (reference.startsWith('fp-premium-')) {
    const prem = await env.DB.prepare('SELECT * FROM memorial_premium WHERE paystack_reference = ?').bind(reference).first()
    if (prem && prem.status !== 'succeeded' && event.data.amount === prem.amount_pesewas) {
      await markPremiumSucceeded(env, prem)
    }
    return json({ ok: true }, 200, request)
  }
```
- [ ] Run test → pass. Commit.

## Task 6: Frontend — entitlement client + gating + upgrade UI

**Files:** Modify `src/utils/memorialApi.js`; create `src/components/memorial/UpgradeTributeCard.jsx`; modify `src/pages/MemorialPage.jsx`.

- [ ] `memorialApi.js`: add `getMemorialPremium(id)` (GET status, public), `initMemorialPremium(id)` (POST initialize, authed), `verifyMemorialPremium(reference)` (POST verify, authed). Use the existing `apiClient` auth wrapper for the authed calls.
- [ ] `UpgradeTributeCard.jsx` (UI/UX skill applied — dignified black+gold, NOT the tool's "Liquid Glass"):
  - Quiet card rendered **below** the tribute content (`primary-action`: one CTA "Unlock Forever Tribute — GHS 150"; `number-tabular` price; 44px target; focus ring; 150–300ms transitions; `prefers-reduced-motion`).
  - On click: `initMemorialPremium(id)` → open `PaystackPop.setup({ key: VITE_PAYSTACK_PUBLIC_KEY, email, amount, currency:'GHS', reference, onSuccess: () => verifyMemorialPremium(reference).then(refetch) })`. Disable button + spinner during async (`loading-buttons`); success toast (`success-feedback`); error path with retry (`error-recovery`).
  - Requires sign-in: if not logged in, prompt sign-in first (reuse SignInPopover trigger).
- [ ] `MemorialPage.jsx`: fetch `getMemorialPremium(id)` on load; when `premium === true`: hide the "Made with FuneralPress" footer, allow premium themes, show custom-link, render all photos; when false: show `UpgradeTributeCard` + gentle locks on premium-only controls (never hide the base page).
- [ ] Manual browser verify (Playwright): upgrade card renders on a non-premium memorial; not shown when premium; PaystackPop opens (test public key); branding hidden when premium. Commit.

---

## Out of scope (later MVP steps)
- Stripe / diaspora premium pricing (Paystack-only for now; single GHS price).
- AI Tribute Video (MVP step 3 — render-API pipeline).
- Editor-side photo-limit enforcement (display-side gating only for MVP).

## Self-review
- Spec coverage: entitlement table (T1), status (T2), pay init (T3), verify (T4), webhook backstop (T5), frontend gate+UI (T6) — full money path + gating. ✓
- Reuses existing patterns (orders/print-order flow, webhook prefix routing, PaystackPop inline) — no new payment primitives. ✓
- Amount checked on both verify and webhook; idempotent via `markPremiumSucceeded` guard + unique reference. ✓
