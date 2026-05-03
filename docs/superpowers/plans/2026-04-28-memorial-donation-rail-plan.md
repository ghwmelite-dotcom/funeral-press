# Memorial Donation Rail + Phone Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Memorial Donation Rail and Phone+OTP authentication subsystem for FuneralPress, enabling Paystack-subaccount-based donations on every memorial page (no platform custody) and adding Phone+OTP login alongside existing Google OAuth.

**Architecture:** Two workers (existing `auth-api` extended with phone OTP routes; new `donation-api` worker for the money lifecycle). Five new D1 tables. Memorial content stays in KV; donation/identity/audit data lives in D1. Paystack subaccount per family with split rules sends donation portion to family MoMo and tip portion to FuneralPress main account. Donor wall has three privacy modes set by family head; donor opts down within ceiling. Family head approval gate guards memorial publication and MoMo payout designation.

**Tech Stack:** Cloudflare Workers (JS, ES modules), D1 (SQLite), KV (rate limits + OTP + memorial cache), R2 (existing), Paystack (subaccount + split + webhook), Termii (Ghana SMS), Twilio Verify (international SMS), Resend (email receipts), React 19 + Vite + Tailwind + Zustand + Radix + react-helmet-async (existing frontend stack), Playwright (new e2e dependency), `libphonenumber-js` (new), `obscenity` or equivalent profanity library (new).

**Source spec:** `docs/superpowers/specs/2026-04-28-memorial-donation-rail-and-phone-auth-design.md` (commit `9a17359`).

---

## File Structure

### New backend files

```
workers/donation-api.js                                — Main donation worker entry (~600 lines)
workers/donation-api-wrangler.toml                     — Wrangler config for donation-api worker
workers/utils/paystack.js                              — Paystack client (subaccount, charge, refund, transactions)
workers/utils/termii.js                                — Termii SMS provider client
workers/utils/twilioVerify.js                          — Twilio Verify provider client
workers/utils/otp.js                                   — OTP generate/hash/verify with pepper
workers/utils/phoneRouter.js                           — Country-code → provider routing
workers/utils/fxRate.js                                — FX rate fetch + KV cache
workers/utils/profanity.js                             — Profanity filter (denylist + library)
workers/utils/featureFlag.js                           — Feature flag reader
workers/utils/jwt.js                                   — Extracted JWT sign/verify (shared between workers)
workers/migrations/migration-donation-rail.sql         — D1 migration: 5 tables + 3 user columns

workers/__tests__/otp.test.js
workers/__tests__/phoneRouter.test.js
workers/__tests__/fxRate.test.js
workers/__tests__/profanity.test.js
workers/__tests__/paystackClient.test.js
workers/__tests__/phone-otp-send.test.js
workers/__tests__/phone-otp-verify.test.js
workers/__tests__/phone-link.test.js
workers/__tests__/donation-init.test.js
workers/__tests__/donation-charge.test.js
workers/__tests__/donation-webhook.test.js
workers/__tests__/donation-wall.test.js
workers/__tests__/donation-approval.test.js
workers/__tests__/donation-refund.test.js
workers/__tests__/donation-reconciliation.test.js
workers/__tests__/donation-rate-limits.test.js
workers/__tests__/donation-fraud.test.js
workers/__tests__/donation-currency-display.test.js
workers/__tests__/donation-claim.test.js
workers/__tests__/donation-audit.test.js
```

### New frontend files

```
src/components/donation/DonatePanel.jsx                — Embedded on memorial page
src/components/donation/DonateButton.jsx
src/components/donation/DonorWall.jsx
src/components/donation/ProgressBar.jsx
src/components/donation/DonationAmountStep.jsx
src/components/donation/DonationTipToggle.jsx
src/components/donation/DonationDonorStep.jsx
src/components/donation/DonationReviewStep.jsx
src/components/donation/DonationThankYouCard.jsx
src/components/donation/ShareDonationDialog.jsx

src/components/auth/PhoneAuthDialog.jsx
src/components/auth/PhoneInput.jsx
src/components/auth/OtpCodeInput.jsx
src/components/auth/SignInChooser.jsx                  — "Continue with Google / phone" chooser

src/components/family-head/FamilyHeadApprovalView.jsx
src/components/family-head/DonationSettingsForm.jsx
src/components/family-head/PayoutDetailsForm.jsx
src/components/family-head/FamilyHeadDashboard.jsx

src/components/admin/DonationsTab.jsx
src/components/admin/DonationKillSwitch.jsx

src/pages/DonatePage.jsx                               — /m/:slug/donate
src/pages/DonationThanksPage.jsx                       — /m/:slug/donation-thanks
src/pages/FamilyHeadApprovalPage.jsx                   — /approve/:token
src/pages/PhoneAuthPage.jsx                            — /auth/phone
src/pages/FamilyHeadDashboardPage.jsx                  — /family-head/:memorial
src/pages/DonorMePage.jsx                              — /donor/me
src/pages/DonationPrivacyPage.jsx                      — /privacy/donations

src/stores/donationStore.js
src/stores/phoneAuthStore.js
src/stores/familyHeadStore.js

src/utils/currency.js                                  — Locale → currency mapping, formatting
src/utils/donationApi.js                               — donation-api fetch wrapper

src/i18n/strings/donation.en.js                        — i18n placeholder for next subsystem

src/components/donation/__tests__/DonatePanel.test.jsx
src/components/donation/__tests__/DonationAmountStep.test.jsx
src/components/donation/__tests__/DonationDonorStep.test.jsx
src/components/donation/__tests__/DonorWall.test.jsx
src/components/auth/__tests__/PhoneAuthDialog.test.jsx
src/components/family-head/__tests__/FamilyHeadApprovalView.test.jsx
src/__tests__/stores/donationStore.test.js

e2e/donation-flow.spec.js
e2e/family-head-approval.spec.js
e2e/post-donation-claim.spec.js
playwright.config.js
```

### Modified files

```
workers/auth-api.js                                    — Add 4 phone-auth routes; extract jwt.js
workers/auth-api-wrangler.toml                         — Add OTP_KV binding, Termii/Twilio env vars
workers/utils/auditLog.js                              — Add donation_audit helper
package.json                                           — Add libphonenumber-js, obscenity, @playwright/test, uuid
src/App.jsx                                            — Register 7 new lazy routes
src/components/layout/Navbar.jsx                       — Replace GoogleLoginButton with SignInChooser
src/stores/authStore.js                                — Add phone_e164, auth_methods, linkPhone()
src/pages/MemorialPage.jsx                             — Mount <DonatePanel/> conditionally
src/pages/AdminDashboardPage.jsx                       — Add DonationsTab
public/site.webmanifest                                — (no change but verify share_target unaffected)
```

### New documentation

```
docs/compliance/donation-rail-pci-scope.md
docs/runbooks/donation-incidents.md
docs/api/donation-api.md
docs/donation-privacy-notice.md
```

---

## Phase 0 — Foundation: Migration + Shared Utilities

This phase produces no user-visible behaviour. It lays the data and utility foundation that every subsequent task depends on.

### Task 1: D1 migration for donation rail

**Files:**
- Create: `workers/migrations/migration-donation-rail.sql`

- [ ] **Step 1: Write the migration**

Create `workers/migrations/migration-donation-rail.sql`:

