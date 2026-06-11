-- Multi-currency support (spec §3, 2026-06-11-automated-growth-flywheel-design.md)
-- orders.amount_pesewas is reinterpreted as "amount in minor units of `currency`";
-- the column is not renamed to avoid touching every existing query.

ALTER TABLE orders ADD COLUMN currency TEXT DEFAULT 'GHS';
ALTER TABLE orders ADD COLUMN stripe_session_id TEXT;

ALTER TABLE subscriptions ADD COLUMN currency TEXT DEFAULT 'GHS';
ALTER TABLE subscriptions ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN stripe_customer_id TEXT;

-- Plain (non-partial) unique indexes: SQLite allows unlimited NULLs in a UNIQUE
-- index, and the ON CONFLICT(stripe_subscription_id) upserts in the webhook
-- require a non-partial conflict target.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subs_stripe_sub ON subscriptions(stripe_subscription_id);
