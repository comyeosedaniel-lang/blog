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

CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'ko',
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  content_json TEXT,
  nav_label TEXT,
  nav_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  updated_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (lang, slug)
);

CREATE INDEX IF NOT EXISTS idx_pages_lang_nav ON pages (lang, published, nav_order);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  size INTEGER NOT NULL,
  content_type TEXT,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  ko TEXT NOT NULL,
  en TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO categories (id, ko, en, sort_order) VALUES
  ('dev', '개발 이야기', 'Dev Stories', 0),
  ('book', '책 이야기', 'Book Stories', 1),
  ('life', '나의 이야기', 'My Story', 2),
  ('us', '우리의 이야기', 'Our Story', 3);

CREATE TABLE IF NOT EXISTS feed_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL UNIQUE,
  summary TEXT,
  published_at TEXT,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_feed_items_reviewed_fetched ON feed_items (reviewed, fetched_at DESC);
