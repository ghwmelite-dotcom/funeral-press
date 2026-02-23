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

ALTER TABLE users ADD COLUMN credits_remaining INTEGER DEFAULT 0;

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_ref ON orders(paystack_reference);
CREATE INDEX idx_unlocked_user ON unlocked_designs(user_id);
CREATE INDEX idx_unlocked_lookup ON unlocked_designs(user_id, design_id);
