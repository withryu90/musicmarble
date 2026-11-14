CREATE TABLE online_rooms (
 code TEXT PRIMARY KEY NOT NULL,
 create_key TEXT NOT NULL UNIQUE,
 payload TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,
 expires_at INTEGER NOT NULL
);
CREATE INDEX online_rooms_expiry ON online_rooms(expires_at);