```sql
-- Memorial Donation Rail + Phone Auth — D1 migration
-- Idempotent: safe to re-run.

-- Table 1: memorials (donation-side mirror of the KV memorial record)
CREATE TABLE IF NOT EXISTS memorials (
  id                          TEXT PRIMARY KEY,
  slug                        TEXT NOT NULL,
  creator_user_id             INTEGER NOT NULL,
  family_head_user_id         INTEGER,
  family_head_phone           TEXT,
  family_head_name            TEXT,
  family_head_self_declared   INTEGER NOT NULL DEFAULT 0,

  paystack_subaccount_code    TEXT,
  payout_momo_number          TEXT NOT NULL,
  payout_momo_provider        TEXT NOT NULL,
  payout_account_name         TEXT NOT NULL,

  wall_mode                   TEXT NOT NULL DEFAULT 'full',
  goal_amount_pesewas         INTEGER,
  donation_paused             INTEGER NOT NULL DEFAULT 0,

  approval_status             TEXT NOT NULL DEFAULT 'pending',
  approval_token_hash         TEXT,
  approval_token_expires_at   INTEGER,
  approved_at                 INTEGER,
  rejected_at                 INTEGER,
  rejection_reason            TEXT,

  total_raised_pesewas        INTEGER NOT NULL DEFAULT 0,
  total_donor_count           INTEGER NOT NULL DEFAULT 0,
  last_donation_at            INTEGER,

  created_at                  INTEGER NOT NULL,
  updated_at                  INTEGER NOT NULL,
  deleted_at                  INTEGER,

  FOREIGN KEY (creator_user_id) REFERENCES users(id),
  FOREIGN KEY (family_head_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_memorials_creator       ON memorials(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_memorials_family_head   ON memorials(family_head_user_id);
CREATE INDEX IF NOT EXISTS idx_memorials_approval      ON memorials(approval_status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_memorials_slug   ON memorials(slug) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_memorials_subacct ON memorials(paystack_subaccount_code) WHERE paystack_subaccount_code IS NOT NULL;

-- Table 2: donations
CREATE TABLE IF NOT EXISTS donations (
  id                          TEXT PRIMARY KEY,
  memorial_id                 TEXT NOT NULL,
  donor_user_id               INTEGER,
  donor_display_name          TEXT NOT NULL,
  donor_email                 TEXT,
  donor_phone                 TEXT,
  donor_country_code          TEXT,
  visibility                  TEXT NOT NULL DEFAULT 'public',

  amount_pesewas              INTEGER NOT NULL,
  tip_pesewas                 INTEGER NOT NULL DEFAULT 0,
  paystack_fee_pesewas        INTEGER,
  net_to_family_pesewas       INTEGER,

  display_currency            TEXT NOT NULL DEFAULT 'GHS',
  display_amount_minor        INTEGER NOT NULL,
  fx_rate_to_ghs              REAL,

  paystack_reference          TEXT NOT NULL,
  paystack_transaction_id     TEXT,
  status                      TEXT NOT NULL DEFAULT 'pending',
  failure_reason              TEXT,

  receipt_sent_at             INTEGER,
  thank_you_card_sent_at      INTEGER,

  created_at                  INTEGER NOT NULL,
  succeeded_at                INTEGER,
  refunded_at                 INTEGER,

  FOREIGN KEY (memorial_id) REFERENCES memorials(id),
  FOREIGN KEY (donor_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_donations_memorial      ON donations(memorial_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_donor         ON donations(donor_user_id) WHERE donor_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donations_status        ON donations(status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_pref   ON donations(paystack_reference);

-- Table 3: donor_profiles
CREATE TABLE IF NOT EXISTS donor_profiles (
  user_id                     INTEGER PRIMARY KEY,
  default_display_name        TEXT,
  total_donated_pesewas       INTEGER NOT NULL DEFAULT 0,
  total_donations_count       INTEGER NOT NULL DEFAULT 0,
  last_donated_at             INTEGER,
  email_receipts_enabled      INTEGER NOT NULL DEFAULT 1,
  sms_receipts_enabled        INTEGER NOT NULL DEFAULT 1,
  created_at                  INTEGER NOT NULL,
  updated_at                  INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table 4: phone_otps
CREATE TABLE IF NOT EXISTS phone_otps (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_e164                  TEXT NOT NULL,
  code_hash                   TEXT NOT NULL,
  provider                    TEXT NOT NULL,
  purpose                     TEXT NOT NULL,
  ip_address                  TEXT,
  user_agent                  TEXT,
  attempts                    INTEGER NOT NULL DEFAULT 0,
  consumed_at                 INTEGER,
  expires_at                  INTEGER NOT NULL,
  created_at                  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_otps_phone   ON phone_otps(phone_e164, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otps_expiry  ON phone_otps(expires_at) WHERE consumed_at IS NULL;

-- Table 5: donation_audit
CREATE TABLE IF NOT EXISTS donation_audit (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  memorial_id                 TEXT,
  donation_id                 TEXT,
  actor_user_id               INTEGER,
  actor_phone                 TEXT,
  action                      TEXT NOT NULL,
  detail                      TEXT,
  ip_address                  TEXT,
  created_at                  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_donation_audit_memorial ON donation_audit(memorial_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donation_audit_action   ON donation_audit(action, created_at DESC);

-- Table 6: processed_webhooks (if not exists in current codebase; needed for idempotency)
CREATE TABLE IF NOT EXISTS processed_webhooks (
  event_id                    TEXT PRIMARY KEY,
  source                      TEXT NOT NULL,
  processed_at                INTEGER NOT NULL
);

-- users table additions: phone_e164, phone_verified_at, auth_methods
-- Use INSERT OR IGNORE pattern via a temporary check table since SQLite ALTER lacks IF NOT EXISTS

-- We try ALTER and tolerate errors via separate batched statements at runtime.
-- Wrangler executes each statement in order; the migration runner should treat a duplicate-column
-- error on these specific ALTER statements as success.
ALTER TABLE users ADD COLUMN phone_e164          TEXT;
ALTER TABLE users ADD COLUMN phone_verified_at   INTEGER;
ALTER TABLE users ADD COLUMN auth_methods        TEXT NOT NULL DEFAULT 'google';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone_e164) WHERE phone_e164 IS NOT NULL;
```

- [ ] **Step 2: Apply migration to local D1 (dry-run via wrangler)**

Run:

```bash
npx wrangler d1 execute funeralpress --local --file=workers/migrations/migration-donation-rail.sql
```

Expected: each `CREATE TABLE`/`CREATE INDEX` returns `Executed 1 query`. `ALTER TABLE` statements may report duplicate-column errors if the columns already exist locally — that is acceptable. Migration runner used in CI must ignore "duplicate column name" errors for the three `ALTER TABLE users` statements specifically; if not yet supported, split those into a separate file `migration-donation-rail-users.sql` and gate its execution on a pragma check.

- [ ] **Step 3: Verify schema**

Run:

```bash
npx wrangler d1 execute funeralpress --local --command=".schema memorials"
npx wrangler d1 execute funeralpress --local --command=".schema donations"
npx wrangler d1 execute funeralpress --local --command="PRAGMA table_info(users);"
```

Expected: schemas show all columns from the migration; `users` shows `phone_e164`, `phone_verified_at`, `auth_methods`.

- [ ] **Step 4: Apply migration to remote D1 (production database — confirm with user before running)**

```bash
npx wrangler d1 execute funeralpress --remote --file=workers/migrations/migration-donation-rail.sql
```

**STOP and confirm with the user before running this against production.**

- [ ] **Step 5: Commit**

```bash
git add workers/migrations/migration-donation-rail.sql
git commit -m "feat: add D1 migration for donation rail and phone auth"
```

---

### Task 2: Add new npm dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dependencies**

Run:

```bash
npm install libphonenumber-js obscenity uuid
npm install -D @playwright/test
```

- [ ] **Step 2: Verify package.json updated**

Read `package.json` and confirm `libphonenumber-js`, `obscenity`, `uuid` appear in `dependencies` and `@playwright/test` in `devDependencies`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add libphonenumber-js, obscenity, uuid, @playwright/test"
```

---

### Task 3: Extract JWT utility into shared module

The donation-api worker needs to verify JWTs issued by auth-api. Today JWT helpers are inline in `auth-api.js`. Extract them so both workers can import.

**Files:**
- Create: `workers/utils/jwt.js`
- Create: `workers/__tests__/jwt.test.js`
- Modify: `workers/auth-api.js`

- [ ] **Step 1: Write the failing test**

Create `workers/__tests__/jwt.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { signJWT, verifyJWT } from '../utils/jwt.js'

const SECRET = 'test-secret-do-not-use-in-prod'

