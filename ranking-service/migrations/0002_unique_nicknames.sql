-- Keep every historical score. Reserve one canonical entry per existing nickname.
CREATE TABLE IF NOT EXISTS ranking_nicknames (
 nickname TEXT PRIMARY KEY NOT NULL,
 game_id TEXT NOT NULL REFERENCES ranking_games(id),
 player_id INTEGER NOT NULL,
 registered_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO ranking_nicknames (nickname,game_id,player_id,registered_at)
SELECT nickname,game_id,player_id,completed_at FROM (
 SELECT *,ROW_NUMBER() OVER (PARTITION BY nickname ORDER BY score DESC,completed_at ASC,game_id ASC,player_id ASC) AS position
 FROM ranking_scores
) WHERE position=1;
