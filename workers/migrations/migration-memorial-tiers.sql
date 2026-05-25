-- Memorial Premium Tiers (Tier-1): extend the per-memorial one-time unlock into
-- tiered + recurring subscriptions. plan_type distinguishes a one-time lifetime
-- unlock from an annual recurring one (expires_at = period end, NULL = lifetime;
-- expires_at is an epoch-ms integer, compared against Date.now() by the
-- entitlement resolver). Existing 'tribute' unlocks grandfather into 'premium'.
ALTER TABLE memorial_premium ADD COLUMN plan_type TEXT NOT NULL DEFAULT 'lifetime'; -- 'lifetime' | 'annual'
ALTER TABLE memorial_premium ADD COLUMN expires_at INTEGER;                          -- NULL = lifetime/never
ALTER TABLE memorial_premium ADD COLUMN paystack_subscription_code TEXT;             -- annual only

UPDATE memorial_premium SET tier = 'premium' WHERE tier = 'tribute' AND status = 'succeeded';

-- Link account-level subscriptions to a memorial when the sub funds a memorial tier.
ALTER TABLE subscriptions ADD COLUMN memorial_id TEXT;
ALTER TABLE subscriptions ADD COLUMN memorial_tier TEXT;

CREATE INDEX IF NOT EXISTS idx_mp_memorial ON memorial_premium(memorial_id);
CREATE INDEX IF NOT EXISTS idx_sub_memorial ON subscriptions(memorial_id);