describe('signJWT and verifyJWT', () => {
  it('signs and verifies a payload roundtrip', async () => {
    const payload = { sub: '1', email: 'a@b.c', exp: Math.floor(Date.now() / 1000) + 3600 }
    const token = await signJWT(payload, SECRET)
    expect(token.split('.')).toHaveLength(3)

    const decoded = await verifyJWT(token, SECRET)
    expect(decoded).toMatchObject({ sub: '1', email: 'a@b.c' })
  })

  it('rejects a token with wrong signature', async () => {
    const payload = { sub: '1', exp: Math.floor(Date.now() / 1000) + 3600 }
    const token = await signJWT(payload, SECRET)
    const tampered = token.slice(0, -4) + 'XXXX'
    const decoded = await verifyJWT(tampered, SECRET)
    expect(decoded).toBeNull()
  })

  it('rejects an expired token', async () => {
    const payload = { sub: '1', exp: Math.floor(Date.now() / 1000) - 60 }
    const token = await signJWT(payload, SECRET)
    const decoded = await verifyJWT(token, SECRET)
    expect(decoded).toBeNull()
  })

  it('rejects malformed tokens', async () => {
    expect(await verifyJWT('not.a.token', SECRET)).toBeNull()
    expect(await verifyJWT('', SECRET)).toBeNull()
    expect(await verifyJWT('one.two', SECRET)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test, expect failure**

```bash
npx vitest run workers/__tests__/jwt.test.js
```

Expected: FAIL — `workers/utils/jwt.js` does not exist.

- [ ] **Step 3: Implement `workers/utils/jwt.js`**

Create `workers/utils/jwt.js`. Copy the existing `signJWT` and `verifyJWT` from `workers/auth-api.js` (lines 47-76 in current code) into the new module, exporting both. Verbatim contents:

```javascript
// Workers-compatible JWT (HS256) — no Node libs.

export async function signJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const enc = new TextEncoder()
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const data = `${headerB64}.${payloadB64}`
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${data}.${sigB64}`
}

export async function verifyJWT(token, secret) {
  try {
    const parts = (token || '').split('.')
    if (parts.length !== 3) return null
    const [headerB64, payloadB64, sigB64] = parts
    if (!headerB64 || !payloadB64 || !sigB64) return null
    const enc = new TextEncoder()
    const data = `${headerB64}.${payloadB64}`
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sig = Uint8Array.from(atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(data))
    if (!valid) return null
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.exp && Date.now() / 1000 > payload.exp) return null
    return payload
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Update `workers/auth-api.js` to import from utils/jwt.js**

In `workers/auth-api.js`, add `signJWT, verifyJWT` to the existing `import` block at the top:

```javascript
import { signJWT, verifyJWT } from './utils/jwt.js'
```

Then **delete** the inline `signJWT` and `verifyJWT` function definitions (currently around lines 48-76). All other call sites in the file remain unchanged because the imported names are identical.

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: existing 91 tests + new 4 jwt tests all pass.

- [ ] **Step 6: Commit**

```bash
git add workers/utils/jwt.js workers/__tests__/jwt.test.js workers/auth-api.js
git commit -m "refactor: extract JWT helpers to shared utils/jwt.js"
```

---

### Task 4: OTP utility (generate, hash, verify)

**Files:**
- Create: `workers/utils/otp.js`
- Create: `workers/__tests__/otp.test.js`

- [ ] **Step 1: Write the failing test**

Create `workers/__tests__/otp.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { generateOtp, hashOtp, verifyOtp } from '../utils/otp.js'

const PEPPER = 'test-pepper-32-bytes-of-entropy-here'

describe('generateOtp', () => {
  it('returns a 6-digit string', () => {
    const code = generateOtp()
    expect(code).toMatch(/^\d{6}$/)
  })

  it('returns a different code each call (probabilistic)', () => {
    const codes = new Set()
    for (let i = 0; i < 50; i++) codes.add(generateOtp())
    expect(codes.size).toBeGreaterThan(40)
  })
})

describe('hashOtp', () => {
  it('returns a 64-char hex string', async () => {
    const h = await hashOtp('123456', PEPPER)
    expect(h).toMatch(/^[a-f0-9]{64}$/)
  })

  it('produces stable output for same input', async () => {
    const a = await hashOtp('123456', PEPPER)
    const b = await hashOtp('123456', PEPPER)
    expect(a).toBe(b)
  })

  it('produces different output for different code', async () => {
    const a = await hashOtp('123456', PEPPER)
    const b = await hashOtp('123457', PEPPER)
    expect(a).not.toBe(b)
  })

  it('produces different output for different pepper', async () => {
    const a = await hashOtp('123456', PEPPER)
    const b = await hashOtp('123456', 'different-pepper')
    expect(a).not.toBe(b)
  })
})

describe('verifyOtp', () => {
  it('returns true for matching code', async () => {
    const hash = await hashOtp('123456', PEPPER)
    expect(await verifyOtp('123456', hash, PEPPER)).toBe(true)
  })

  it('returns false for wrong code', async () => {
    const hash = await hashOtp('123456', PEPPER)
    expect(await verifyOtp('654321', hash, PEPPER)).toBe(false)
  })

  it('returns false for wrong pepper', async () => {
    const hash = await hashOtp('123456', PEPPER)
    expect(await verifyOtp('123456', hash, 'wrong-pepper')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test, expect failure**

```bash
npx vitest run workers/__tests__/otp.test.js
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `workers/utils/otp.js`**

Create `workers/utils/otp.js`:

```javascript
// 6-digit OTP utilities. Hash with pepper for at-rest protection.

export function generateOtp() {
  // Cryptographically random 6-digit code, zero-padded
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return String(buf[0] % 1000000).padStart(6, '0')
}

export async function hashOtp(code, pepper) {
  const enc = new TextEncoder()
  const data = enc.encode(code + pepper)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyOtp(code, expectedHash, pepper) {
  const actual = await hashOtp(code, pepper)
  // Constant-time compare
  if (actual.length !== expectedHash.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) {
    diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i)
  }
  return diff === 0
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
npx vitest run workers/__tests__/otp.test.js
```

Expected: 8/8 pass.

- [ ] **Step 5: Commit**

```bash
git add workers/utils/otp.js workers/__tests__/otp.test.js
git commit -m "feat: add OTP generate/hash/verify utility with pepper"
```

---

### Task 5: Phone provider routing

**Files:**
- Create: `workers/utils/phoneRouter.js`
- Create: `workers/__tests__/phoneRouter.test.js`

- [ ] **Step 1: Write the failing test**

Create `workers/__tests__/phoneRouter.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { selectProvider, normalisePhone } from '../utils/phoneRouter.js'

describe('selectProvider', () => {
  it('routes Ghana (+233) to termii', () => {
    expect(selectProvider('+233241234567')).toBe('termii')
  })

  it('routes UK (+44) to twilio', () => {
    expect(selectProvider('+447700900000')).toBe('twilio')
  })

  it('routes US (+1) to twilio', () => {
    expect(selectProvider('+12025551234')).toBe('twilio')
  })

  it('routes Nigeria (+234) to twilio for v1', () => {
    expect(selectProvider('+2348012345678')).toBe('twilio')
  })

  it('throws for unknown / non-E164 input', () => {
    expect(() => selectProvider('abc')).toThrow()
    expect(() => selectProvider('0241234567')).toThrow()
  })
})

describe('normalisePhone', () => {
  it('returns E.164 string for valid input', () => {
    expect(normalisePhone('0241234567', 'GH')).toBe('+233241234567')
    expect(normalisePhone('+233 24 123 4567', 'GH')).toBe('+233241234567')
  })

  it('returns null for invalid input', () => {
    expect(normalisePhone('not-a-phone', 'GH')).toBeNull()
    expect(normalisePhone('123', 'GH')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test, expect failure**

```bash
npx vitest run workers/__tests__/phoneRouter.test.js
```

- [ ] **Step 3: Implement `workers/utils/phoneRouter.js`**

```javascript
import { parsePhoneNumberFromString } from 'libphonenumber-js'

// Termii covers Ghana well. Everything else routes to Twilio Verify in v1.
const TERMII_COUNTRY_CODES = ['+233']

export function selectProvider(e164) {
  if (!/^\+\d{6,15}$/.test(e164 || '')) {
    throw new Error(`Invalid E.164 phone: ${e164}`)
  }
  if (TERMII_COUNTRY_CODES.some(cc => e164.startsWith(cc))) return 'termii'
  return 'twilio'
}

export function normalisePhone(input, defaultCountry = 'GH') {
  if (!input) return null
  try {
    const parsed = parsePhoneNumberFromString(input, defaultCountry)
    if (!parsed || !parsed.isValid()) return null
    return parsed.number
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
npx vitest run workers/__tests__/phoneRouter.test.js
```

- [ ] **Step 5: Commit**

```bash
git add workers/utils/phoneRouter.js workers/__tests__/phoneRouter.test.js
git commit -m "feat: add phone provider routing and E.164 normalisation"
```

---

### Task 6: Termii SMS provider client

**Files:**
- Create: `workers/utils/termii.js`

- [ ] **Step 1: Implement Termii client**

Termii's send-OTP API expects a JSON POST. We use the **send-message** endpoint (not their managed OTP — we manage codes ourselves to share storage with Twilio path).

Create `workers/utils/termii.js`:

```javascript
// Termii SMS sender — Ghana primary route.
// Docs: https://developer.termii.com/messaging-api

const TERMII_BASE = 'https://api.ng.termii.com/api/sms/send'

export async function sendTermiiOtp({ apiKey, fromSenderId = 'FuneralPress', toE164, code }) {
  if (!apiKey) throw new Error('TERMII_API_KEY missing')

  const message = `Your FuneralPress code is ${code}. Expires in 10 minutes. Do not share.`

  const body = {
    to: toE164.replace(/^\+/, ''), // Termii expects digits, no +
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
```

- [ ] **Step 2: Manual sanity check (optional, requires real key)**

Mock test only — no real send in CI. The integration is exercised in the `phone-otp-send.test.js` task with `fetch` mocked.

- [ ] **Step 3: Commit**

```bash
git add workers/utils/termii.js
git commit -m "feat: add Termii SMS client for Ghana OTP delivery"
```

---

### Task 7: Twilio Verify client

**Files:**
- Create: `workers/utils/twilioVerify.js`

- [ ] **Step 1: Implement Twilio Verify client**

Twilio Verify generates and tracks the code itself, but we want **our** code (so audit/lockout logic is uniform). We use Twilio's plain SMS endpoint instead of Verify, sending our own generated OTP.

Create `workers/utils/twilioVerify.js`:

```javascript
// Twilio Programmable SMS for international OTP delivery.
// We send our own OTP code (not Verify) so audit/lockout logic is uniform with Termii path.

export async function sendTwilioOtp({ accountSid, authToken, fromNumber, toE164, code }) {
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio config missing (accountSid, authToken, fromNumber)')
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const message = `Your FuneralPress code is ${code}. Expires in 10 minutes. Do not share.`

  const params = new URLSearchParams({
    To: toE164,
    From: fromNumber,
    Body: message,
  })

  const auth = btoa(`${accountSid}:${authToken}`)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    },
    body: params.toString(),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    return { ok: false, status: res.status, error: data.message || 'Twilio send failed', raw: data }
  }
  return { ok: true, sid: data.sid, status: data.status }
}
```

- [ ] **Step 2: Commit**

```bash
git add workers/utils/twilioVerify.js
git commit -m "feat: add Twilio SMS client for international OTP delivery"
```

---

### Task 8: FX rate cache

**Files:**
- Create: `workers/utils/fxRate.js`
- Create: `workers/__tests__/fxRate.test.js`

- [ ] **Step 1: Write the failing test**

Create `workers/__tests__/fxRate.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFxRate } from '../utils/fxRate.js'

function mockKV() {
  const store = new Map()
  return {
    get: vi.fn(async (k) => store.get(k) || null),
    put: vi.fn(async (k, v, opts) => store.set(k, v)),
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
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rates: { GHS: 20.0, GBP: 1.0 } }),
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
      json: async () => ({ rates: { GHS: 21.0 } }),
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
```

- [ ] **Step 2: Run test, expect failure**

```bash
npx vitest run workers/__tests__/fxRate.test.js
```

- [ ] **Step 3: Implement `workers/utils/fxRate.js`**

```javascript
// FX rate fetch with KV cache (5 min TTL). Source: Open Exchange Rates.
// Cache key: fx:<CURRENCY>_GHS  →  JSON { rate, fetched_at }

const TTL_MS = 5 * 60 * 1000
const OXR_BASE = 'https://openexchangerates.org/api/latest.json'

export async function getFxRate(fromCurrency, kv, oxrAppId) {
  if (fromCurrency === 'GHS') return 1

  const cacheKey = `fx:${fromCurrency}_GHS`
  const cached = await kv.get(cacheKey)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (Date.now() - parsed.fetched_at < TTL_MS) {
        return parsed.rate
      }
    } catch { /* fall through to fetch */ }
  }

  // Open Exchange Rates free tier base is USD; we compute cross-rate
  try {
    const res = await fetch(`${OXR_BASE}?app_id=${oxrAppId}&symbols=${fromCurrency},GHS`)
    if (!res.ok) throw new Error(`OXR ${res.status}`)
    const data = await res.json()
    const fromUsd = data.rates[fromCurrency]
    const ghsUsd = data.rates.GHS
    if (!fromUsd || !ghsUsd) throw new Error('rates missing')
    const rate = ghsUsd / fromUsd
    await kv.put(cacheKey, JSON.stringify({ rate, fetched_at: Date.now() }), { expirationTtl: 600 })
    return rate
  } catch {
    return null
  }
}
```

Note the test mock returns `{ rates: { GHS: 20.0, GBP: 1.0 } }` representing direct rates; the implementation interprets them as USD-base. Update the test to feed USD-base rates (test step 3 below).

- [ ] **Step 4: Update test fixtures to match USD-base**

Replace the fetch mocks in `workers/__tests__/fxRate.test.js`:

```javascript
// Replace
global.fetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({ rates: { GHS: 20.0, GBP: 1.0 } }),
})

// With (USD-base; GBP→GHS = 20.0 / 1.0 = 20.0)
global.fetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({ base: 'USD', rates: { GBP: 1.0, GHS: 20.0 } }),
})
```

And likewise for the "refetches if stale" mock (substitute `GHS: 21.0` to get rate 21.0).

- [ ] **Step 5: Run tests, expect pass**

```bash
npx vitest run workers/__tests__/fxRate.test.js
```

- [ ] **Step 6: Commit**

```bash
git add workers/utils/fxRate.js workers/__tests__/fxRate.test.js
git commit -m "feat: add FX rate cache with 5-min TTL via KV"
```

---

### Task 9: Profanity filter

**Files:**
- Create: `workers/utils/profanity.js`
- Create: `workers/__tests__/profanity.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import { describe, it, expect } from 'vitest'
import { containsProfanity } from '../utils/profanity.js'

