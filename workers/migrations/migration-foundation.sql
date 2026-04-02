-- ============================================================
-- Migration: Foundation (RBAC, Audit Log, Analytics, Soft Deletes)
-- Date: 2026-04-02
-- ============================================================

-- Role-Based Access Control
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  permissions TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_by TEXT REFERENCES users(id),
  granted_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, role_id)
);

-- Seed default roles
INSERT OR IGNORE INTO roles (id, name, permissions) VALUES
  ('role_admin', 'admin', '{"all": true}');
INSERT OR IGNORE INTO roles (id, name, permissions) VALUES
  ('role_manager', 'manager', '{"users.read": true, "orders.read": true, "designs.read": true, "partners.read": true, "notifications.read": true}');
INSERT OR IGNORE INTO roles (id, name, permissions) VALUES
  ('role_partner', 'partner', '{"partner.dashboard": true, "partner.referrals": true, "partner.profile": true}');
INSERT OR IGNORE INTO roles (id, name, permissions) VALUES
  ('role_user', 'user', '{"designs.own": true, "orders.own": true}');

-- Audit Trail
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  detail TEXT DEFAULT '{}',
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Analytics Events
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Soft Deletes (add deleted_at column to existing tables)
-- Note: D1 SQLite supports ALTER TABLE ADD COLUMN
ALTER TABLE users ADD COLUMN deleted_at TEXT DEFAULT NULL;
ALTER TABLE designs ADD COLUMN deleted_at TEXT DEFAULT NULL;
ALTER TABLE orders ADD COLUMN deleted_at TEXT DEFAULT NULL;
ALTER TABLE print_orders ADD COLUMN deleted_at TEXT DEFAULT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_designs_deleted ON designs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_orders_deleted ON orders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_print_orders_deleted ON print_orders(deleted_at);
