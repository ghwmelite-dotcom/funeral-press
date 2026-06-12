-- Run: npx wrangler d1 execute funeralpress-db --file=workers/migrations/migration-obituary-indexing.sql --remote
-- Opt-in search indexing for obituaries (spec §4.4).
-- Default 0: existing obituaries become noindex until the family opts in —
-- deliberate consent-first behavior change (plan correction #2).
ALTER TABLE obituary_pages ADD COLUMN search_indexable INTEGER DEFAULT 0;
