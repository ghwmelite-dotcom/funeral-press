-- ============================================================
-- LEGACY REFERENCE — Do NOT apply this file. Runtime schema
-- lives in workers/migrations/. This file is a snapshot of
-- the original V1 tables, kept for historical reference only.
-- ============================================================

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE designs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_type TEXT NOT NULL,
  name TEXT DEFAULT 'Untitled',
  data TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_google ON users(google_id);
CREATE INDEX idx_designs_user ON designs(user_id, product_type);
CREATE INDEX idx_refresh_hash ON refresh_tokens(token_hash);

-- Partner/referral system (migration-referrals.sql)
-- users table also has: is_partner INTEGER DEFAULT 0, referral_code TEXT UNIQUE, partner_name TEXT

CREATE TABLE referrals (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL,
  referred_user_id TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_referrals_partner ON referrals(partner_id);
CREATE INDEX idx_users_referral_code ON users(referral_code);

-- Payment / credits system (migration-purchases.sql)
-- users table also has: credits_remaining INTEGER DEFAULT 0 (-1 = unlimited)

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  amount_pesewas INTEGER NOT NULL,
  currency TEXT DEFAULT 'GHS',
  paystack_reference TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  partner_id TEXT,
  commission_rate REAL,
  commission_amount INTEGER,
  paid_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE unlocked_designs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  design_id TEXT NOT NULL,
  product_type TEXT NOT NULL,
  unlocked_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, design_id)
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_ref ON orders(paystack_reference);
CREATE INDEX idx_unlocked_user ON unlocked_designs(user_id);
CREATE INDEX idx_unlocked_lookup ON unlocked_designs(user_id, design_id);
