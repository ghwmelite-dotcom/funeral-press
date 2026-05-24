-- Per-memorial one-time premium entitlement (Memorial Premium MVP step 1).
-- Owned by auth-api (has DB + Paystack). memorial_id is the KV memorial id
-- served by brochure-memorial-api. One paid row per memorial; status flips
-- pending -> succeeded on Paystack verify/webhook.
CREATE TABLE IF NOT EXISTS memorial_premium (
  id                  TEXT PRIMARY KEY,
  memorial_id         TEXT NOT NULL,
  tier                TEXT NOT NULL DEFAULT 'tribute',
  status              TEXT NOT NULL DEFAULT 'pending',   -- pending | succeeded | failed
  paystack_reference  TEXT NOT NULL UNIQUE,
  amount_pesewas      INTEGER NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'GHS',
  buyer_user_id       TEXT,
  created_at          INTEGER NOT NULL,
  succeeded_at        INTEGER
);
CREATE INDEX IF NOT EXISTS idx_memorial_premium_memorial ON memorial_premium(memorial_id, status);
CREATE INDEX IF NOT EXISTS idx_memorial_premium_ref ON memorial_premium(paystack_reference);
