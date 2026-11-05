-- PostGIS: eklenti güvenilir (trusted) değildir; yerelde süper kullanıcı (postgres) bir kez
-- "CREATE EXTENSION postgis;" çalıştırmalıdır (db/kurulum.sql). Varsa bu satır bir şey yapmaz.
CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
-- Koordinatlar enlem/boylam sütunlarında kalır; coğrafi nokta onlardan üretilir (veri kaybı yok)
ALTER TABLE "dugumler" ADD COLUMN "konum" geography(Point, 4326) GENERATED ALWAYS AS (case when "dugumler"."enlem" is not null and "dugumler"."boylam" is not null then st_setsrid(st_makepoint("dugumler"."boylam", "dugumler"."enlem"), 4326)::geography end) STORED;--> statement-breakpoint
CREATE INDEX "dugumler_konum_idx" ON "dugumler" USING gist ("konum");
