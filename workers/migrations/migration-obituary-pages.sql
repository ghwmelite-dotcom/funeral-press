-- ============================================================
-- Migration: Obituary Pages
-- Date: 2026-05-02
-- ============================================================

CREATE TABLE IF NOT EXISTS obituary_pages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  slug TEXT NOT NULL UNIQUE,
  deceased_name TEXT NOT NULL,
  deceased_photo TEXT,
  birth_date TEXT,
  death_date TEXT,
  biography TEXT,
  funeral_date TEXT,
  funeral_time TEXT,
  funeral_venue TEXT,
  venue_address TEXT,
  family_members TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_obituary_pages_slug ON obituary_pages(slug);
CREATE INDEX IF NOT EXISTS idx_obituary_pages_user_id ON obituary_pages(user_id);
