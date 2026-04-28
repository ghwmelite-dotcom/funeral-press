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
-- SQLite ALTER lacks IF NOT EXISTS for columns. Migration runner should treat
-- "duplicate column name" errors on these three statements as success.
ALTER TABLE users ADD COLUMN phone_e164          TEXT;
ALTER TABLE users ADD COLUMN phone_verified_at   INTEGER;
ALTER TABLE users ADD COLUMN auth_methods        TEXT NOT NULL DEFAULT 'google';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone_e164) WHERE phone_e164 IS NOT NULL;
