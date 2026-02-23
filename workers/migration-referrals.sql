-- Migration: Add partner/referral system
-- Run: wrangler d1 execute funeralpress-db --remote --file=workers/migration-referrals.sql --config=workers/auth-api-wrangler.toml

-- Add partner fields to users (UNIQUE enforced via index below)
ALTER TABLE users ADD COLUMN is_partner INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN referral_code TEXT;
ALTER TABLE users ADD COLUMN partner_name TEXT;

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL,
  referred_user_id TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_partner ON referrals(partner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
