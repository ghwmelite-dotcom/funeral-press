-- Local-dev bootstrap: minimal `users` table so donation-rail's FOREIGN KEYs
-- can be satisfied during `wrangler dev`. Mirrors the production schema.
-- Not for remote — the prod `users` table already exists.

CREATE TABLE IF NOT EXISTS users (
  id                          TEXT PRIMARY KEY,
  google_id                   TEXT UNIQUE NOT NULL,
  email                       TEXT NOT NULL,
  name                        TEXT NOT NULL,
  picture                     TEXT,
  created_at                  TEXT DEFAULT (datetime('now')),
  updated_at                  TEXT DEFAULT (datetime('now')),
  is_partner                  INTEGER DEFAULT 0,
  referral_code               TEXT,
  partner_name                TEXT,
  credits_remaining           INTEGER DEFAULT 0,
  partner_type                TEXT DEFAULT NULL,
  partner_logo_url            TEXT DEFAULT NULL,
  partner_welcome_msg         TEXT DEFAULT NULL,
  partner_denomination        TEXT DEFAULT NULL,
  partner_commission_override REAL DEFAULT NULL,
  deleted_at                  TEXT DEFAULT NULL
  -- phone_e164, phone_verified_at, auth_methods are added by migration-donation-rail.sql ALTER statements
);
