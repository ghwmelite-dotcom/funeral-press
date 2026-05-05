-- ============================================================
-- Migration: Onboarding Tour Dismissal
-- Date: 2026-05-02
-- Adds users.onboarded_at to persist when a user has completed
-- (or skipped) the welcome tour, so the tour does not re-show
-- across devices or sessions.
-- ============================================================

ALTER TABLE users ADD COLUMN onboarded_at TEXT DEFAULT NULL;
