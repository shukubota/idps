CREATE TABLE `members` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`name` varchar(100) NOT NULL,
	`email_verified` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `members_id` PRIMARY KEY(`id`),
	CONSTRAINT `members_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `oauth_clients` (
	`client_id` varchar(255) NOT NULL,
	`client_secret` varchar(255),
	`name` varchar(100) NOT NULL,
	`redirect_uris` json NOT NULL,
	`grant_types` json NOT NULL,
	`response_types` json NOT NULL,
	`scope` varchar(500) NOT NULL,
	`is_public` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `oauth_clients_client_id` PRIMARY KEY(`client_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_email` ON `members` (`email`);--> statement-breakpoint
CREATE INDEX `idx_email_verified` ON `members` (`email_verified`);