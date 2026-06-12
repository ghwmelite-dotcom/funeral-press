-- Run: npx wrangler d1 execute funeralpress-db --file=workers/migrations/migration-obituary-updated-at.sql --remote
-- Hotfix (2026-06-12, applied to production during the Phase C deploy):
-- the live obituary_pages table was created from an older DDL without
-- updated_at, but the indexing toggle and obituary sitemap read/write it.
-- SQLite ALTER cannot add a column with a non-constant default, hence the
-- backfill UPDATE.
ALTER TABLE obituary_pages ADD COLUMN updated_at TEXT;
UPDATE obituary_pages SET updated_at = created_at WHERE updated_at IS NULL;