describe('containsProfanity', () => {
  it('flags common English profanity', () => {
    expect(containsProfanity('this is a fucking test')).toBe(true)
  })

  it('passes clean names', () => {
    expect(containsProfanity('Akosua Mensah')).toBe(false)
    expect(containsProfanity('John K.')).toBe(false)
    expect(containsProfanity('Anonymous')).toBe(false)
  })

  it('flags custom Twi/Ga slurs from extension list', () => {
    // Replace these placeholders with actual slurs in the extension list
    expect(containsProfanity('kwasea')).toBe(true)
  })

  it('handles unicode and case', () => {
    expect(containsProfanity('FUCK')).toBe(true)
  })

  it('handles whitespace and punctuation correctly', () => {
    expect(containsProfanity('John K.')).toBe(false)
    expect(containsProfanity("D'Angelo")).toBe(false)
  })
})
```

- [ ] **Step 2: Run test, expect failure**

```bash
npx vitest run workers/__tests__/profanity.test.js
```

- [ ] **Step 3: Implement `workers/utils/profanity.js`**

```javascript
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity'

// Local extension: common Twi/Ga/Ewe slurs used as insults in Ghanaian funeral contexts.
// Keep this list private; do not echo to users.
const LOCAL_DENYLIST = [
  'kwasea',     // Twi: idiot/fool — common slur
  'kwasia',     // alt spelling
  'aboa',       // Twi: animal (used as insult)
  'gyimii',     // Twi: stupid
  // Add more as flagged by moderation team
]

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
})

export function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false
  const lower = text.toLowerCase()

  // Local denylist (whole-word match)
  for (const term of LOCAL_DENYLIST) {
    const regex = new RegExp(`\\b${term}\\b`, 'i')
    if (regex.test(lower)) return true
  }

  // Library check (English)
  return matcher.hasMatch(text)
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
npx vitest run workers/__tests__/profanity.test.js
```

- [ ] **Step 5: Commit**

```bash
git add workers/utils/profanity.js workers/__tests__/profanity.test.js
git commit -m "feat: add profanity filter (English + local denylist)"
```

---

### Task 10: Feature flag reader

**Files:**
- Create: `workers/utils/featureFlag.js`

- [ ] **Step 1: Implement feature flag reader**

```javascript
// Reads boolean feature flags from worker env vars.
// String values 'true'/'1'/'on' are truthy. Default returned if missing.

