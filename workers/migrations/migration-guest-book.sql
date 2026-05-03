-- ============================================================
-- Migration: Guest Book
-- Date: 2026-05-02
-- Adds guest_books + guest_entries tables for memorial guest book feature.
-- ============================================================

CREATE TABLE IF NOT EXISTS guest_books (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  slug TEXT NOT NULL UNIQUE,
  deceased_name TEXT NOT NULL,
  deceased_photo TEXT,
  cover_message TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guest_entries (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES guest_books(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT,
  photo_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_guest_books_slug ON guest_books(slug);
CREATE INDEX IF NOT EXISTS idx_guest_books_user_id ON guest_books(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_entries_book ON guest_entries(book_id);
