-- Family referral program (spec §2.5, 2026-06-11-automated-growth-flywheel-design.md)
-- referrals.partner_id is the REFERRER for both types ('partner' and 'family').

ALTER TABLE referrals ADD COLUMN type TEXT DEFAULT 'partner';
ALTER TABLE referrals ADD COLUMN reward_status TEXT;          -- family only: pending | granted | review | capped
ALTER TABLE referrals ADD COLUMN reward_granted_at TEXT;
ALTER TABLE referrals ADD COLUMN ip_hash TEXT;                -- SHA-256 of referred user's IP at track time

ALTER TABLE users ADD COLUMN referral_balance_pesewas INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN referral_code_ip_hash TEXT;      -- SHA-256 of IP when code was generated

ALTER TABLE orders ADD COLUMN referral_discount_pesewas INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_referrals_type_status ON referrals(type, reward_status);
