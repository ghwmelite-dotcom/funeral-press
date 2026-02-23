-- Admin dashboard indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_paid ON orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_orders_plan ON orders(plan);
CREATE INDEX IF NOT EXISTS idx_unlocked_product ON unlocked_designs(product_type);
