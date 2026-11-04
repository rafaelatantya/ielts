-- Cloudflare D1 Initial Migration for Oxford Atelier IELTS Studio
-- Tables: users, cloud_snapshots

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  picture TEXT,
  exam_track TEXT DEFAULT 'academic' CHECK (exam_track IN ('academic', 'general')),
  target_band REAL DEFAULT 7.5,
  exam_date TEXT,
  preferred_mic_label TEXT,
  created_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cloud_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  device_id TEXT NOT NULL,
  r2_object_key TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  counts_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cloud_snapshots_user_id ON cloud_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_snapshots_created_at ON cloud_snapshots(created_at DESC);