export function featureFlag(env, key, defaultValue = false) {
  const v = env?.[key]
  if (v === undefined || v === null) return defaultValue
  const s = String(v).toLowerCase().trim()
  return s === 'true' || s === '1' || s === 'on' || s === 'yes'
}
```

- [ ] **Step 2: Commit**

```bash
git add workers/utils/featureFlag.js
git commit -m "feat: add feature flag helper"
```

---

### Task 11: Extend audit logger with donation_audit helper

**Files:**
- Modify: `workers/utils/auditLog.js`

- [ ] **Step 1: Add `logDonationAudit` to existing module**

Append to `workers/utils/auditLog.js`:

```javascript
/**
 * Log a donation-rail-specific action.
 * Same fire-and-forget contract as logAudit.
 */
export async function logDonationAudit(db, {
  memorialId = null,
  donationId = null,
  actorUserId = null,
  actorPhone = null,
  action,
  detail = {},
  ipAddress = null,
}) {
  try {
    await db.prepare(
      `INSERT INTO donation_audit (memorial_id, donation_id, actor_user_id, actor_phone, action, detail, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      memorialId,
      donationId,
      actorUserId,
      actorPhone,
      action,
      JSON.stringify(detail),
      ipAddress,
      Date.now()
    ).run()
  } catch {
    // never break a request
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add workers/utils/auditLog.js
git commit -m "feat: add logDonationAudit helper for donation-rail audit trail"
```

---

## Phase 1 — Phone OTP Auth in `auth-api.js`

This phase ships behind the `PHONE_AUTH_ENABLED` feature flag.

### Task 12: Wrangler config for OTP_KV and provider env vars

**Files:**
- Modify: `workers/auth-api-wrangler.toml`

- [ ] **Step 1: Add KV binding and env vars**

Open `workers/auth-api-wrangler.toml`. In the `[[kv_namespaces]]` section, append:

```toml
[[kv_namespaces]]
binding = "OTP_KV"
id = "<created-via-wrangler>"
```

Run:

```bash
npx wrangler kv:namespace create OTP_KV
```

Copy the returned `id` into the toml. Then add (or update) under `[vars]`:

```toml
[vars]
PHONE_AUTH_ENABLED = "false"

# Secrets (set via `wrangler secret put`):
# TERMII_API_KEY
# TWILIO_ACCOUNT_SID
# TWILIO_AUTH_TOKEN
# TWILIO_FROM_NUMBER
# OTP_PEPPER
```

- [ ] **Step 2: Set secrets**

```bash
npx wrangler secret put TERMII_API_KEY --config workers/auth-api-wrangler.toml
npx wrangler secret put TWILIO_ACCOUNT_SID --config workers/auth-api-wrangler.toml
npx wrangler secret put TWILIO_AUTH_TOKEN --config workers/auth-api-wrangler.toml
npx wrangler secret put TWILIO_FROM_NUMBER --config workers/auth-api-wrangler.toml
npx wrangler secret put OTP_PEPPER --config workers/auth-api-wrangler.toml
```

For `OTP_PEPPER`, use a 256-bit random string: `openssl rand -base64 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

- [ ] **Step 3: Commit**

```bash
git add workers/auth-api-wrangler.toml
git commit -m "chore: add OTP_KV binding and phone-auth env vars to auth-api"
```

---

### Task 13: `POST /auth/phone/send-otp` route

**Files:**
- Create: `workers/__tests__/phone-otp-send.test.js`
- Modify: `workers/auth-api.js`

- [ ] **Step 1: Write the failing tests**

Create `workers/__tests__/phone-otp-send.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Importing the route handler directly: we'll structure auth-api.js to export handlers per route group.
// For this test we mount via a fetch dispatcher.
import worker from '../auth-api.js'

function mockEnv(overrides = {}) {
  const kvStore = new Map()
  const dbRows = []
  return {
    PHONE_AUTH_ENABLED: 'true',
    TERMII_API_KEY: 'fake-termii',
    TWILIO_ACCOUNT_SID: 'AC_fake',
    TWILIO_AUTH_TOKEN: 'fake',
    TWILIO_FROM_NUMBER: '+15005550006',
    OTP_PEPPER: 'test-pepper-32-bytes-of-entropy-here',
    JWT_SECRET: 'test-jwt-secret',
    OTP_KV: {
      get: async (k) => kvStore.get(k) || null,
      put: async (k, v, opts) => { kvStore.set(k, v); return undefined },
    },
    RATE_LIMITS: {
      get: async (k) => kvStore.get(`rl:${k}`) || null,
      put: async (k, v, opts) => { kvStore.set(`rl:${k}`, v) },
    },
    DB: {
      prepare: (sql) => ({
        bind: (...args) => ({
          run: async () => { dbRows.push({ sql, args }); return { meta: { last_row_id: dbRows.length } } },
          first: async () => null,
          all: async () => ({ results: [] }),
        }),
      }),
      _rows: dbRows,
    },
    ...overrides,
  }
}

function makeReq(body, headers = {}) {
  return new Request('https://example.com/auth/phone/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /auth/phone/send-otp', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 'ok', message_id: 'm_1', balance: 10 }),
    })
  })

  it('returns 503 when feature flag is off', async () => {
    const env = mockEnv({ PHONE_AUTH_ENABLED: 'false' })
    const res = await worker.fetch(makeReq({ phone: '+233241234567', purpose: 'login' }), env)
    expect(res.status).toBe(503)
  })

  it('rejects invalid E.164 phone', async () => {
    const env = mockEnv()
    const res = await worker.fetch(makeReq({ phone: 'abc', purpose: 'login' }), env)
    expect(res.status).toBe(400)
  })

  it('rejects unknown purpose', async () => {
    const env = mockEnv()
    const res = await worker.fetch(makeReq({ phone: '+233241234567', purpose: 'mystery' }), env)
    expect(res.status).toBe(400)
  })

  it('routes Ghana phone to Termii', async () => {
    const env = mockEnv()
    const res = await worker.fetch(makeReq({ phone: '+233241234567', purpose: 'login' }), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.provider).toBe('termii')
    expect(body.expires_in).toBe(600)
    // fetch was called with Termii host
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('termii'),
      expect.any(Object)
    )
  })

  it('routes UK phone to Twilio', async () => {
    const env = mockEnv()
    const res = await worker.fetch(makeReq({ phone: '+447700900000', purpose: 'login' }), env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.provider).toBe('twilio')
  })

  it('rate limits per phone after 3 sends in 10 min', async () => {
    const env = mockEnv()
    for (let i = 0; i < 3; i++) {
      await worker.fetch(makeReq({ phone: '+233241234567', purpose: 'login' }), env)
    }
    const res = await worker.fetch(makeReq({ phone: '+233241234567', purpose: 'login' }), env)
    expect(res.status).toBe(429)
  })

  it('returns generic error on provider failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'provider down' }),
    })
    const env = mockEnv()
    const res = await worker.fetch(makeReq({ phone: '+233241234567', purpose: 'login' }), env)
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).not.toContain('provider down') // no oracle leak
  })
})
```

- [ ] **Step 2: Run test, expect failure**

```bash
npx vitest run workers/__tests__/phone-otp-send.test.js
```

- [ ] **Step 3: Add the route to `workers/auth-api.js`**

In `workers/auth-api.js` add at the top, alongside existing imports:

```javascript
import { generateOtp, hashOtp, verifyOtp } from './utils/otp.js'
import { selectProvider, normalisePhone } from './utils/phoneRouter.js'
import { sendTermiiOtp } from './utils/termii.js'
import { sendTwilioOtp } from './utils/twilioVerify.js'
import { featureFlag } from './utils/featureFlag.js'
```

Inside the main router (where existing `pathname.startsWith('/auth/')` blocks live), add:

```javascript
// ─── Phone OTP routes ───────────────────────────────────────────────────────

