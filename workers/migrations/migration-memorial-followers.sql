-- Memorial Engagement (Phase B): follow-a-memorial + anniversary reminder sweep.
-- memorial_meta denormalizes the deceased's anniversary month-days (MM-DD) so the
-- daily sweep is a pure D1 query (no cross-worker KV reads). last_reminder_md
-- guards against double-sending on the same day.
CREATE TABLE memorial_meta (
  memorial_id      TEXT PRIMARY KEY,
  deceased_name    TEXT,
  birth_md         TEXT,                 -- 'MM-DD' or NULL
  death_md         TEXT,                 -- 'MM-DD' or NULL
  last_reminder_md TEXT,                 -- 'MM-DD' last swept, prevents same-day resend
  updated_at       INTEGER NOT NULL
);

CREATE TABLE memorial_followers (
  id                TEXT PRIMARY KEY,
  memorial_id       TEXT NOT NULL,
  email             TEXT NOT NULL,
  user_id           TEXT,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  created_at        INTEGER NOT NULL,
  UNIQUE(memorial_id, email)
);

CREATE INDEX idx_followers_memorial ON memorial_followers(memorial_id);
CREATE INDEX idx_meta_birth ON memorial_meta(birth_md);
CREATE INDEX idx_meta_death ON memorial_meta(death_md);
