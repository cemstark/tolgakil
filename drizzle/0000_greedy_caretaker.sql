CREATE TABLE `articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(190) NOT NULL,
	`title` varchar(220) NOT NULL,
	`excerpt` varchar(400) NOT NULL,
	`content` text NOT NULL,
	`cover_media_id` int,
	`author_id` int,
	`category_id` int,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`published_at` timestamp,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`meta_title` varchar(220),
	`meta_description` varchar(400),
	CONSTRAINT `articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `articles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(190) NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` varchar(400),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `lawyers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(190) NOT NULL,
	`full_name` varchar(160) NOT NULL,
	`title` varchar(120) NOT NULL,
	`bar_association` varchar(120),
	`bar_registry_no` varchar(40),
	`tbb_registry_no` varchar(40),
	`practice_start_date` date,
	`university` varchar(160),
	`languages` varchar(255),
	`email` varchar(190),
	`photo_media_id` int,
	`bio` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_published` boolean NOT NULL DEFAULT false,
	CONSTRAINT `lawyers_id` PRIMARY KEY(`id`),
	CONSTRAINT `lawyers_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filename` varchar(255) NOT NULL,
	`path` varchar(255) NOT NULL,
	`alt_text` varchar(255) NOT NULL,
	`width` int NOT NULL,
	`height` int NOT NULL,
	`size_bytes` int NOT NULL,
	`uploaded_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_path_unique` UNIQUE(`path`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`email` varchar(190) NOT NULL,
	`phone` varchar(40),
	`subject` varchar(220) NOT NULL,
	`body` text NOT NULL,
	`kvkk_accepted_at` timestamp,
	`ip` varchar(45),
	`user_agent` varchar(255),
	`is_read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practice_areas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(190) NOT NULL,
	`name` varchar(160) NOT NULL,
	`summary` varchar(400) NOT NULL,
	`content` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_published` boolean NOT NULL DEFAULT false,
	CONSTRAINT `practice_areas_id` PRIMARY KEY(`id`),
	CONSTRAINT `practice_areas_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int NOT NULL,
	`office_name` varchar(160) NOT NULL,
	`address` varchar(400) NOT NULL,
	`phone` varchar(40) NOT NULL,
	`whatsapp` varchar(40),
	`email` varchar(190) NOT NULL,
	`kep` varchar(190),
	`map_lat` varchar(32),
	`map_lng` varchar(32),
	`social_links` varchar(500),
	`footer_text` varchar(500),
	CONSTRAINT `settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(190) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('admin','editor') NOT NULL DEFAULT 'editor',
	`name` varchar(120) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_login_at` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `articles` ADD CONSTRAINT `articles_cover_media_id_media_id_fk` FOREIGN KEY (`cover_media_id`) REFERENCES `media`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `articles` ADD CONSTRAINT `articles_author_id_lawyers_id_fk` FOREIGN KEY (`author_id`) REFERENCES `lawyers`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `articles` ADD CONSTRAINT `articles_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lawyers` ADD CONSTRAINT `lawyers_photo_media_id_media_id_fk` FOREIGN KEY (`photo_media_id`) REFERENCES `media`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media` ADD CONSTRAINT `media_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `articles_status_published_at_idx` ON `articles` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `articles_category_id_idx` ON `articles` (`category_id`);--> statement-breakpoint
CREATE INDEX `messages_created_at_idx` ON `messages` (`created_at`);