-- ============================================================
-- Migration: Photo Gallery
-- Date: 2026-05-02
-- ============================================================

CREATE TABLE IF NOT EXISTS photo_galleries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  deceased_name TEXT,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gallery_photos (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL REFERENCES photo_galleries(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_photo_galleries_slug ON photo_galleries(slug);
CREATE INDEX IF NOT EXISTS idx_photo_galleries_user_id ON photo_galleries(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_gallery_id ON gallery_photos(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_sort ON gallery_photos(gallery_id, sort_order);
