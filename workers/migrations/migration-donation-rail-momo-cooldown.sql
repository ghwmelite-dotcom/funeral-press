-- Memorial Donation Rail — payout MoMo cool-down columns
-- Adds 4 columns to memorials so a family head's MoMo change is queued for 24h
-- (fraud-mitigation window) before becoming the active payout target.
--
-- SQLite ALTER lacks IF NOT EXISTS for columns. Migration runner should treat
-- "duplicate column name" errors on these statements as success.

ALTER TABLE memorials ADD COLUMN pending_payout_momo_number   TEXT;
ALTER TABLE memorials ADD COLUMN pending_payout_momo_provider TEXT;
ALTER TABLE memorials ADD COLUMN pending_payout_account_name  TEXT;
ALTER TABLE memorials ADD COLUMN pending_payout_effective_at  INTEGER;
