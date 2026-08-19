-- drizzle-kit MySQL FULLTEXT indeksi üretemiyor (index() yalnızca btree/hash destekliyor),
-- bu yüzden elle. MariaDB 10.11 InnoDB FULLTEXT destekliyor; sözdizimi 10.11 uyumlu.
CREATE FULLTEXT INDEX `articles_fulltext_idx` ON `articles` (`title`, `excerpt`, `content`);
