CREATE TABLE "grup_uyeleri" (
	"grup_id" uuid NOT NULL,
	"kullanici_id" uuid NOT NULL,
	"rol" text DEFAULT 'uye' NOT NULL,
	"katilma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grup_uyeleri_grup_id_kullanici_id_pk" PRIMARY KEY("grup_id","kullanici_id"),
	CONSTRAINT "grup_uyeleri_rol_kontrol" CHECK ("grup_uyeleri"."rol" in ('yonetici', 'uye'))
);
--> statement-breakpoint
CREATE TABLE "gruplar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad" text NOT NULL,
	"aciklama" text,
	"davet_ozeti" text,
	"davet_bitis" timestamp with time zone,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gruplar_davet_ozeti_unique" UNIQUE("davet_ozeti"),
	CONSTRAINT "gruplar_ad_kontrol" CHECK (length("gruplar"."ad") between 1 and 80)
);
--> statement-breakpoint
ALTER TABLE "izler" ADD COLUMN "ortak_grup_id" uuid;--> statement-breakpoint
ALTER TABLE "grup_uyeleri" ADD CONSTRAINT "grup_uyeleri_grup_id_gruplar_id_fk" FOREIGN KEY ("grup_id") REFERENCES "public"."gruplar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grup_uyeleri" ADD CONSTRAINT "grup_uyeleri_kullanici_id_kullanicilar_id_fk" FOREIGN KEY ("kullanici_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grup_uyeleri_kullanici_idx" ON "grup_uyeleri" USING btree ("kullanici_id");--> statement-breakpoint
ALTER TABLE "izler" ADD CONSTRAINT "izler_ortak_grup_id_gruplar_id_fk" FOREIGN KEY ("ortak_grup_id") REFERENCES "public"."gruplar"("id") ON DELETE set null ON UPDATE no action;