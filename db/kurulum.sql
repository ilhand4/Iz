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

-- 3) PostGIS (Aşama 5): önce Stack Builder → PostgreSQL 18 → Spatial Extensions → PostGIS Bundle kurulur.
--    Sonra pgAdmin'de iz_dev veritabanını seçip, yine "postgres" kullanıcısıyla:
--    (Eklenti güvenilir değildir; iz rolü kendisi açamaz. Açıldıktan sonra migration'lar çalışır.)
CREATE EXTENSION IF NOT EXISTS postgis;
