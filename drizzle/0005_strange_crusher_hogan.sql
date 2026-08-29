ALTER TABLE `articles` ADD `practice_area_id` int;--> statement-breakpoint
ALTER TABLE `articles` ADD CONSTRAINT `articles_practice_area_id_practice_areas_id_fk` FOREIGN KEY (`practice_area_id`) REFERENCES `practice_areas`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `articles_practice_area_id_idx` ON `articles` (`practice_area_id`);