-- Memorial Premium Tiers (Tier-1): extend the per-memorial one-time unlock into
-- tiered + recurring subscriptions. plan_type distinguishes a one-time lifetime
-- unlock from an annual recurring one (expires_at = period end, NULL = lifetime;
-- expires_at is an epoch-ms integer, compared against Date.now() by the
-- entitlement resolver). Existing 'tribute' unlocks grandfather into 'premium'.
ALTER TABLE memorial_premium ADD COLUMN plan_type TEXT NOT NULL DEFAULT 'lifetime'; -- 'lifetime' | 'annual'
ALTER TABLE memorial_premium ADD COLUMN expires_at INTEGER;                          -- NULL = lifetime/never
ALTER TABLE memorial_premium ADD COLUMN paystack_subscription_code TEXT;             -- annual only
ALTER TABLE memorial_premium ADD COLUMN updated_at TEXT;                             -- ISO timestamp; set on UPSERT/renewal

UPDATE memorial_premium SET tier = 'premium' WHERE tier = 'tribute' AND status = 'succeeded';

-- Collapse any duplicate (memorial_id, plan_type) rows that were created before
-- plan_type was added (all defaulted to 'lifetime', so existing rows can share
-- the same (memorial_id, 'lifetime') pair). Keep the best row: a succeeded row
-- wins; otherwise the most recent (by created_at DESC, rowid DESC). This must
-- run before the unique index below, or the CREATE would fail.
DELETE FROM memorial_premium
WHERE rowid NOT IN (
  SELECT rowid FROM memorial_premium mp
  WHERE rowid = (
    SELECT rowid FROM memorial_premium mp2
    WHERE mp2.memorial_id = mp.memorial_id AND mp2.plan_type = mp.plan_type
    ORDER BY (status = 'succeeded') DESC, created_at DESC, rowid DESC
    LIMIT 1
  )
);

-- Back the ON CONFLICT(memorial_id, plan_type) used in the subscription.create
-- webhook UPSERT. Without this unique constraint real D1/SQLite throws:
-- "ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint".
CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_memorial_plan ON memorial_premium(memorial_id, plan_type);

-- Link account-level subscriptions to a memorial when the sub funds a memorial tier.
ALTER TABLE subscriptions ADD COLUMN memorial_id TEXT;
ALTER TABLE subscriptions ADD COLUMN memorial_tier TEXT;

CREATE INDEX IF NOT EXISTS idx_mp_memorial ON memorial_premium(memorial_id);
CREATE INDEX IF NOT EXISTS idx_sub_memorial ON subscriptions(memorial_id);
