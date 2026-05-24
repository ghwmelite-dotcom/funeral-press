CREATE TABLE memorial_tributes (
  id                 TEXT PRIMARY KEY,
  memorial_id        TEXT NOT NULL,
  type               TEXT NOT NULL,                   -- candle | flowers | tribute
  author_name        TEXT NOT NULL,
  message            TEXT,
  amount_pesewas     INTEGER NOT NULL,
  paystack_reference TEXT NOT NULL UNIQUE,
  status             TEXT NOT NULL DEFAULT 'pending', -- pending | paid | hidden
  created_at         INTEGER NOT NULL,
  paid_at            INTEGER
);
CREATE INDEX idx_tributes_memorial ON memorial_tributes(memorial_id, status, created_at);