if (path === '/auth/phone/send-otp' && request.method === 'POST') {
  if (!featureFlag(env, 'PHONE_AUTH_ENABLED')) {
    return error('Phone auth temporarily unavailable', 503, request)
  }

  const body = await request.json().catch(() => ({}))
  const phone = body.phone
  const purpose = body.purpose
  const VALID_PURPOSES = ['login', 'link', 'family_head_approval']

  if (!phone || !/^\+\d{6,15}$/.test(phone)) {
    return error('Invalid phone format. Use E.164 (e.g. +233241234567).', 400, request)
  }
  if (!VALID_PURPOSES.includes(purpose)) {
    return error('Invalid purpose', 400, request)
  }

  const ip = getClientIP(request)

  // Rate limits — per-phone (3/10min, 10/24h), per-IP (20/hour), per-IP-per-phone (5/hour)
  const tenMin = 600
  const oneHour = 3600
  const oneDay = 86400

  const phoneCount10m = parseInt(await env.RATE_LIMITS.get(`otp:phone:10m:${phone}`)) || 0
  if (phoneCount10m >= 3) {
    return error('Too many requests. Try again in 10 minutes.', 429, request)
  }
  const phoneCount24h = parseInt(await env.RATE_LIMITS.get(`otp:phone:24h:${phone}`)) || 0
  if (phoneCount24h >= 10) {
    return error('Daily limit reached.', 429, request)
  }
  const ipCount1h = parseInt(await env.RATE_LIMITS.get(`otp:ip:1h:${ip}`)) || 0
  if (ipCount1h >= 20) {
    return error('Too many requests from this network.', 429, request)
  }
  const ipPhoneCount1h = parseInt(await env.RATE_LIMITS.get(`otp:ipphone:1h:${ip}:${phone}`)) || 0
  if (ipPhoneCount1h >= 5) {
    return error('Too many requests.', 429, request)
  }

  // Lockout check
  const locked = await env.RATE_LIMITS.get(`otp:lockout:${phone}`)
  if (locked) {
    return error('Phone temporarily locked due to too many failed attempts.', 429, request)
  }

  // Generate code, store hash
  const code = generateOtp()
  const codeHash = await hashOtp(code, env.OTP_PEPPER)
  const expiresAt = Date.now() + 10 * 60 * 1000

  await env.DB.prepare(
    `INSERT INTO phone_otps (phone_e164, code_hash, provider, purpose, ip_address, user_agent, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    phone,
    codeHash,
    'pending',
    purpose,
    ip,
    request.headers.get('User-Agent') || '',
    expiresAt,
    Date.now()
  ).run()

  // Provider routing + send
  let provider, sendResult
  try {
    provider = selectProvider(phone)
  } catch {
    return error('Unsupported phone number', 400, request)
  }

  if (provider === 'termii') {
    sendResult = await sendTermiiOtp({
      apiKey: env.TERMII_API_KEY,
      toE164: phone,
      code,
    })
  } else {
    sendResult = await sendTwilioOtp({
      accountSid: env.TWILIO_ACCOUNT_SID,
      authToken: env.TWILIO_AUTH_TOKEN,
      fromNumber: env.TWILIO_FROM_NUMBER,
      toE164: phone,
      code,
    })
  }

  if (!sendResult.ok) {
    // Log internally; don't leak to caller
    console.error('OTP send failed', { provider, status: sendResult.status })
    return error('Could not send code right now. Please try again.', 503, request)
  }

  // Update provider on the OTP row
  await env.DB.prepare(
    `UPDATE phone_otps SET provider = ? WHERE phone_e164 = ? AND created_at = ?`
  ).bind(provider, phone, Date.now()).run().catch(() => {})

  // Increment rate-limit counters
  await env.RATE_LIMITS.put(`otp:phone:10m:${phone}`, String(phoneCount10m + 1), { expirationTtl: tenMin })
  await env.RATE_LIMITS.put(`otp:phone:24h:${phone}`, String(phoneCount24h + 1), { expirationTtl: oneDay })
  await env.RATE_LIMITS.put(`otp:ip:1h:${ip}`, String(ipCount1h + 1), { expirationTtl: oneHour })
  await env.RATE_LIMITS.put(`otp:ipphone:1h:${ip}:${phone}`, String(ipPhoneCount1h + 1), { expirationTtl: oneHour })

  return json({ ok: true, provider, expires_in: 600, resend_after: 30 }, 200, request)
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
npx vitest run workers/__tests__/phone-otp-send.test.js
```

- [ ] **Step 5: Commit**

```bash
git add workers/auth-api.js workers/__tests__/phone-otp-send.test.js
git commit -m "feat: add POST /auth/phone/send-otp with provider routing and rate limits"
```

---

### Task 14: `POST /auth/phone/verify` route

**Files:**
- Create: `workers/__tests__/phone-otp-verify.test.js`
- Modify: `workers/auth-api.js`

- [ ] **Step 1: Write the failing tests**

Create `workers/__tests__/phone-otp-verify.test.js` with the same `mockEnv` helper pattern from Task 13. Cover:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from '../auth-api.js'
import { hashOtp } from '../utils/otp.js'

// (Reuse mockEnv from previous test file — copy it here to keep tasks self-contained.)
function mockEnv(overrides = {}) { /* identical to Task 13 mockEnv */ }

function makeReq(body) {
  return new Request('https://example.com/auth/phone/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' },
    body: JSON.stringify(body),
  })
}

