-- ─────────────────────────────────────────────────────────────────────────
-- Minimal D1 schema for e2e auth tests.
--
-- This is NOT the production schema. The prod migration set in
-- workers/migrations/ has implicit ordering dependencies on tables that
-- predate the migration system (e.g., `migration-foundation.sql` ALTERs
-- `users`, `designs`, `orders`, `print_orders` without creating them).
-- That set doesn't replay cleanly on a fresh local D1, and re-engineering
-- it is out of scope for the e2e harness.
--
-- Instead, this file declares exactly what the auth flow touches. When a
-- new spec needs a table that isn't here, add it. The auth-api source of
-- truth for column names is `workers/auth-api.js` — keep these definitions
-- aligned with the INSERT/UPDATE statements over there.
--
-- Drift risk: if prod auth-api starts using a column not declared here,
-- the e2e spec will fail loudly. That is the intended detection path.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id                          TEXT PRIMARY KEY,
  google_id                   TEXT UNIQUE NOT NULL,
  email                       TEXT NOT NULL,
  name                        TEXT NOT NULL,
  picture                     TEXT,
  phone_e164                  TEXT UNIQUE,
  pin_hash                    TEXT,
  pin_set_at                  INTEGER,
  pin_failed_attempts         INTEGER NOT NULL DEFAULT 0,
  pin_lockout_until           INTEGER,
  email_verified_at           INTEGER,
  auth_methods                TEXT,
  is_partner                  INTEGER DEFAULT 0,
  referral_code               TEXT,
  partner_name                TEXT,
  partner_type                TEXT,
  partner_logo_url            TEXT,
  partner_denomination        TEXT,
  credits_remaining           INTEGER DEFAULT 0,
  onboarded_at                TEXT,
  deleted_at                  TEXT,
  created_at                  INTEGER NOT NULL,
  updated_at                  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_phone   ON users(phone_e164) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email   ON users(email)      WHERE deleted_at IS NULL;
CREATE INDEX idx_users_google  ON users(google_id);

CREATE TABLE refresh_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT UNIQUE NOT NULL,
  expires_at  TEXT NOT NULL
);

CREATE INDEX idx_refresh_hash ON refresh_tokens(token_hash);

CREATE TABLE auth_email_tokens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL REFERENCES users(id),
  token_hash  TEXT NOT NULL UNIQUE,
  purpose     TEXT NOT NULL CHECK (purpose IN ('email_verify', 'pin_reset')),
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  consumed_at INTEGER,
  ip_address  TEXT
);

CREATE INDEX idx_auth_email_tokens_user
  ON auth_email_tokens(user_id, purpose, created_at DESC);

-- audit_log: logAudit is fire-and-forget, but having the table avoids noisy
-- failure logs during dev iteration.
CREATE TABLE audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT,
  action        TEXT NOT NULL,
  resource_type TEXT,
  resource_id   TEXT,
  detail        TEXT,
  ip_address    TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);

-- Login's response builder calls getUserPurchaseData() (reads unlocked_designs)
-- and isAdmin() → hasAdminRole() (joins user_roles + roles). A fresh test user
-- has no rows in these, but the tables must exist or login 500s.
CREATE TABLE unlocked_designs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  design_id   TEXT NOT NULL
);

CREATE TABLE roles (
  id          TEXT PRIMARY KEY,
  name        TEXT UNIQUE NOT NULL,
  permissions TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE user_roles (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id    TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_by TEXT,
  granted_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, role_id)
);

-- The authenticated app shell fetches GET /designs on login. Not asserted by
-- the auth spec, but having the table keeps a 500 out of the test logs.
CREATE TABLE designs (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  name         TEXT DEFAULT 'Untitled',
  data         TEXT NOT NULL,
  updated_at   TEXT DEFAULT (datetime('now')),
  deleted_at   TEXT
);
