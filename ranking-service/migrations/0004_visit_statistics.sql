CREATE TABLE IF NOT EXISTS visit_events (
 id TEXT PRIMARY KEY NOT NULL,
 created_at INTEGER NOT NULL,
 visitor_hash TEXT NOT NULL,
 ip TEXT NOT NULL,
 country TEXT NOT NULL DEFAULT '',
 region TEXT NOT NULL DEFAULT '',
 city TEXT NOT NULL DEFAULT '',
 device TEXT NOT NULL DEFAULT '',
 browser TEXT NOT NULL DEFAULT '',
 source TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS visit_events_time ON visit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS visit_events_visitor_time ON visit_events(visitor_hash,created_at);
