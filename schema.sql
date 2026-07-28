CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'ko',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'life',
  tags TEXT NOT NULL DEFAULT '[]',
  content_html TEXT NOT NULL,
  content_json TEXT,
  hero_image_url TEXT,
  pub_date TEXT NOT NULL,
  updated_date TEXT,
  draft INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (lang, slug)
);

CREATE INDEX IF NOT EXISTS idx_posts_lang_draft_pubdate ON posts (lang, draft, pub_date);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts (category);
