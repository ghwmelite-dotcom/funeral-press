# Memorial Donation Rail + Phone Auth — Design Spec

**Date:** 2026-04-28
**Status:** Approved (pending user review)
**Track:** Track C of the 90-day FuneralPress enhancement roadmap (Donation rail + memorial viral loop + Phone+OTP login as prerequisite)
**Estimated effort:** 3-4 weeks
**Prerequisite for:** Cultural Template Engine (Track B), Cultural Authenticity Bundle (Track D)

---

## Table of Contents

1. [Goals & Non-Goals](#goals--non-goals)
2. [Locked Decisions](#locked-decisions)
3. [System Architecture & Data Flow](#system-architecture--data-flow)
4. [Data Model](#data-model)
5. [API Surface](#api-surface)
6. [Frontend Surface](#frontend-surface)
7. [Security, Fraud & Operations](#security-fraud--operations)
8. [Testing Strategy](#testing-strategy)
9. [Rollout Plan](#rollout-plan)
10. [Out of Scope (v1)](#out-of-scope-v1)
11. [Open Implementation Questions](#open-implementation-questions)
12. [Success Metrics](#success-metrics)

---

## Goals & Non-Goals

### Goals

- Enable any FuneralPress memorial page to accept donations from anywhere in the world via Paystack (MoMo for Ghana, cards locally + internationally).
- Settle donations directly to the family's MTN/Vodafone/AirtelTigo MoMo via Paystack subaccount (FuneralPress never custodies funds).
- Capture authenticated phone numbers from donors at the post-donation moment to grow the user graph.
- Add Phone+OTP login as a first-class authentication method alongside existing Google OAuth, including account linking.
- Establish a culturally-aligned authority structure (Family Head approval gate) that mirrors the Akan `abusuapanyin` role and protects against intra-family fraud.
- Generate revenue via a transparent, opt-out donor tip model.
- Produce shareable WhatsApp-first assets (donate-page link previews, QR code posters) that turn each memorial into a 100-500-attendee acquisition funnel.

### Non-Goals (v1)

- Recurring donations, pledge-before-pay, family contribution ledger ("digital Susu") — defer to a future subsystem.
- Multi-currency settlement (we settle GHS only; donors pay in their currency, but family receives GHS).
- Multi-MoMo split payouts.
- In-product Ghana Card / KYC verification UI for family head.
- Multi-language donate page (Twi, Ga, Ewe) — handled in the next subsystem (Cultural Authenticity Bundle).
- Donor leaderboards / ranking.
- Real-time donation feed (WebSockets / SSE).
- Custom in-product refund UX for donors (admin-mediated for v1).

---

## Locked Decisions

The following decisions were resolved during brainstorming and are not open for re-litigation in implementation. Change requires going back to brainstorming.

| # | Decision | Outcome |
|---|---|---|
| 1 | Compliance / merchant-of-record | **Pure pass-through via Paystack subaccount per family.** FuneralPress never custodies funds. |
| 2 | Sign-in to donate | **Optional with strong post-donation capture.** Anonymous donations are allowed; capture flow runs after a successful charge. |
| 3 | Currency for diaspora | **Locale-aware display, settle in GHS.** Donor sees their currency + GHS equivalent. Family receives GHS only. |
| 4 | Donor wall identity model | **Family head sets wall mode (full / names-only / private) at memorial creation.** Donor can opt-down to anonymous; cannot opt-up beyond family setting. Messages off by default; condolence messages route to existing Guest Book. |
| 5 | Family Head approval gate | **Required for memorial publication and MoMo payout designation.** Memorial creator may self-declare as Family Head with audit-logged attestation; otherwise an SMS invite + OTP-verified approval flow runs. |
| 6 | Platform fee | **Tip-the-platform model. 0% mandatory fee.** Default-on, default amount ≈ 5% of donation. Donor can uncheck. Receipt itemises. |
| 7 | OTP provider | **Termii primary for Ghana (+233), Twilio Verify for international.** Country-code routing. |
| 8 | Worker organisation | **Phone OTP added to existing `auth-api.js`. Donations live in a new `donation-api` worker.** |
| 9 | Storage | **Memorial content stays in KV. Donation/identity/audit data lives in D1.** |

---

## System Architecture & Data Flow

### Worker topology

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React, Cloudflare Pages — funeralpress.org)      │
│  • Memorial page (existing) gains <DonatePanel/>            │
│  • New /m/:slug/donate route (full-screen donate flow)      │
│  • New <PhoneAuthDialog/> shared by login + post-donation   │
└──────────┬──────────────────────────┬───────────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────┐    ┌─────────────────────────────────┐
│ auth-api worker     │    │ donation-api worker (NEW)       │
│ (existing, +phone)  │    │                                 │
│                     │    │ • POST /memorials/:id/init      │
│ • POST /auth/phone/ │    │ • POST /memorials/:id/donate    │
│      send-otp       │    │ • POST /memorials/:id/approve   │
│ • POST /auth/phone/ │    │ • GET  /memorials/:id/wall      │
│      verify         │    │ • POST /paystack/webhook        │
│ • POST /auth/phone/ │    │ • POST /donations/:id/receipt   │
│      link           │    │ • POST /donations/:id/thank-you │
└──────────┬──────────┘    │ • GET  /admin/donations         │
           │               │ • POST /admin/donations/refund  │
           │               └──────────┬──────────────────────┘
           │                          │
           ├──────────┬───────────────┤
           ▼          ▼               ▼
       ┌────────┐ ┌─────┐ ┌────────────────────────┐
       │  D1    │ │ KV  │ │ External                │
       │  +5    │ │ MEM │ │ • Termii (GH SMS)       │
       │ tables │ │ KV  │ │ • Twilio Verify (intl)  │
       │        │ │ +OTP│ │ • Paystack (subaccount, │
       │        │ │ KV  │ │   charge, webhook)      │
       │        │ │     │ │ • Resend (receipt email)│
       │        │ │     │ │ • Open Exchange Rates   │
       └────────┘ └─────┘ └────────────────────────┘
```

### Key separations

- **auth-api** owns identity (Google + phone), JWT issuance, account linking. Phone OTP storage uses a dedicated KV namespace `OTP_KV` (separate from `RATE_LIMITS`) with 10-minute TTL. OTP audit history lives in D1 (`phone_otps` table) for fraud analytics.
- **donation-api** owns the money lifecycle. Never issues JWTs; trusts JWTs from auth-api via the shared `JWT_SECRET`.
- **Memorial KV record** (existing `MEMORIAL_PAGES_KV`) gains a small `donation` block as a read cache. **D1 is the source of truth.** Webhook updates D1 first, then writes through to KV. A 5-minute reconciliation cron heals KV if the write-through fails.

### End-to-end donation flow (the hot path)

1. **Family creates memorial** → memorial saved to KV as today. Donation rail off by default.
2. **Family enables donations** via `POST /memorials/:id/donation/init`: provides payout MoMo number, family-head identity (self or invited), wall mode, optional goal. Worker creates a Paystack subaccount, records `memorials` row in D1, marks pending family-head approval if not self-declared.
3. **If family-head ≠ creator** → invitation SMS sent to family head's phone via Termii. Family head opens the link → phone OTP → reviews details → approves or rejects. On approval, the memorial KV record's `family_head_approved` flips true and donations open.
4. **Donor lands on memorial page** → sees `<DonatePanel/>` showing total raised, goal progress, recent donors. Taps "Donate" → opens `/m/:slug/donate`.
5. **Donor enters amount + tip** → locale-aware display, GHS settlement amount computed via cached FX rate.
6. **Donor pays via Paystack** → split-payment instruction: family subaccount gets `amount - paystack_fee`, FuneralPress main account gets the tip. `donations` row written `pending`.
7. **Paystack webhook** `charge.success` → IP allowlist check, HMAC verify, idempotency check (existing patterns). Donation row flipped `succeeded`. Donor wall cache invalidated. Receipt email queued via Resend. If donor consented, post-donation profile-claim flow triggered.
8. **Family head sees real-time totals** in the family-head dashboard. Money is settling to their MoMo on Paystack's T+1 schedule. FuneralPress never holds funds.
9. **At T+24h after first donation**: branded thank-you-card asset (PDF + 1080x1080 PNG) emailed to each donor who provided email; family can download all receipts/thank-yous from the admin.

### Trust boundaries

| Boundary | Rule |
|---|---|
| Donor → frontend | Untrusted. Validate everything server-side. |
| Frontend → donation-api | Anonymous donations allowed; rate-limited per IP + per memorial. |
| Paystack → donation-api webhook | IP-allowlist + HMAC-SHA512 (existing pattern). |
| Family-head approval action | Single-use signed JWT (24h, scope `family_head_approval`) **plus** OTP verification at the time of approval. |
| Admin → donation-api | Existing admin RBAC reused. |

### Failure modes designed for

| Failure | Mitigation |
|---|---|
| Paystack webhook delivery fails | Idempotent retries; nightly reconciliation cron pulls Paystack transactions API and back-fills missing rows. |
| Termii SMS undelivered | 60-second auto-fallback to Twilio Verify; user sees "resend with different provider" link after 30s. |
| Donor abandons after charge but before redirect | Webhook is source of truth; donor can revisit memorial and see their donation logged. |
| Family-head invite SMS lost | Memorial creator can resend invite or self-claim with audit log entry. |
| Paystack subaccount creation fails | Memorial init returns error before any user-facing donation flow. |
| Currency display drift (FX rate stale) | Cache FX rate 5 min; charge always in GHS at then-current rate; receipt pins the rate used. |

---

## Data Model

Five new D1 tables, three columns added to `users`, one block added to the existing memorial KV record. Pesewa-as-int. Timestamps `INTEGER` Unix ms. Soft-delete via `deleted_at`.

### Table 1: `memorials`

The donation-side mirror of the KV memorial record. One row per memorial that has donations enabled.

```sql
CREATE TABLE memorials (
  id                          TEXT PRIMARY KEY,           -- same id as KV key
  slug                        TEXT NOT NULL UNIQUE,
  creator_user_id             INTEGER NOT NULL REFERENCES users(id),
  family_head_user_id         INTEGER REFERENCES users(id),     -- null until approved
  family_head_phone           TEXT,                              -- E.164, for invite if not yet a user
  family_head_name            TEXT,
  family_head_self_declared   INTEGER NOT NULL DEFAULT 0,        -- audit signal

  paystack_subaccount_code    TEXT UNIQUE,                       -- ACCT_xxx from Paystack
  payout_momo_number          TEXT NOT NULL,                     -- E.164 Ghana number
  payout_momo_provider        TEXT NOT NULL,                     -- 'mtn' | 'vodafone' | 'airteltigo'
  payout_account_name         TEXT NOT NULL,

  wall_mode                   TEXT NOT NULL DEFAULT 'full',      -- 'full' | 'names_only' | 'private'
  goal_amount_pesewas         INTEGER,                           -- nullable
  donation_paused             INTEGER NOT NULL DEFAULT 0,        -- family kill switch

  approval_status             TEXT NOT NULL DEFAULT 'pending',   -- 'pending'|'approved'|'rejected'
  approval_token_hash         TEXT,                              -- sha256 of one-time token
  approval_token_expires_at   INTEGER,
  approved_at                 INTEGER,
  rejected_at                 INTEGER,
  rejection_reason            TEXT,

  total_raised_pesewas        INTEGER NOT NULL DEFAULT 0,        -- denormalised, updated by webhook
  total_donor_count           INTEGER NOT NULL DEFAULT 0,        -- denormalised
  last_donation_at            INTEGER,

  created_at                  INTEGER NOT NULL,
  updated_at                  INTEGER NOT NULL,
  deleted_at                  INTEGER
);

CREATE INDEX idx_memorials_creator       ON memorials(creator_user_id);
CREATE INDEX idx_memorials_family_head   ON memorials(family_head_user_id);
CREATE INDEX idx_memorials_approval      ON memorials(approval_status, created_at);
CREATE UNIQUE INDEX idx_memorials_slug   ON memorials(slug) WHERE deleted_at IS NULL;
```

**Why denormalised totals:** the donor wall and progress bar load on every memorial view. Computing `SUM(amount)` per page load is fine at 100 donations and bad at 10,000. Webhook updates the cached total atomically inside the same transaction that inserts the donation row.

### Table 2: `donations`

The money table. Append-only after creation; status transitions only.

```sql
CREATE TABLE donations (
  id                          TEXT PRIMARY KEY,                  -- uuid
  memorial_id                 TEXT NOT NULL REFERENCES memorials(id),
  donor_user_id               INTEGER REFERENCES users(id),      -- null = anonymous/unclaimed
  donor_display_name          TEXT NOT NULL,                     -- 'Anonymous' if user opted
  donor_email                 TEXT,                              -- for receipt + post-donation claim
  donor_phone                 TEXT,                              -- for SMS thank-you
  donor_country_code          TEXT,                              -- 'GH' | 'GB' | 'US' | ...
  visibility                  TEXT NOT NULL DEFAULT 'public',    -- 'public' | 'anonymous'

  -- amounts (all pesewas)
  amount_pesewas              INTEGER NOT NULL,                  -- GHS-denominated
  tip_pesewas                 INTEGER NOT NULL DEFAULT 0,
  paystack_fee_pesewas        INTEGER,                           -- filled by webhook
  net_to_family_pesewas       INTEGER,                           -- filled by webhook

  -- display currency (what the donor saw)
  display_currency            TEXT NOT NULL DEFAULT 'GHS',       -- ISO-4217
  display_amount_minor        INTEGER NOT NULL,                  -- e.g. 2500 = £25.00
  fx_rate_to_ghs              REAL,                              -- pinned at charge time

  paystack_reference          TEXT UNIQUE NOT NULL,
  paystack_transaction_id     TEXT,
  status                      TEXT NOT NULL DEFAULT 'pending',   -- 'pending'|'succeeded'|'failed'|'refunded'
  failure_reason              TEXT,

  receipt_sent_at             INTEGER,
  thank_you_card_sent_at      INTEGER,

  created_at                  INTEGER NOT NULL,
  succeeded_at                INTEGER,
  refunded_at                 INTEGER
);

CREATE INDEX idx_donations_memorial      ON donations(memorial_id, status, created_at DESC);
CREATE INDEX idx_donations_donor         ON donations(donor_user_id) WHERE donor_user_id IS NOT NULL;
CREATE INDEX idx_donations_status        ON donations(status, created_at);
```

**Two-amount design rationale:** `amount_pesewas` is always the GHS amount that hits Paystack. `display_amount_minor + display_currency + fx_rate_to_ghs` capture what the donor actually saw and agreed to pay. Disputes and receipts cite the displayed currency; family always sees GHS.

### Table 3: `donor_profiles`

Lightweight user-extension for donor-specific preferences, separate from the main `users` table to keep it clean.

```sql
CREATE TABLE donor_profiles (
  user_id                     INTEGER PRIMARY KEY REFERENCES users(id),
  default_display_name        TEXT,                              -- "John K." across funerals
  total_donated_pesewas       INTEGER NOT NULL DEFAULT 0,
  total_donations_count       INTEGER NOT NULL DEFAULT 0,
  last_donated_at             INTEGER,
  email_receipts_enabled      INTEGER NOT NULL DEFAULT 1,
  sms_receipts_enabled        INTEGER NOT NULL DEFAULT 1,
  created_at                  INTEGER NOT NULL,
  updated_at                  INTEGER NOT NULL
);
```

### Table 4: `phone_otps`

OTP storage in D1 (not KV). Reason: queryable history for fraud analytics and rate-limit audit.

```sql
CREATE TABLE phone_otps (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_e164                  TEXT NOT NULL,
  code_hash                   TEXT NOT NULL,                     -- sha256(otp + pepper)
  provider                    TEXT NOT NULL,                     -- 'termii' | 'twilio'
  purpose                     TEXT NOT NULL,                     -- 'login' | 'link' | 'family_head_approval'
  ip_address                  TEXT,
  user_agent                  TEXT,
  attempts                    INTEGER NOT NULL DEFAULT 0,
  consumed_at                 INTEGER,
  expires_at                  INTEGER NOT NULL,
  created_at                  INTEGER NOT NULL
);

CREATE INDEX idx_otps_phone   ON phone_otps(phone_e164, created_at DESC);
CREATE INDEX idx_otps_expiry  ON phone_otps(expires_at) WHERE consumed_at IS NULL;
```

**Pepper:** `OTP_PEPPER` env var (256-bit secret). 6-digit codes, 10-minute TTL, 5-attempt cap. 90-day pepper rotation, with old pepper retained 10 minutes during rotation.

### Table 5: `donation_audit`

Domain-specific audit trail, separate from existing `audit_log` to keep that table focused on system actions.

```sql
CREATE TABLE donation_audit (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  memorial_id                 TEXT,
  donation_id                 TEXT,
  actor_user_id               INTEGER,
  actor_phone                 TEXT,
  action                      TEXT NOT NULL,
  -- 'memorial.init' | 'memorial.approve' | 'memorial.reject' | 'memorial.pause' |
  -- 'memorial.payout_changed' | 'memorial.wall_mode_changed' |
  -- 'donation.refund_requested' | 'donation.refund_processed' |
  -- 'family_head.self_declared' | 'family_head.invited' | 'family_head.linked'
  detail                      TEXT,                              -- JSON
  ip_address                  TEXT,
  created_at                  INTEGER NOT NULL
);

CREATE INDEX idx_donation_audit_memorial ON donation_audit(memorial_id, created_at DESC);
CREATE INDEX idx_donation_audit_action   ON donation_audit(action, created_at DESC);
```

### `users` table additions

```sql
ALTER TABLE users ADD COLUMN phone_e164          TEXT UNIQUE;     -- nullable
ALTER TABLE users ADD COLUMN phone_verified_at   INTEGER;
ALTER TABLE users ADD COLUMN auth_methods        TEXT NOT NULL DEFAULT 'google';  -- comma list: 'google,phone'
```

### Memorial KV record extension

```json
{
  "...existing fields...": "...",
  "donation": {
    "memorial_id": "mem_abc123",
    "enabled": true,
    "wall_mode": "full",
    "goal_amount_pesewas": 5000000,
    "total_raised_pesewas": 1234567,
    "total_donor_count": 42,
    "approval_status": "approved"
  }
}
```

The KV `donation` block is a read cache. D1 is the source of truth.

### Migration file

`workers/migrations/migration-donation-rail.sql` — one file, idempotent (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE` guarded by `pragma_table_info` checks for existing column).

---

## API Surface

Conventions: `→` = response on success. Error responses match the existing `{ error, code? }` pattern. Auth column: 🔓 public, 🔒 JWT required, 🛡️ admin-only, 🎯 one-time approval token, ⚡ Paystack webhook.

### auth-api — phone auth additions

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/phone/send-otp` | 🔓 | Send OTP to phone |
| POST | `/auth/phone/verify` | 🔓 | Verify OTP, return JWT (creates user if new) |
| POST | `/auth/phone/link` | 🔒 | Logged-in user adds phone to existing account |
| POST | `/auth/phone/unlink` | 🔒 | Remove phone (only if Google also linked) |

#### `POST /auth/phone/send-otp`

```jsonc
// request
{ "phone": "+233241234567", "purpose": "login" }
// response
→ { "ok": true, "provider": "termii", "expires_in": 600, "resend_after": 30 }
```

- Validate E.164. Country-code routing: `+233` → Termii, else → Twilio Verify.
- Rate limits: per-phone 3/10min and 10/24h; per-IP 20/hour; per-IP-per-phone 5/hour. KV-backed (`RATE_LIMITS`, prefix `otp:`).
- Generate 6-digit OTP. Store `sha256(otp + OTP_PEPPER)` + IP + UA. TTL 10 min.
- On send failure: 503 with retry hint. **Never reveal whether the phone is registered.**

#### `POST /auth/phone/verify`

```jsonc
// request
{ "phone": "+233241234567", "code": "493721", "purpose": "login" }
// response
→ { "token": "<jwt>", "refresh_token": "<rt>", "user": { id, name, phone_e164, auth_methods } }
```

- Look up most recent unconsumed unexpired OTP for `(phone, purpose)`.
- Increment `attempts`. If `attempts >= 5`: lock phone for 1 hour (KV flag).
- Constant-time compare `sha256(code + OTP_PEPPER)` to stored hash.
- On success: mark consumed. If user with phone exists → JWT for that user. Else → create user with `auth_methods='phone'`, `phone_verified_at=now`. Issue JWT.
- Audit `auth_log` with `phone_login_success` / `phone_login_failed`.

#### `POST /auth/phone/link`

Logged-in Google user adds phone. Verifies OTP (purpose=`link`); sets `phone_e164` on user, appends `phone` to `auth_methods`. Conflict (phone owned by another user) → `{ code: "phone_already_linked" }`.

### donation-api — full route inventory

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/memorials/:id/donation/init` | 🔒 | Memorial creator enables donations |
| POST | `/memorials/:id/donation/approve` | 🎯 or 🔒 | Family head approves |
| POST | `/memorials/:id/donation/reject` | 🎯 or 🔒 | Family head rejects |
| PATCH | `/memorials/:id/donation/settings` | 🔒 (family head) | Update wall_mode, goal, paused |
| GET | `/memorials/:id/donation/wall` | 🔓 | Public donor wall (paginated) |
| GET | `/memorials/:id/donation/totals` | 🔓 | Public totals + goal |
| POST | `/memorials/:id/donation/charge` | 🔓 | Initialise a Paystack charge |
| POST | `/paystack/webhook` | ⚡ | Paystack payment events |
| GET | `/donations/:id` | 🔒 (donor or family head) | Donation detail |
| GET | `/donations/:id/receipt.pdf` | 🔒 (donor) | Download receipt |
| POST | `/donations/:id/claim` | 🔒 | Post-donation profile-claim |
| GET | `/admin/donations` | 🛡️ | Admin: paginated donations list |
| POST | `/admin/donations/:id/refund` | 🛡️ | Manual admin refund |
| GET | `/admin/memorials/donation` | 🛡️ | Admin: memorials with donation status |

#### `POST /memorials/:id/donation/init`

```jsonc
// request (memorial creator, JWT)
{
  "payout_momo_number": "+233244111222",
  "payout_momo_provider": "mtn",
  "payout_account_name": "Akosua Mensah",
  "wall_mode": "full",
  "goal_amount_pesewas": 5000000,
  "family_head": {
    "mode": "self",                        // 'self' | 'invite'
    "phone": null,                         // required if mode='invite'
    "name": null
  }
}
// response (mode='self')
→ { "memorial_id": "mem_abc", "approval_status": "approved", "subaccount_code": "ACCT_xyz" }
// response (mode='invite')
→ { "memorial_id": "mem_abc", "approval_status": "pending", "invite_sent_to": "+233...", "expires_at": ... }
```

- Verify caller created the memorial in KV.
- Validate MoMo number against Paystack `/bank/resolve` (catches typos).
- Create Paystack subaccount with split rule: family subaccount = donation portion; FuneralPress main account = tip portion.
- Insert `memorials` row.
- `mode='self'` → `approval_status='approved'`, `family_head_self_declared=1`, **`family_head_user_id=creator_user_id`**, `family_head_phone=user.phone_e164` (if linked) else null, `family_head_name=user.name`. Audit with creator IP, UA, declared head's name+phone.
- `mode='invite'` → generate single-use signed token (JWT, 24h, scope `family_head_approval`, sub=phone, jti=random). Store `sha256(token)` in `approval_token_hash`. Send Termii SMS with approval link. Admin notification. On approval, `family_head_user_id` is set to the user record created/looked-up via the OTP-verified phone.

#### `POST /memorials/:id/donation/charge`

```jsonc
// request (no auth required for v1)
{
  "display_amount_minor": 5000,            // £25.00
  "display_currency": "GBP",
  "tip_pesewas": 1500,                     // chosen tip in GHS terms — frontend computes from (display_amount × tip_percent × fx_rate); server validates against same formula with ±1 pesewa tolerance to absorb rounding
  "donor": {
    "display_name": "John K.",
    "visibility": "public",                // 'public' | 'anonymous'
    "email": "john@example.com",           // optional
    "phone": null,                         // optional
    "country_code": "GB"
  }
}
// response
→ {
    "donation_id": "don_xyz",
    "paystack_reference": "FP_<id>",
    "authorization_url": "https://checkout.paystack.com/...",
    "amount_in_ghs_pesewas": 50000,
    "fx_rate_used": 20.0
  }
```

- Look up memorial. Reject if `approval_status != 'approved'` or `donation_paused = 1`.
- Rate limits: per-IP 5/10min, per-memorial-per-IP 3/hour.
- Sanitize `display_name` via existing `sanitizeInput`. Profanity filter. Length cap 60.
- FX: cached per (currency → GHS) for 5 min via KV. Fail-closed if rate unavailable for non-GHS.
- Compute `amount_pesewas`. Insert `donations` row, `pending`.
- Call Paystack `transaction/initialize` with `reference`, `amount`, `email` (synthetic if anonymous: `anon-{donation_id}@donations.funeralpress.org`), `subaccount`, `bearer='subaccount'`, `metadata={donation_id, memorial_id, tip_pesewas}`.
- Return `authorization_url`.

#### `POST /paystack/webhook`

Reuses existing webhook hardening: IP allowlist (52.31.139.75, 52.49.173.169, 52.214.14.220), HMAC-SHA512 of raw body using `PAYSTACK_WEBHOOK_SECRET`, idempotency via `processed_webhooks` table on `event_id`. Failure modes return 401 without echoing why.

Events handled:
- `charge.success` → flip donation `succeeded`, set `paystack_fee_pesewas` and `net_to_family_pesewas` from event payload, increment `memorials.total_raised_pesewas` and `total_donor_count` in a transaction, write through to KV. Queue receipt email + thank-you-card render. Notify admin if memorial crossed goal threshold.
- `charge.failed` → flip `failed`, store `failure_reason`. No notifications.
- `charge.dispute.create` → flip `disputed`, family + admin alert.
- `refund.processed` → flip `refunded`, decrement totals, audit.

#### `POST /donations/:id/claim`

Post-donation profile-claim flow. Donor lands here from receipt-email link or post-donation modal, having just authenticated via phone OTP. Links the existing `donations` row to the now-known `donor_user_id`. Updates `donor_profiles` aggregates. Idempotent.

#### `GET /memorials/:id/donation/wall`

```jsonc
{
  "wall_mode": "full",
  "total_raised_pesewas": 1234567,
  "total_donor_count": 42,
  "goal_amount_pesewas": 5000000,
  "donations": [
    { "id": "don_xyz", "display_name": "John K.", "amount_pesewas": 50000, "created_at": 1735000000000 },
    { "id": "don_abc", "display_name": "Anonymous", "amount_pesewas": 20000, "created_at": 1734999000000 }
  ],
  "next_cursor": "eyJ0..."
}
```

Wall response shaped by `wall_mode`:
- `full` → name + amount + time
- `names_only` → name + time (amount field omitted)
- `private` → totals only, `donations` array empty

`visibility='anonymous'` always renders as "Anonymous" with no amount-to-user link.

Cached per memorial in KV with 30s TTL keyed by `(memorial_id, wall_mode, cursor)`. Webhook invalidates on every successful donation.

#### `POST /admin/donations/:id/refund`

Admin-only. Calls Paystack refund API. Webhook eventually flips status; admin route also writes optimistic `donation_audit` entry.

### Cross-worker shared concerns

- **JWT verification:** donation-api validates JWTs against shared `JWT_SECRET`.
- **Audit:** every state mutation writes `donation_audit`; system errors still log to existing `audit_log`.
- **Rate limiting:** reuse `RATE_LIMITS` KV namespace; new prefixes `donation:`, `otp:`, `claim:`.
- **Sanitisation:** all user-supplied text via existing `sanitizeInput()`.
- **Wrangler config:** new `donation-api-wrangler.toml`. Bindings: `DB`, `MEMORIAL_PAGES_KV`, `RATE_LIMITS`, `OTP_KV`. Env vars: `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`, `JWT_SECRET`, `OTP_PEPPER`, `TERMII_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, `RESEND_API_KEY`, `FX_API_KEY`.

---

## Frontend Surface

### New routes

| Route | Purpose | Lazy-loaded |
|---|---|---|
| `/m/:slug/donate` | Full-screen donate flow | yes |
| `/m/:slug/donation-thanks?ref=:reference` | Post-donation success + claim CTA | yes |
| `/approve/:token` | Family head approval landing | yes |
| `/auth/phone` | Phone OTP login (modal-or-page) | yes |
| `/family-head/:memorial` | Family head admin dashboard | yes |
| `/donor/me` | Donor's own donation history | yes |

### New components

```
src/components/donation/
├── DonatePanel.jsx                 ← embeds on existing memorial page
├── DonateButton.jsx
├── DonorWall.jsx                   ← respects wall_mode
├── ProgressBar.jsx
├── DonationAmountStep.jsx
├── DonationTipToggle.jsx
├── DonationDonorStep.jsx
├── DonationReviewStep.jsx
├── DonationThankYouCard.jsx        ← downloadable card preview
└── ShareDonationDialog.jsx         ← WhatsApp / link / QR

src/components/auth/
├── PhoneAuthDialog.jsx             ← shared OTP flow
├── PhoneInput.jsx                  ← country picker, E.164 normalisation
└── OtpCodeInput.jsx                ← 6-digit input with paste support

src/components/family-head/
├── FamilyHeadApprovalView.jsx      ← what the SMS link lands on
├── DonationSettingsForm.jsx
├── PayoutDetailsForm.jsx
└── FamilyHeadDashboard.jsx
```

### Stores (Zustand)

```
src/stores/
├── donationStore.js          ← active charge state, donor wall pagination, totals
├── phoneAuthStore.js         ← OTP send/verify state, attempt tracking, lockout UI
└── familyHeadStore.js        ← memorial settings, approval flow state
```

`authStore.js` (existing) gains `phone_e164`, `auth_methods`, and a `linkPhone()` action.

### Donate flow — three-step dialog (mobile-first)

**Step 1 — Amount.** Quick-pick buttons localised to detected currency (£25/£50/£100 UK; GHS 50/100/200 Ghana; $25/$50/$100 US/CA). Custom field accepts decimals. Tip toggle is a real `<input type="checkbox">` with associated `<label>`, default-checked at 5%, recomputes on amount change, uncheckable. **GHS conversion line always visible.** Toggle is not a dark pattern: clearly labelled with the GHS amount shown.

**Step 2 — Donor details.** Display name autofocus. Three radio options: "Show my name and amount" / "Show my name only" (default) / "Donate anonymously". Third option hidden if `wall_mode='private'`. Email optional, copy: *"We'll email a receipt and the family's thank-you card."* Phone optional, copy: *"For SMS thank-you only. Never shared."*

**Step 3 — Review.** Masked MoMo account name (e.g., "A***** M*****"). Itemised: donation, tip, total in display currency, GHS settlement equivalent, MoMo provider. Single CTA: "Pay with Paystack →".

**No spinners with no progress.** Inline "Redirecting to Paystack..." with fallback link if redirect fails.

### Donor wall

Embedded on memorial page below biography/tributes:
- States: `full` (name + amount + time), `names_only` (name + time), `private` (no list, totals only, CTA still shown).
- Anonymous entries render as "Anonymous" with no amount linkage.
- Time display: relative for < 24h, absolute thereafter. Locale-aware.
- Chronological newest-first only. No leaderboard.
- "Show all" pager via cursor pagination. No infinite scroll.

### Phone OTP dialog (shared)

Used in three places: login, link-to-existing-account, family-head approval.

- Country picker: flag + dial code, defaults from `navigator.language` + IP geolocation hint. Top of list: 🇬🇭 +233, 🇬🇧 +44, 🇺🇸 +1, 🇨🇦 +1, 🇳🇬 +234.
- OTP input: 6 separate cells, auto-advance, paste-support (handles "Your code is 493721" SMS), `inputmode="numeric"`, `autocomplete="one-time-code"`.
- Lockout copy: "Too many attempts. Try again in 1 hour." No phishy escape hatches.
- Provider hint: if Termii fails twice, the resend button surfaces a "use different network" link routing to Twilio.

### Family-head approval landing

What the SMS link opens. Mobile-first, deferential tone.

- Approval requires fresh OTP verification of the family head's phone *first*, then explicit Approve / Reject button. Hardens against link-stealing.
- Reject opens a small reason form; submission notifies memorial creator via SMS + email.
- Token is single-use; once approved/rejected, link is dead.

### Family-head dashboard (`/family-head/:memorial`)

KPI cards (total raised, settled-to-MoMo) + settings form (wall mode, goal, paused toggle) + share asset row (WhatsApp / Copy link / Print QR) + recent donations table with CSV export + receipts download. All settings updates write to D1 + `donation_audit`. WhatsApp share asset is **pre-rendered server-side** (1080×1920 PNG via a Worker — final renderer TBD at implementation; falls back to OG image + text snippet for v1 if dynamic asset slips). QR poster is an A4 PDF reusing existing `qrcode` lib + `@react-pdf/renderer`.

### Post-donation soft-capture (`/m/:slug/donation-thanks`)

Critical not to feel transactional.
- Success confirmation with deceased's name and dates.
- Thank-you card preview rendered immediately, downloadable.
- Soft-capture CTA: "Save this donation to your profile / Get reminded of one-week and 40-day observances. Continue with phone | With Google."
- "No thanks" is a real, equally-weighted text link. Dignity over conversion.

### Existing-surface changes (minimum)

- **`MemorialPage.jsx`:** renders `<DonatePanel/>` above guest book if `donation.enabled && approval_status === 'approved'`.
- **`Navbar.jsx`:** unauthenticated "Sign in" opens chooser: "Continue with Google / Continue with phone". Existing Google flow unchanged.
- **`AdminDashboardPage.jsx`:** new `<DonationsTab/>`.
- **`MyDesignsPage.jsx` or new `/donor/me`:** light list of donor's past donations with download-receipt links.

### Accessibility & motion

- AA contrast verified on donate panel (gold-on-dark, burgundy-on-cream) at token level. Begins the platform-wide audit.
- Radios/checkboxes keyboard-navigable, focus-ring visible (existing token).
- Tip toggle is real `<input type="checkbox">` with `<label>` — screen readers announce "Add 5% tip, checked".
- OTP input: `inputmode="numeric"`, `autocomplete="one-time-code"`.
- `prefers-reduced-motion` respected globally — donate-success uses static checkmark, not animated.

### i18n posture

UI strings extracted to `src/i18n/strings/donation.en.js` from day 1. No i18n library yet (deferred to next subsystem). Structural placeholder only.

---

## Security, Fraud & Operations

### Threat model

| # | Threat | Severity | Vector |
|---|---|---|---|
| T1 | Stranger creates memorial for someone, routes donations to own MoMo | Critical | Bad actor sees obituary, creates memorial, designates self as family head |
| T2 | Junior family member self-declares family head, routes to own MoMo | High | Most likely fraud vector — intra-family |
| T3 | SMS pumping / OTP abuse | High | Attacker triggers OTPs to premium-rate numbers |
| T4 | OTP brute force | Medium | 6-digit codes |
| T5 | Stolen card / chargeback fraud | Medium | Donor disputes after settlement to family MoMo |
| T6 | Profanity / abuse on donor wall | Medium | Display name field used to insult deceased or family |
| T7 | Webhook spoofing | Low (mitigated) | Existing IP allowlist + HMAC pattern |
| T8 | Tip toggle dark-pattern accusation | Reputational | Press story |
| T9 | Donor wall doxxing | Medium | Names + locations exposed without consent |
| T10 | Approval link interception (SIM swap) | Medium | Family head's phone compromised |
| T11 | FX rate manipulation | Low | Stale FX cache exploitation |
| T12 | Memorial-creator account takeover changes payout MoMo | High | Compromised creator changes payout to attacker's number |

### Controls

**T1 + T2 — Fraudulent memorial / payout**
- Family-head approval gate mandatory. Self-declaration logged with creator IP, UA, head's phone+name.
- MoMo verify call before subaccount creation; hard-block if Paystack `/bank/resolve` fails.
- **Settlement schedule:** every family subaccount is provisioned with **Paystack `T+2` daily settlement** (configurable per-subaccount at creation via Paystack API). This builds in a uniform 48-hour fraud-flagging window between donor charge and family payout, achievable purely through Paystack settlement config — no platform custody required.
- "Report this memorial" button → admin notification → one-click pause via `donation_paused`. Pausing also halts pending Paystack settlements until admin clears.
- Admin alert within 1 minute on `family_head.self_declared` AND amount > GHS 10,000.
- Admin alert within 5 minutes on first donation to any memorial < 24h old AND amount > GHS 5,000 (manual eyeball before Paystack T+2 settles).

**T3 — SMS pumping**
- Per-phone: 3 sends/10min, 10/24h. Per-IP: 20/hour. Per-IP-per-phone: 5/hour.
- Phone-prefix block list at worker layer (premium-rate ranges from Termii docs).
- Geo-velocity: phone country-code differs from IP country by > 1 hop in same minute → require Cloudflare Turnstile.
- Daily SMS spend cap: hard refuse after `N` per day (default 5,000). Burns alert.

**T4 — OTP brute force**
- 6-digit OTP, 5-attempt cap per code, then code consumed.
- Per-phone lockout 1 hour after 5 failed verifies on consecutive codes.
- Constant-time hash compare. Pepper rotation 90 days, old retained 10 minutes during rotation.
- Purpose-scoped: `login` OTP cannot be replayed against `family_head_approval`.

**T5 — Chargeback**
- Paystack International routes via 3DS; liability shifts to issuer.
- `charge.dispute.create` → memorial pause toggle, donation `disputed`, family alerted.
- Refund accounting: Paystack handles clawback against subaccount; we never custody, never owe.
- Velocity: single donor (email / card fingerprint) > 5 to same memorial in 1h → hold for review.

**T6 — Display-name abuse**
- `sanitizeInput()` + profanity denylist (English + common Twi/Ga/Ewe slurs). Generic rejection, no oracle.
- Length cap 60.
- Family-head moderation: hide individual entries (audit logged).
- Auto-hide rule: 3 family-hidden entries within 1 hour → Turnstile required for new charges to that memorial.

**T7 — Webhook spoofing** Reused existing pattern.

**T8 — Tip-toggle optics**
- Visible labelled checkbox with GHS amount.
- Default-on at 5%. Always uncheckable. No re-enable trick.
- Wording: "Add 5% to support FuneralPress" with the amount, not "support our work" without amount.
- Receipt itemises. Family dashboard separates raised-for-family from platform-tips.

**T9 — Donor wall doxxing**
- Donor visibility chosen at charge time within `wall_mode` ceiling.
- "Show name only" is the default selected option.
- No surnames required. No location, no link to social profiles, no Google avatar.

**T10 — SIM swap / link interception**
- Approval link requires fresh OTP verification of family head's phone *before* Approve enables.
- Single-use token, 24h, revoked on first use whether successful or not.
- Token + OTP tied to same phone number.

**T11 — FX rate manipulation**
- FX cached 5 min in KV per pair from Open Exchange Rates / similar.
- Rate at lookup time pinned into donation row. Receipt cites pinned rate.
- Fail-closed if rate fetch fails (non-GHS only).
- Daily drift alert if cached rate drifts > 5% from BoG published rate.

**T12 — Account takeover**
- Payout MoMo locked after `family_head_approved`. Change requires:
  1. Family-head OTP re-verification, AND
  2. 24-hour cool-down before new MoMo activates, AND
  3. Email + SMS notification to both old and new MoMo account-of-record names.
- During cool-down, donations route to the old MoMo.

### Data classification & retention

| Data | Classification | Retention |
|---|---|---|
| Donation amount + display name | Public | Indefinite (memorial archive) |
| Donor email | Sensitive | 7 years; hashed for analytics post-donation |
| Donor phone | Sensitive | 7 years; never on public wall |
| OTP code hashes | Secret | 24h max, then purged |
| Card details | Never seen | Paystack vault |
| Family-head phone | Sensitive | Memorial lifetime + 7 years |
| Audit log | Internal | 7 years |
| FX rate snapshots | Internal | 90 days |

Right-to-erasure: donor can request name redaction → replace `donor_display_name` with "Anonymous", retain row for audit/financial integrity.

### Operational runbook

- **Daily reconciliation cron** (04:00 UTC): pull Paystack transactions API for prior 24h, diff against `donations`. Mismatches → admin queue.
- **Hourly metrics export**: total volume, success rate, refund rate, OTP success/failure rate, SMS spend → tiny KV-stored snapshot for admin dashboard.
- **Burn alerts** (admin email + optional SMS):
  - SMS spend > 80% of daily cap
  - Donation success rate < 85% rolling 1h
  - More than 3 disputes in 24h
  - OTP failure rate > 30% rolling 1h
  - Reconciliation finds > 0 mismatches
- **Incident playbook:** `DONATIONS_GLOBAL_PAUSED=true` flag makes every `/donation/charge` route 503. One-click in admin.
- **PII access log:** any admin viewing donor PII writes to `audit_log`. Quarterly review.

### Compliance

- **No money custody → no Bank of Ghana licensing required.** Quarterly counsel review to confirm Paystack subaccount model still classifies as facilitation, not aggregation.
- **Paystack KYC** covers family-head identity at merchant level via subaccount creation.
- **Tax**: receipts are confirmation-of-payment, clearly worded. No charity-deduction implied.
- **PCI**: never touch card data; SAQ-A scope. Documented in `docs/compliance/donation-rail-pci-scope.md` at implementation time.

### Privacy notice

New `Donation Privacy Notice` page linked from every donate flow:
- What we collect: name, optional email/phone, amount, time, IP (security), country.
- What's public: per family's `wall_mode`.
- What we share: Paystack, Termii/Twilio, Resend. No marketing or analytics resale.
- Right to erasure: process described.
- Retention: as above.

---

## Testing Strategy

### Backend test files (target ~180 new tests)

```
workers/__tests__/
├── donation-init.test.js              ← memorial init, MoMo verify, subaccount create
├── donation-charge.test.js            ← charge initialisation, FX, tip, validation
├── donation-webhook.test.js           ← Paystack webhook idempotency, all event types
├── donation-wall.test.js              ← wall_mode shaping, anonymous, pagination
├── donation-approval.test.js          ← family head approval, token lifecycle, rejection
├── donation-refund.test.js            ← admin refund, dispute, total decrement
├── donation-reconciliation.test.js    ← cron-driven Paystack diff
├── donation-rate-limits.test.js       ← per-IP, per-memorial, per-IP-per-memorial
├── donation-fraud.test.js             ← T1, T2, T6, T9, T12 scenarios
├── phone-otp-send.test.js             ← provider routing, rate limits
├── phone-otp-verify.test.js           ← brute-force lockout, pepper, purpose scoping
├── phone-link.test.js                 ← account linking, conflict handling
├── donation-fx.test.js                ← FX cache, rate pin, fail-closed
├── donation-currency-display.test.js  ← locale → display currency mapping
├── donation-claim.test.js             ← post-donation profile claim
└── donation-audit.test.js             ← every state transition writes audit row
```

### Frontend tests

```
src/components/donation/__tests__/
├── DonatePanel.test.jsx               ← wall_mode rendering, paused state
├── DonationAmountStep.test.jsx        ← tip toggle math, currency display
├── DonationDonorStep.test.jsx         ← visibility radio, anonymous default
├── DonorWall.test.jsx                 ← anonymous handling, pagination
├── PhoneAuthDialog.test.jsx           ← OTP flow, lockout UI, resend cooldown
├── FamilyHeadApprovalView.test.jsx    ← approval flow + reject path
└── DonationStore.test.js              ← store actions and derived state
```

### Critical-path scenarios (must pass)

| # | Scenario |
|---|---|
| 1 | Happy path: GH donor, GHS 50, full wall, succeeds, receipt sent |
| 2 | Happy path: UK donor, £25, currency display, GHS settle, 3DS |
| 3 | Anonymous donation appears as "Anonymous" with no amount link |
| 4 | Tip default-on, donor unchecks, only donation amount charged |
| 5 | Webhook arrives before charge response — donation row reconciled |
| 6 | Webhook arrives twice (Paystack retry) — second is no-op |
| 7 | Family head OTP wrong 5 times → 1h lockout; resend does not bypass |
| 8 | Memorial creator self-declares family head; audit row written |
| 9 | Family head changes payout MoMo → 24h cool-down enforced |
| 10 | Wall mode `private` → `/wall` returns totals only, no entries |
| 11 | FX rate fetch fails → international charge refused with clear error |
| 12 | Donation paused via family-head dashboard → `/charge` 403 |
| 13 | Refund webhook → memorial total decremented, family notified |
| 14 | OTP brute-force: 5 wrong codes → phone locked, audit row |
| 15 | SMS pumping: 4th OTP send within 10 min refused |
| 16 | Profanity in display_name → rejected with generic error |
| 17 | Approval token replayed after consumption → rejected |
| 18 | Admin pauses memorial via kill switch → all charges 503 |
| 19 | Donor Google-linked, adds phone, both auth_methods set |
| 20 | Daily reconciliation cron finds D1↔Paystack mismatch → admin alert |

### End-to-end (Playwright — new dependency)

```
e2e/donation-flow.spec.js               ← anon donor, GH, full happy path with Paystack test mode
e2e/family-head-approval.spec.js        ← invite → SMS link → OTP → approve
e2e/post-donation-claim.spec.js         ← donate anon → claim with phone OTP
```

Paystack test mode + mocked Termii/Twilio (env override → static OTP `000000`).

### Load tests (one-time pre-launch)

`k6` script targeting `/memorials/:id/donation/charge` at 50 RPS for 5 min. Goals: p95 < 800ms; zero D1 lock contention; webhook p95 < 200ms.

### Security tests

- Rate-limit tests extended for OTP and donation routes.
- Manual penetration pass (or `superpowers:requesting-code-review --focus security`) before launch covering: webhook replay, OTP brute force, IDOR on `/donations/:id`, JWT scope confusion, CSRF on family-head settings.

---

## Rollout Plan

### Phase 0 — Foundation (week 1)

- D1 migration deployed to staging.
- `donation-api` worker scaffolded, deployed to staging behind `DONATIONS_ENABLED=false` (returns 503).
- Phone OTP added to `auth-api.js` behind `PHONE_AUTH_ENABLED=false`.
- Termii + Twilio Verify accounts provisioned; test SMS confirmed to a real Ghana number.
- Paystack subaccount API confirmed in test mode.
- Sentry source maps wired into donation-api.
- All 16 backend test files passing in CI.

**Gate:** all of the above ✓.

### Phase 1 — Internal alpha (week 2)

- Frontend on a Pages preview branch.
- `DONATIONS_ENABLED=true` for a hardcoded list of admin user IDs.
- Phone OTP enabled for the same internal list.
- Internal team runs every critical-path scenario manually:
  - Real Paystack test-mode charge in GHS
  - Real Paystack test-mode 3DS charge in GBP from a UK IP
  - Family head invite → real Termii SMS → real Ghana phone
  - Family head approval, OTP, approve
  - Settings change, pause, unpause
  - Wall pagination with seeded data
- Bug bash: 2-3 hours.
- Reconciliation cron run end-of-day; manually verify zero mismatches.

**Gate:** zero unresolved P0/P1, all e2e specs green.

### Phase 2 — Closed beta (weeks 3-4)

- 5 hand-picked families with upcoming funerals. Personal walk-through. Direct WhatsApp support.
- Real money flows (Paystack live mode). Daily reconciliation human-verified.
- Daily review: donations received, payouts settled, complaints, abandons.
- Funnel telemetry: donate-page-load → charge-init → Paystack-redirect → webhook-success.
- Stop conditions:
  - Any chargeback → re-evaluate before adding families
  - Any donor-funds-misrouted incident
  - Conversion < 30% from charge-init to webhook-success
  - Tip opt-out > 95% (toggle perception broken)

**Gate:** 5 funerals processed clean, ≥ 1 successful diaspora donation, no fraud reports.

### Phase 3 — Public soft-launch (week 5)

- `DONATIONS_ENABLED=true` globally.
- Phone OTP login universally available.
- Donate panel renders on every existing memorial **only after** family enables it via dashboard. No auto-opt-in.
- Quiet announcement to existing user base (Resend email). No press.
- Daily reconciliation continues; admin notification volume calibrated.
- 30-day cohort tracking: per-memorial conversion, average donation, tip-opt-in rate, diaspora share, refund rate.

**Gate:** 30 days clean, ≥ 50 memorials with donations enabled, ≥ 80% tip-opt-in, < 1% refund rate.

### Phase 4 — Press & partnerships (week 6+, parallel to next subsystem)

- TechCabal / Graphic Online press push framing the rail as platform infrastructure for Ghanaian funeral generosity.
- MoFFA outreach updated.
- Denominational partners (per existing institutional plan) get an early look.
- Begin design work on Cultural Template Engine (Track B) in parallel; donation rail enters maintenance.

### Feature flags & kill switches

| Flag | Default | Effect when off |
|---|---|---|
| `DONATIONS_ENABLED` | `false` until Phase 3 | All `/donation/*` routes 503 |
| `PHONE_AUTH_ENABLED` | `false` until Phase 1 | `/auth/phone/*` routes 503 |
| `DONATIONS_GLOBAL_PAUSED` | `false` | Charges 503; wall + admin readable |
| `INTERNATIONAL_DONATIONS_ENABLED` | `true` | If `false`, only GHS-display donations accepted |
| `TIP_DEFAULT_ON` | `true` | Toggle's default state |
| `RECONCILIATION_ENABLED` | `false` until Phase 1 | Cron route 503 |

All flags read from worker env at request time. Flipping a flag is a `wrangler secret put` away — no redeploy.

### Documentation deliverables

- `docs/compliance/donation-rail-pci-scope.md` — SAQ-A justification.
- `docs/runbooks/donation-incidents.md` — kill switch, refund, reconciliation-mismatch, dispute, SMS pumping, family-head-fraud-report responses.
- `docs/api/donation-api.md` — public API reference.
- `docs/donation-privacy-notice.md` — linkable privacy notice.

---

## Out of Scope (v1)

Listed here so they aren't forgotten — these are deliberately deferred:

- Recurring donations
- Live donation feed (real-time wall)
- Donor leaderboard
- Pledge-before-pay
- Multi-MoMo split payout
- Family-head Ghana Card / KYC verification UI
- Multi-language donate page (Twi/Ga/Ewe) — handled in next subsystem
- In-product donor refund UI
- Custom subaccount split rules per donation
- Donor-side dispute UI
- Memorial archive consolidated into a national directory (separate subsystem)

---

## Open Implementation Questions

These are deliberately deferred to implementation but flagged here so the implementation plan resolves them:

1. **WhatsApp share asset rendering pipeline.** Server-side image generation options:
   - Cloudflare Workers + a third-party screenshot service
   - `html-to-image` running in a Worker (limited; large bundle)
   - Pre-rendered template + dynamic text overlay via Canvas API in a Worker
   - Fall back to OG image + text snippet for v1 if dynamic asset slips
2. **Profanity denylist source.** Whether to use a maintained library (e.g., `obscenity`) plus a small custom Ghana-English/Twi/Ga/Ewe additions list. Library choice TBD; aim for ~100-300 entries combined.
3. **FX rate provider.** Open Exchange Rates is the assumed default. Alternatives: exchangerate.host (free, less reliable), Fixer (paid). Choose during implementation based on free-tier limits and uptime.
4. **Paystack International enablement.** This is an account-level setting that must be confirmed enabled before international charges work. Verify before Phase 1.
5. **Resend template authoring.** Receipt and thank-you-card emails need designed templates. Reuse existing transactional template patterns.
6. **OTP_KV namespace** vs. reusing `RATE_LIMITS`. Decision at implementation: create dedicated namespace if KV operation costs warrant, otherwise prefix on existing namespace.
7. **`processed_webhooks` table** — confirm whether this exists today in the auth-api codebase or needs creation. If exists, reuse; if not, new migration.
8. **Cloudflare Turnstile integration** — if abuse-driven Turnstile gating is added, that's a separate widget integration (free tier sufficient).

---

## Success Metrics

Tracked from Phase 3 launch:

| Metric | Target (Day 30) | Target (Day 90) |
|---|---|---|
| Memorials with donations enabled | 50 | 300 |
| Total GMV through rail | GHS 200,000 | GHS 1,500,000 |
| Tip opt-in rate | ≥ 80% | ≥ 75% |
| Average donations per memorial | 8 | 15 |
| Diaspora share of GMV | 15% | 25% |
| Donor → user conversion (post-donation claim) | 30% | 40% |
| Refund / dispute rate | < 1% | < 0.5% |
| OTP send success rate | ≥ 98% | ≥ 99% |
| Family-head approval completion rate | ≥ 70% | ≥ 80% |
| Reconciliation mismatches | 0 | 0 |

The donation rail is considered **successful** if at Day 90: GMV is at or above GHS 1.5M, tip opt-in is at or above 75%, refund rate is at or below 0.5%, and zero reconciliation mismatches have been recorded.

---

## Approval

Design approved through interactive brainstorming session 2026-04-28 across six sections (Architecture, Data Model, API Surface, Frontend Surface, Security, Testing & Rollout) with the user. Proceeds to implementation planning via `superpowers:writing-plans` after user reviews this written spec.