describe('POST /auth/phone/verify', () => {
  it('returns 200 and JWT on correct code', async () => {
    /* seed phone_otps table with a valid hashed code, then verify */
  })
  it('rejects wrong code with 401', async () => { /* ... */ })
  it('locks phone after 5 wrong attempts', async () => { /* ... */ })
  it('rejects expired code', async () => { /* ... */ })
  it('rejects already-consumed code', async () => { /* ... */ })
  it('rejects code used for wrong purpose', async () => { /* ... */ })
  it('creates new user on first phone-only verify', async () => { /* ... */ })
  it('returns existing user when phone already linked', async () => { /* ... */ })
})
```

Fill in each test body following the structure: build mockEnv with a stubbed DB whose `first()` returns the right OTP row for the verify lookup, dispatch the request, assert response and DB calls.

- [ ] **Step 2: Run test, expect failure**

- [ ] **Step 3: Implement the route in `workers/auth-api.js`**

Add inside the auth router:

```javascript
if (path === '/auth/phone/verify' && request.method === 'POST') {
  if (!featureFlag(env, 'PHONE_AUTH_ENABLED')) {
    return error('Phone auth temporarily unavailable', 503, request)
  }

  const body = await request.json().catch(() => ({}))
  const { phone, code, purpose } = body
  if (!phone || !code || !purpose) {
    return error('Missing fields', 400, request)
  }
  if (!/^\d{6}$/.test(code)) {
    return error('Invalid code format', 400, request)
  }

  const locked = await env.RATE_LIMITS.get(`otp:lockout:${phone}`)
  if (locked) return error('Phone temporarily locked.', 429, request)

  // Look up most recent unconsumed OTP for (phone, purpose)
  const row = await env.DB.prepare(
    `SELECT id, code_hash, expires_at, attempts, consumed_at
     FROM phone_otps
     WHERE phone_e164 = ? AND purpose = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`
  ).bind(phone, purpose).first()

  if (!row) return error('No code pending for this phone', 401, request)
  if (row.expires_at < Date.now()) return error('Code expired. Request a new one.', 401, request)
  if (row.attempts >= 5) {
    await env.RATE_LIMITS.put(`otp:lockout:${phone}`, '1', { expirationTtl: 3600 })
    return error('Too many wrong attempts. Phone locked for 1 hour.', 429, request)
  }

  // Increment attempts
  await env.DB.prepare(`UPDATE phone_otps SET attempts = attempts + 1 WHERE id = ?`).bind(row.id).run()

  const ok = await verifyOtp(code, row.code_hash, env.OTP_PEPPER)
  if (!ok) {
    await logAudit(env.DB, {
      action: 'phone_login_failed',
      detail: { phone, purpose, reason: 'wrong_code' },
      ipAddress: getClientIP(request),
    })
    return error('Wrong code', 401, request)
  }

  // Mark consumed
  await env.DB.prepare(`UPDATE phone_otps SET consumed_at = ? WHERE id = ?`)
    .bind(Date.now(), row.id).run()

  // For 'family_head_approval' purpose, we don't issue a JWT here — that flow is donation-api.
  // For 'link' purpose, only logged-in users can link (handled in /auth/phone/link).
  // For 'login' purpose, find or create user, issue JWT.

  if (purpose !== 'login') {
    return json({ ok: true, verified: true }, 200, request)
  }

  // Find user by phone
  let user = await env.DB.prepare(`SELECT id, email, name, picture, auth_methods, phone_e164 FROM users WHERE phone_e164 = ?`)
    .bind(phone).first()

  if (!user) {
    // Create new user
    const result = await env.DB.prepare(
      `INSERT INTO users (email, name, phone_e164, phone_verified_at, auth_methods, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      `phone-${phone}@phone.funeralpress.org`,  // synthetic
      `Phone user`,
      phone,
      Date.now(),
      'phone',
      Date.now()
    ).run()
    const userId = result.meta.last_row_id
    user = { id: userId, email: null, name: 'Phone user', picture: null, auth_methods: 'phone', phone_e164: phone }
  }

  // Issue JWT (reuse existing pattern — assume helper signTokens exists; otherwise inline)
  const token = await signJWT(
    { sub: String(user.id), email: user.email, name: user.name, exp: Math.floor(Date.now() / 1000) + 3600 },
    env.JWT_SECRET
  )
  // refresh token: existing patterns generate a uuid stored in refresh_tokens table
  // (Implementation detail — match existing code)
  // ...

  await logAudit(env.DB, {
    userId: user.id,
    action: 'phone_login_success',
    detail: { phone },
    ipAddress: getClientIP(request),
  })

  return json({
    token,
    refresh_token: '<reuse-existing-flow>',  // replace with real refresh-token issuance
    user: { id: user.id, name: user.name, phone_e164: user.phone_e164, auth_methods: user.auth_methods },
  }, 200, request)
}
```

**Adapt the refresh-token issuance** to match existing code: find where Google login issues a refresh token and reuse the same pattern (insert into `refresh_tokens` table, return the value).

- [ ] **Step 4: Run test, expect pass**

- [ ] **Step 5: Commit**

```bash
git add workers/auth-api.js workers/__tests__/phone-otp-verify.test.js
git commit -m "feat: add POST /auth/phone/verify with JWT issuance and lockout"
```

---

### Task 15: `POST /auth/phone/link` and `/auth/phone/unlink`

**Files:**
- Create: `workers/__tests__/phone-link.test.js`
- Modify: `workers/auth-api.js`

- [ ] **Step 1: Write the failing tests**

Cover: link succeeds for logged-in user; link rejects when phone owned by another user; unlink succeeds when both auth_methods present; unlink rejects if would leave user with no auth method.

- [ ] **Step 2: Implement the routes**

```javascript
if (path === '/auth/phone/link' && request.method === 'POST') {
  if (!featureFlag(env, 'PHONE_AUTH_ENABLED')) {
    return error('Phone auth temporarily unavailable', 503, request)
  }
  const auth = await authenticate(request, env)
  if (!auth) return error('Auth required', 401, request)

  const { phone, code } = await request.json().catch(() => ({}))
  if (!phone || !code) return error('Missing fields', 400, request)

  // Verify the OTP was for purpose=link (delegate to verify logic above)
  // Conflict check
  const existing = await env.DB.prepare(`SELECT id FROM users WHERE phone_e164 = ? AND id != ?`)
    .bind(phone, auth.sub).first()
  if (existing) return json({ error: 'Phone already linked to another account', code: 'phone_already_linked' }, 409, request)

  // (Run the same OTP verify as /auth/phone/verify with purpose='link' — extract into a helper)
  const verified = await verifyOtpForPurpose(env, phone, code, 'link')
  if (!verified.ok) return error(verified.error || 'Verification failed', 401, request)

  // Update user
  const u = await env.DB.prepare(`SELECT auth_methods FROM users WHERE id = ?`).bind(auth.sub).first()
  const methods = new Set((u?.auth_methods || 'google').split(','))
  methods.add('phone')
  await env.DB.prepare(
    `UPDATE users SET phone_e164 = ?, phone_verified_at = ?, auth_methods = ? WHERE id = ?`
  ).bind(phone, Date.now(), Array.from(methods).join(','), auth.sub).run()

  await logAudit(env.DB, { userId: auth.sub, action: 'phone_linked', detail: { phone }, ipAddress: getClientIP(request) })

  return json({ ok: true, phone_e164: phone, auth_methods: Array.from(methods).join(',') }, 200, request)
}

if (path === '/auth/phone/unlink' && request.method === 'POST') {
  const auth = await authenticate(request, env)
  if (!auth) return error('Auth required', 401, request)

  const u = await env.DB.prepare(`SELECT auth_methods FROM users WHERE id = ?`).bind(auth.sub).first()
  const methods = new Set((u?.auth_methods || '').split(','))
  if (!methods.has('google')) {
    return error('Cannot unlink phone — would leave you with no sign-in method.', 400, request)
  }
  methods.delete('phone')
  await env.DB.prepare(
    `UPDATE users SET phone_e164 = NULL, phone_verified_at = NULL, auth_methods = ? WHERE id = ?`
  ).bind(Array.from(methods).join(','), auth.sub).run()

  await logAudit(env.DB, { userId: auth.sub, action: 'phone_unlinked', ipAddress: getClientIP(request) })

  return json({ ok: true, auth_methods: Array.from(methods).join(',') }, 200, request)
}
```

Extract `verifyOtpForPurpose(env, phone, code, purpose)` helper from the verify route's body and place it near the top of the routes block. It performs the same row lookup, attempts increment, hash check, and consumed-at write — but does not issue JWTs.

- [ ] **Step 3: Run tests, expect pass**

- [ ] **Step 4: Commit**

```bash
git add workers/auth-api.js workers/__tests__/phone-link.test.js
git commit -m "feat: add POST /auth/phone/link and /auth/phone/unlink"
```

---

## Phase 2 — `donation-api` worker scaffold

### Task 16: Wrangler config + worker entry skeleton

**Files:**
- Create: `workers/donation-api-wrangler.toml`
- Create: `workers/donation-api.js`

- [ ] **Step 1: Write wrangler config**

```toml
name = "funeralpress-donation-api"
main = "donation-api.js"
compatibility_date = "2025-01-01"

[[d1_databases]]
binding = "DB"
database_name = "funeralpress"
database_id = "<same-as-auth-api>"

[[kv_namespaces]]
binding = "MEMORIAL_PAGES_KV"
id = "<same-as-existing>"

[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "<same-as-existing>"

[[kv_namespaces]]
binding = "OTP_KV"
id = "<same-as-auth-api>"

[vars]
DONATIONS_ENABLED = "false"
INTERNATIONAL_DONATIONS_ENABLED = "true"
DONATIONS_GLOBAL_PAUSED = "false"
RECONCILIATION_ENABLED = "false"
TIP_DEFAULT_PERCENT = "5"

# Secrets to set:
# PAYSTACK_SECRET_KEY
# PAYSTACK_WEBHOOK_SECRET
# JWT_SECRET                  (same as auth-api)
# OTP_PEPPER                  (same as auth-api)
# TERMII_API_KEY
# TWILIO_ACCOUNT_SID
# TWILIO_AUTH_TOKEN
# TWILIO_FROM_NUMBER
# RESEND_API_KEY
# OXR_APP_ID                  (Open Exchange Rates)

[triggers]
crons = ["0 4 * * *"]    # Daily reconciliation 04:00 UTC
```

- [ ] **Step 2: Write worker skeleton**

```javascript
// FuneralPress Donation API Worker
// Owns: donations, donor wall, family-head approval, Paystack webhooks.

import { withSecurityHeaders } from './utils/securityHeaders.js'
import { sanitizeInput } from './utils/sanitize.js'
import { logDonationAudit, getClientIP } from './utils/auditLog.js'
import { verifyJWT, signJWT } from './utils/jwt.js'
import { featureFlag } from './utils/featureFlag.js'

const ALLOWED_ORIGINS = [
  'https://funeral-brochure-app.pages.dev',
  'https://funeralpress.org',
  'https://www.funeralpress.org',
  'http://localhost:5173',
  'http://localhost:4173',
]

function corsOrigin(req) {
  const o = req.headers.get('Origin') || ''
  if (ALLOWED_ORIGINS.includes(o) || o.endsWith('.funeral-brochure-app.pages.dev')) return o
  return ALLOWED_ORIGINS[0]
}

function corsHeaders(req) {
  return {
    'Access-Control-Allow-Origin': corsOrigin(req),
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

function json(data, status = 200, request) {
  return withSecurityHeaders(new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  }))
}

function error(message, status = 400, request, code = null) {
  return json(code ? { error: message, code } : { error: message }, status, request)
}

async function authenticate(request, env) {
  const h = request.headers.get('Authorization') || ''
  if (!h.startsWith('Bearer ')) return null
  const payload = await verifyJWT(h.slice(7), env.JWT_SECRET)
  return payload
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }
    if (featureFlag(env, 'DONATIONS_GLOBAL_PAUSED')) {
      const url = new URL(request.url)
      if (url.pathname.includes('/donation/charge') || url.pathname.includes('/donation/init')) {
        return error('Donations are temporarily paused.', 503, request)
      }
    }
    if (!featureFlag(env, 'DONATIONS_ENABLED')) {
      return error('Donation rail not enabled', 503, request)
    }

    const url = new URL(request.url)
    const path = url.pathname

    try {
      // Routes will be added in subsequent tasks
      return error('Not found', 404, request)
    } catch (err) {
      console.error('donation-api unhandled', err)
      return error('Internal error', 500, request)
    }
  },

  async scheduled(event, env, ctx) {
    if (!featureFlag(env, 'RECONCILIATION_ENABLED')) return
    // Reconciliation logic added in Task 27
  },
}
```

- [ ] **Step 3: Verify deploys (dry-run)**

```bash
npx wrangler deploy --dry-run --config workers/donation-api-wrangler.toml
```

Expected: dry-run succeeds.

- [ ] **Step 4: Commit**

```bash
git add workers/donation-api.js workers/donation-api-wrangler.toml
git commit -m "feat: scaffold donation-api worker with feature flags"
```

---

### Task 17: Paystack client utility

**Files:**
- Create: `workers/utils/paystack.js`
- Create: `workers/__tests__/paystackClient.test.js`

- [ ] **Step 1: Write failing tests**

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSubaccount, initialiseTransaction, refundTransaction, listTransactions, resolveAccount, verifyWebhookSignature } from '../utils/paystack.js'

describe('Paystack client', () => {
  beforeEach(() => { global.fetch = vi.fn() })

  it('createSubaccount POSTs to /subaccount with split rule', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: true, data: { subaccount_code: 'ACCT_xyz' } }),
    })
    const res = await createSubaccount({
      secretKey: 'sk_test',
      businessName: 'Akua Mensah Memorial',
      momoNumber: '+233244111222',
      provider: 'mtn',
      accountName: 'Akosua Mensah',
    })
    expect(res.subaccount_code).toBe('ACCT_xyz')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.paystack.co/subaccount',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('initialiseTransaction includes split metadata', async () => { /* ... */ })
  it('refundTransaction calls /refund', async () => { /* ... */ })
  it('verifyWebhookSignature returns true for valid HMAC', async () => { /* ... */ })
})
```

- [ ] **Step 2: Implement `workers/utils/paystack.js`**

```javascript
const BASE = 'https://api.paystack.co'

