-- ============================================================
-- Migration: Subscriptions
-- Date: 2026-04-02
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  paystack_subscription_code TEXT UNIQUE,
  paystack_customer_code TEXT,
  paystack_email_token TEXT,
  current_period_start TEXT,
  current_period_end TEXT,
  monthly_credits_remaining INTEGER DEFAULT 15,
  cancel_at_period_end INTEGER DEFAULT 0,
  cancelled_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscription_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id TEXT REFERENCES subscriptions(id),
  event_type TEXT NOT NULL,
  detail TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sub_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_sub_period ON subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_sub_events_sub ON subscription_events(subscription_id);
