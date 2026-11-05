CREATE TABLE "fotograflar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sahip_id" uuid NOT NULL,
	"dugum_id" uuid NOT NULL,
	"donem" text NOT NULL,
	"yil" integer,
	"aciklama" text,
	"kaynak" text,
	"hak" text NOT NULL,
	"genislik" integer NOT NULL,
	"yukseklik" integer NOT NULL,
	"boyut" integer NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fotograflar_donem_kontrol" CHECK ("fotograflar"."donem" in ('eski', 'yeni')),
	CONSTRAINT "fotograflar_hak_kontrol" CHECK ("fotograflar"."hak" in ('kendi', 'aile', 'izinli', 'kamu')),
	CONSTRAINT "fotograflar_yil_kontrol" CHECK ("fotograflar"."yil" is null or "fotograflar"."yil" between 1800 and 2200)
);
--> statement-breakpoint
ALTER TABLE "fotograflar" ADD CONSTRAINT "fotograflar_sahip_id_kullanicilar_id_fk" FOREIGN KEY ("sahip_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fotograflar" ADD CONSTRAINT "fotograflar_dugum_id_dugumler_id_fk" FOREIGN KEY ("dugum_id") REFERENCES "public"."dugumler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fotograflar_dugum_idx" ON "fotograflar" USING btree ("dugum_id","olusturma");