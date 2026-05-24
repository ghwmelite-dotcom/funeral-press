-- AI Tribute Video render jobs (premium-gated). Owned by auth-api.
-- A row is created when a render is enqueued with Shotstack; status flips
-- rendering -> ready (output copied to R2) | failed.
CREATE TABLE IF NOT EXISTS tribute_videos (
  id            TEXT PRIMARY KEY,
  memorial_id   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'rendering',  -- rendering | ready | failed
  shotstack_id  TEXT,
  caption       TEXT,
  output_url    TEXT,
  error         TEXT,
  created_at    INTEGER NOT NULL,
  ready_at      INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tribute_videos_memorial ON tribute_videos(memorial_id, created_at DESC);
