-- AI blog draft pipeline (spec §4.6). Drafts are AI-generated weekly, reviewed
-- by the owner in the admin dashboard, and served publicly once published.
CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  keywords TEXT DEFAULT '[]',          -- JSON array
  content TEXT NOT NULL,               -- JSON array of blocks {type, text|items|link}
  status TEXT DEFAULT 'draft',         -- draft | published | rejected
  source TEXT DEFAULT 'ai',
  topic TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS blog_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  used_at TEXT
);

INSERT INTO blog_topics (topic) VALUES
('How much does a funeral cost in Ghana in 2026 — a full breakdown by region'),
('What to write in a funeral tribute to your father'),
('What to write in a funeral tribute to your mother'),
('How to write an obituary for a Ghanaian funeral — structure and examples'),
('The order of service for a Ghanaian funeral, explained step by step'),
('What is a one-week celebration (observance) and how do families plan it'),
('Choosing funeral hymns: 15 beloved hymns for Ghanaian services and when to sing them'),
('Twi funeral hymns and their meanings'),
('What to wear to a Ghanaian funeral: colours, cloth, and what they signify'),
('Adinkra symbols at funerals: meanings families should know'),
('How to plan a funeral in Ghana from the UK: a practical checklist'),
('How to plan a funeral in Ghana from the US: a practical checklist'),
('Repatriation of remains to Ghana: process, costs, and timelines'),
('How families share funeral costs fairly — and keep the peace'),
('Funeral donations (nsawa): etiquette for givers and families'),
('How to organise a livestream of a funeral service for relatives abroad'),
('Writing a eulogy when grief makes words hard'),
('Funeral brochure vs programme booklet: what to choose and why'),
('How many funeral brochures should you print? A planning guide'),
('Choosing a funeral venue in Accra: questions to ask'),
('Choosing a funeral venue in Kumasi: questions to ask'),
('What does a funeral committee do? Roles and responsibilities'),
('Aseda (thanksgiving) cloth: tradition, design, and modern labels'),
('Funeral poster design: what must be on it and what to leave off'),
('How soon after death is a funeral held in Ghana? Timelines explained'),
('Mortuary and preservation costs in Ghana: what families should budget'),
('The family meeting: how funeral decisions get made in Ghanaian families'),
('Widow and widower rites in Ghana: tradition and modern practice'),
('How churches shape Ghanaian funeral services: what to coordinate with your pastor'),
('Muslim funerals in Ghana: timelines, rites, and announcements'),
('Memorial pages vs printed brochures: why families now do both'),
('QR codes on funeral brochures: how they connect mourners to memorials'),
('Digital guest books: collecting condolences from around the world'),
('Thank-you cards after a funeral: wording examples that feel right'),
('Acknowledgement messages for funeral brochures: 12 examples'),
('Funeral catering in Ghana: planning quantities and budgets'),
('One-year anniversary remembrance: how families mark it'),
('How to choose photographs for a funeral brochure'),
('Writing tributes from grandchildren: prompts and examples'),
('The biography section: turning a life into two pages'),
('Funeral invitation cards: who receives them and what they say'),
('Announcing a death on radio vs WhatsApp vs print: what works now'),
('How to budget a funeral with the FuneralPress planner: a walkthrough'),
('Printing funeral materials: paper, sizes, and finishes explained'),
('Wreath cards and flower tributes: what to write'),
('Keeping funeral costs down without losing dignity: 10 practical choices'),
('What happens at a Ghanaian wake-keeping'),
('Appellations and praise names in funeral programmes'),
('How diaspora families coordinate funerals across time zones'),
('Grief support in Ghana: where families find help after the funeral');
