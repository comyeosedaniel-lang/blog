CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  confirmed INTEGER NOT NULL DEFAULT 0,
  confirm_token TEXT NOT NULL,
  unsubscribe_token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers (email);
