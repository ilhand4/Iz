-- İz geliştirme veritabanı kurulumu
-- pgAdmin 4'te "postgres" kullanıcısıyla Query Tool açıp çalıştırın.
-- 1) Aşağıdaki şifreyi kendinize göre değiştirin ve aynısını .env dosyasındaki DATABASE_URL'e yazın.

CREATE ROLE iz WITH LOGIN PASSWORD 'SIFRE_BURAYA';

-- 2) Veritabanı: UTF-8, Türkçe sıralama (ICU tr-TR) ile.
--    "CREATE DATABASE" bir işlem bloğunda çalışamaz; pgAdmin'de bu satırı ayrıca seçip çalıştırmanız gerekebilir.
CREATE DATABASE iz_dev
	WITH OWNER iz
	ENCODING 'UTF8'
	LOCALE_PROVIDER icu
	ICU_LOCALE 'tr-TR'
	TEMPLATE template0;
