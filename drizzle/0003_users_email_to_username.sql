-- ELLE YAZILDI. drizzle-kit bu değişikliği DROP COLUMN + ADD COLUMN olarak üretiyor
-- (etkileşimli soruya "rename" yanıtı verilemedi: kabukta TTY yok). O SQL üretimde
-- kabul edilemez: `users` tablosunda gerçek satırlar var ve NOT NULL UNIQUE bir sütunu
-- düşürüp yeniden eklemek ya giriş kimliklerini siler ya da MariaDB'nin varsayılan
-- değer üretemediği yerde migration'ı düşürür.
--
-- CHANGE COLUMN sütunu YERİNDE yeniden adlandırıyor: veri satırda kalıyor, UNIQUE
-- indeks korunuyor. Tip birebir tekrarlanmak ZORUNDA — CHANGE COLUMN tam tanım bekler,
-- eksik yazılan bir NOT NULL sessizce nullable bir sütun bırakırdı.
ALTER TABLE `users` CHANGE COLUMN `email` `username` varchar(190) NOT NULL;
--> statement-breakpoint
-- İndeksin ADI da düzeltiliyor. CHANGE COLUMN indeksi taşıyor ama eski adıyla
-- (`users_email_unique`) bırakıyor; drizzle anlık görüntüsü ise `users_username_unique`
-- bekliyor ve ad farkı bir sonraki `db:generate` çağrısında hayalet bir diff üretirdi.
-- RENAME INDEX MariaDB 10.5.2'den beri var, hedef sunucu 10.11.
ALTER TABLE `users` RENAME INDEX `users_email_unique` TO `users_username_unique`;
