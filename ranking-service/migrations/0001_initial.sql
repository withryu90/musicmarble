CREATE TABLE `ranking_games` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`roster` text NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `ranking_scores` (
	`game_id` text NOT NULL,
	`player_id` integer NOT NULL,
	`nickname` text NOT NULL,
	`score` integer NOT NULL,
	`completed_at` integer NOT NULL,
	PRIMARY KEY(`game_id`, `player_id`),
	FOREIGN KEY (`game_id`) REFERENCES `ranking_games`(`id`) ON UPDATE no action ON DELETE no action
);
