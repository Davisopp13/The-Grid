CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  port TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  transcript TEXT,
  source TEXT,
  metadata_json TEXT,
  asset_key TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_created_at
  ON reports (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_port_created_at
  ON reports (port, created_at DESC);

CREATE TABLE IF NOT EXISTS ingest_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  source TEXT,
  status TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ingest_events_created_at
  ON ingest_events (created_at DESC);
