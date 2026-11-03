CREATE TYPE "public"."dugum_turu" AS ENUM('eser', 'kisi', 'yer', 'karar', 'ani');--> statement-breakpoint
CREATE TYPE "public"."eser_turu" AS ENUM('kitap', 'film', 'dizi', 'muzik', 'oyun', 'podcast');--> statement-breakpoint
CREATE TYPE "public"."gizlilik" AS ENUM('ozel', 'grup', 'herkes');--> statement-breakpoint
CREATE TYPE "public"."tarih_hassasiyeti" AS ENUM('gun', 'ay', 'yil');--> statement-breakpoint
CREATE TABLE "baglar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sahip_id" uuid NOT NULL,
	"kaynak_id" uuid NOT NULL,
	"hedef_id" uuid NOT NULL,
	"not" text,
	"tarih" date,
	"tarih_hassasiyeti" "tarih_hassasiyeti",
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "baglar_kaynak_hedef_tekil" UNIQUE("kaynak_id","hedef_id"),
	CONSTRAINT "baglar_kendine_bag_kontrol" CHECK ("baglar"."kaynak_id" <> "baglar"."hedef_id"),
	CONSTRAINT "baglar_tarih_kontrol" CHECK (("baglar"."tarih" is null) = ("baglar"."tarih_hassasiyeti" is null))
);
--> statement-breakpoint
CREATE TABLE "dugumler" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sahip_id" uuid NOT NULL,
	"tur" "dugum_turu" NOT NULL,
	"eser_turu" "eser_turu",
	"baslik" text NOT NULL,
	"alt_baslik" text,
	"aciklama" text,
	"tarih" date,
	"tarih_hassasiyeti" "tarih_hassasiyeti",
	"yil" integer,
	"enlem" double precision,
	"boylam" double precision,
	"yer_adi" text,
	"gizlilik" "gizlilik" DEFAULT 'ozel' NOT NULL,
	"dis_kaynak" text,
	"dis_kimlik" text,
	"gorsel_url" text,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	"guncelleme" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dugumler_eser_turu_kontrol" CHECK (("dugumler"."tur" = 'eser') = ("dugumler"."eser_turu" is not null)),
	CONSTRAINT "dugumler_konum_kontrol" CHECK (("dugumler"."enlem" is null) = ("dugumler"."boylam" is null) and ("dugumler"."enlem" is null or ("dugumler"."enlem" between -90 and 90 and "dugumler"."boylam" between -180 and 180))),
	CONSTRAINT "dugumler_tarih_kontrol" CHECK (("dugumler"."tarih" is null) = ("dugumler"."tarih_hassasiyeti" is null)),
	CONSTRAINT "dugumler_baslik_kontrol" CHECK (length("dugumler"."baslik") between 1 and 200)
);
--> statement-breakpoint
CREATE TABLE "iz_adimlari" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iz_id" uuid NOT NULL,
	"dugum_id" uuid NOT NULL,
	"sira" integer NOT NULL,
	"not" text,
	CONSTRAINT "iz_adimlari_sira_tekil" UNIQUE("iz_id","sira")
);
--> statement-breakpoint
CREATE TABLE "izler" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sahip_id" uuid NOT NULL,
	"baslik" text NOT NULL,
	"aciklama" text,
	"gizlilik" "gizlilik" DEFAULT 'ozel' NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	"guncelleme" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kullanicilar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kullanici_adi" text NOT NULL,
	"eposta" text NOT NULL,
	"ad" text NOT NULL,
	"sifre_ozeti" text NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oturumlar" (
	"id" text PRIMARY KEY NOT NULL,
	"kullanici_id" uuid NOT NULL,
	"bitis" timestamp with time zone NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "baglar" ADD CONSTRAINT "baglar_sahip_id_kullanicilar_id_fk" FOREIGN KEY ("sahip_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baglar" ADD CONSTRAINT "baglar_kaynak_id_dugumler_id_fk" FOREIGN KEY ("kaynak_id") REFERENCES "public"."dugumler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baglar" ADD CONSTRAINT "baglar_hedef_id_dugumler_id_fk" FOREIGN KEY ("hedef_id") REFERENCES "public"."dugumler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dugumler" ADD CONSTRAINT "dugumler_sahip_id_kullanicilar_id_fk" FOREIGN KEY ("sahip_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iz_adimlari" ADD CONSTRAINT "iz_adimlari_iz_id_izler_id_fk" FOREIGN KEY ("iz_id") REFERENCES "public"."izler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iz_adimlari" ADD CONSTRAINT "iz_adimlari_dugum_id_dugumler_id_fk" FOREIGN KEY ("dugum_id") REFERENCES "public"."dugumler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "izler" ADD CONSTRAINT "izler_sahip_id_kullanicilar_id_fk" FOREIGN KEY ("sahip_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oturumlar" ADD CONSTRAINT "oturumlar_kullanici_id_kullanicilar_id_fk" FOREIGN KEY ("kullanici_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "baglar_hedef_idx" ON "baglar" USING btree ("hedef_id");--> statement-breakpoint
CREATE INDEX "baglar_sahip_idx" ON "baglar" USING btree ("sahip_id");--> statement-breakpoint
CREATE INDEX "dugumler_sahip_idx" ON "dugumler" USING btree ("sahip_id","olusturma");--> statement-breakpoint
CREATE INDEX "dugumler_gizlilik_idx" ON "dugumler" USING btree ("gizlilik");--> statement-breakpoint
CREATE UNIQUE INDEX "dugumler_dis_kaynak_tekil" ON "dugumler" USING btree ("sahip_id","dis_kaynak","dis_kimlik") WHERE "dugumler"."dis_kimlik" is not null;--> statement-breakpoint
CREATE INDEX "iz_adimlari_dugum_idx" ON "iz_adimlari" USING btree ("dugum_id");--> statement-breakpoint
CREATE INDEX "izler_sahip_idx" ON "izler" USING btree ("sahip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kullanicilar_kullanici_adi_tekil" ON "kullanicilar" USING btree ("kullanici_adi");--> statement-breakpoint
CREATE UNIQUE INDEX "kullanicilar_eposta_tekil" ON "kullanicilar" USING btree ("eposta");--> statement-breakpoint
CREATE INDEX "oturumlar_kullanici_idx" ON "oturumlar" USING btree ("kullanici_id");