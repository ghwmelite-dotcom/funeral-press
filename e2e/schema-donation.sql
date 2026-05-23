-- ─────────────────────────────────────────────────────────────────────────
-- Donation-flow schema + fixtures for e2e webhook integration tests.
--
-- DDL copied verbatim from workers/migrations/migration-donation-rail.sql
-- (+ momo-cooldown ALTER columns folded in). Keep aligned with that source.
-- Loaded after e2e/schema-e2e.sql, which creates `users`.
--
-- FK enforcement is left at SQLite's default (off in local D1), so the
-- seeded creator user id is illustrative — rows insert regardless.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE memorials (
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

  -- momo-cooldown additions
  pending_payout_momo_number   TEXT,
  pending_payout_momo_provider TEXT,
  pending_payout_account_name  TEXT,
  pending_payout_effective_at  INTEGER,

  created_at                  INTEGER NOT NULL,
  updated_at                  INTEGER NOT NULL,
  deleted_at                  INTEGER
);

CREATE TABLE donations (
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
  refunded_at                 INTEGER
);

CREATE INDEX idx_donations_ref       ON donations(paystack_reference);
CREATE INDEX idx_donations_memorial  ON donations(memorial_id, status, created_at DESC);

CREATE TABLE processed_webhooks (
  event_id                    TEXT PRIMARY KEY,
  source                      TEXT NOT NULL,
  processed_at                INTEGER NOT NULL
);

-- ─── Fixtures ──────────────────────────────────────────────────────────────
-- created_at is a fixed past ms-epoch (2023-11-14) so it sorts before the
-- wall's `created_at < now` cursor. Each mutating test gets its OWN memorial
-- so parallel runs don't race on totals.

INSERT INTO users (id, google_id, email, name, created_at)
VALUES ('1', 'e2e-donation-creator', 'creator@e2e.funeralpress.test', 'E2E Creator', 1700000000000);

INSERT INTO memorials (
  id, slug, creator_user_id, family_head_self_declared,
  paystack_subaccount_code, payout_momo_number, payout_momo_provider, payout_account_name,
  wall_mode, goal_amount_pesewas, donation_paused, approval_status, approved_at,
  total_raised_pesewas, total_donor_count, created_at, updated_at
) VALUES
  ('mem_e2e_happy', 'e2e-mem-happy', 1, 1, 'ACCT_e2e_happy', '+233200000001', 'mtn', 'E2E Happy Family',
   'full', 1000000, 0, 'approved', 1700000000000, 0, 0, 1700000000000, 1700000000000),
  ('mem_e2e_idem', 'e2e-mem-idem', 1, 1, 'ACCT_e2e_idem', '+233200000002', 'mtn', 'E2E Idem Family',
   'full', 1000000, 0, 'approved', 1700000000000, 0, 0, 1700000000000, 1700000000000);

INSERT INTO donations (
  id, memorial_id, donor_display_name, visibility,
  amount_pesewas, tip_pesewas, display_currency, display_amount_minor,
  paystack_reference, status, created_at
) VALUES
  ('don_e2e_happy', 'mem_e2e_happy', 'Ama E2E', 'public',
   5000, 250, 'GHS', 5000, 'FP_e2e_happy', 'pending', 1700000000000),
  ('don_e2e_idem', 'mem_e2e_idem', 'Kofi E2E', 'public',
   3000, 150, 'GHS', 3000, 'FP_e2e_idem', 'pending', 1700000000000);