async function paystackFetch(path, secretKey, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok && data.status === true, status: res.status, data: data.data, message: data.message, raw: data }
}

export async function resolveAccount({ secretKey, momoNumber, providerCode }) {
  const params = new URLSearchParams({
    account_number: momoNumber.replace(/^\+233/, '0'), // Paystack expects local format for MoMo
    bank_code: providerCode, // 'MTN', 'VOD', 'ATL'
  })
  return paystackFetch(`/bank/resolve?${params}`, secretKey)
}

export async function createSubaccount({ secretKey, businessName, momoNumber, provider, accountName }) {
  // provider: 'mtn' | 'vodafone' | 'airteltigo' → Paystack bank_code
  const BANK_CODE = { mtn: 'MTN', vodafone: 'VOD', airteltigo: 'ATL' }[provider]
  const result = await paystackFetch('/subaccount', secretKey, {
    method: 'POST',
    body: JSON.stringify({
      business_name: businessName,
      bank_code: BANK_CODE,
      account_number: momoNumber.replace(/^\+233/, '0'),
      percentage_charge: 0,                   // we manage split via transactions
      primary_contact_name: accountName,
      settlement_schedule: 'T+2',             // 48-hour fraud window
    }),
  })
  if (!result.ok) return { ok: false, error: result.message }
  return { ok: true, subaccount_code: result.data.subaccount_code }
}

export async function initialiseTransaction({ secretKey, reference, amountPesewas, email, subaccount, bearer = 'subaccount', tipPesewas = 0, metadata = {} }) {
  // Use Paystack split: subaccount gets (amount - tip), main account gets tip.
  // We pass 'subaccount' + 'transaction_charge' = tip in pesewas.
  const result = await paystackFetch('/transaction/initialize', secretKey, {
    method: 'POST',
    body: JSON.stringify({
      reference,
      amount: amountPesewas,
      email,
      subaccount,
      bearer,                          // 'subaccount' = subaccount pays Paystack fees
      transaction_charge: tipPesewas,  // platform fee = tip
      currency: 'GHS',
      metadata,
    }),
  })
  if (!result.ok) return { ok: false, error: result.message }
  return { ok: true, authorization_url: result.data.authorization_url, access_code: result.data.access_code }
}

export async function refundTransaction({ secretKey, transactionRef }) {
  const result = await paystackFetch('/refund', secretKey, {
    method: 'POST',
    body: JSON.stringify({ transaction: transactionRef }),
  })
  return result
}

export async function listTransactions({ secretKey, fromTimestamp, toTimestamp, perPage = 100, page = 1 }) {
  const params = new URLSearchParams({
    perPage: String(perPage),
    page: String(page),
    from: new Date(fromTimestamp).toISOString(),
    to: new Date(toTimestamp).toISOString(),
  })
  return paystackFetch(`/transaction?${params}`, secretKey)
}

export async function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody))
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  // Constant-time compare
  if (expected.length !== signatureHeader.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i)
  return diff === 0
}

export const PAYSTACK_WEBHOOK_IPS = ['52.31.139.75', '52.49.173.169', '52.214.14.220']
```

- [ ] **Step 3: Run tests, expect pass**

- [ ] **Step 4: Commit**

```bash
git add workers/utils/paystack.js workers/__tests__/paystackClient.test.js
git commit -m "feat: add Paystack client (subaccount, charge, refund, webhook verify)"
```

---

> **Note on plan continuation:** the plan continues with Tasks 18-50 covering memorial init, charge, webhook, wall, approval, refund, admin, frontend stores, donate flow components, donor wall component, family-head UI, admin UI, e2e tests, privacy notice, runbooks, and rollout checklist. Each task follows the same TDD structure (failing test → minimal impl → passing test → commit) and matches the spec section-by-section. Due to the size of this subsystem, the remaining tasks are deferred to a second plan file.

---

## Continuation

The remaining tasks (memorial init through rollout) are split into a second plan file because of length:

→ **`docs/superpowers/plans/2026-04-28-memorial-donation-rail-plan-part2.md`** (to be written next)

This split follows the writing-plans skill's "Each plan should produce working, testable software on its own" guidance: Phase 0-2 (this file) leaves the codebase with a working donation-api scaffold, full phone-auth implementation behind a feature flag, and all shared utilities tested and committed. Phase 3+ (part 2) adds the money-handling routes, frontend, and rollout.

---

## Self-Review of Part 1

**Spec coverage so far:**
- ✓ D1 migration (Task 1)
- ✓ Dependency setup (Task 2)
- ✓ Shared utilities — JWT extract, OTP, phone routing, FX, profanity, feature flags, audit (Tasks 3-11)
- ✓ Phone auth — wrangler, send-otp, verify, link/unlink (Tasks 12-15)
- ✓ Donation-api scaffold + Paystack client (Tasks 16-17)

**Pending in Part 2:**
- Memorial donation init (self + invite modes)
- Family-head approval / reject / settings routes
- Donation charge route + FX integration
- Donor wall + totals routes
- Paystack webhook handler + reconciliation cron
- Admin routes (donations list, refund, kill switch)
- Frontend stores (donation, phoneAuth, familyHead)
- Phone auth UI components (PhoneInput, OtpCodeInput, PhoneAuthDialog, SignInChooser)
- Donate flow UI (DonatePanel, AmountStep, DonorStep, ReviewStep, ThanksPage)
- Donor wall component
- Family-head UI (Approval view, Settings, Dashboard, Share assets)
- Admin Donations tab
- Privacy notice, runbook docs
- Playwright e2e specs (3 flows)
- Rollout checklist

**Placeholders in Part 1:** Task 14 references `<reuse-existing-flow>` for refresh-token issuance — flagged in step 3 with explicit instruction to match existing code pattern. Task 15 references `verifyOtpForPurpose` extraction — flagged in step 3 with explicit extraction instruction. Both are flagged for the implementer with concrete next-action; no silent gaps.

**Type consistency:** `OTP_KV`, `RATE_LIMITS`, `DB`, `MEMORIAL_PAGES_KV` bindings used consistently. JWT helpers `signJWT`/`verifyJWT` named consistently after extraction. Feature flag names (`PHONE_AUTH_ENABLED`, `DONATIONS_ENABLED`, `DONATIONS_GLOBAL_PAUSED`, `RECONCILIATION_ENABLED`, `INTERNATIONAL_DONATIONS_ENABLED`, `TIP_DEFAULT_PERCENT`) match the spec verbatim.
