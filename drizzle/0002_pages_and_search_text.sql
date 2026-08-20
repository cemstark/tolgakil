CREATE TABLE `pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(60) NOT NULL,
	`title` varchar(220) NOT NULL,
	`content` text NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `pages_slug_unique` UNIQUE(`slug`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `articles` ADD `search_text` text;
--> statement-breakpoint
-- drizzle-kit MySQL FULLTEXT indeksi üretemiyor (index() yalnızca btree/hash destekliyor),
-- bu yüzden elle. İndeks yeniden kuruluyor çünkü kapsamı DEĞİŞİYOR: content (HTML) çıkıyor,
-- search_text (düz metin) giriyor. MariaDB'de bir FULLTEXT indeksinin sütun listesi
-- değiştirilemez, ancak düşürülüp yeniden kurulabilir.
DROP INDEX `articles_fulltext_idx` ON `articles`;
--> statement-breakpoint
-- InnoDB FULLTEXT bütün sütunların aynı harmanlamada olmasını istiyor; üçü de tablo
-- varsayılanını (utf8mb4_unicode_ci) miras alıyor. Sözdizimi 10.11 uyumlu.
CREATE FULLTEXT INDEX `articles_fulltext_idx` ON `articles` (`title`, `excerpt`, `search_text`);
