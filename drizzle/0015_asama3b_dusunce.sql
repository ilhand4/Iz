CREATE TABLE "alintilar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sahip_id" uuid NOT NULL,
	"dugum_id" uuid NOT NULL,
	"metin" text NOT NULL,
	"yer" text,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alintilar_metin_kontrol" CHECK (length("alintilar"."metin") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "donemler" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sahip_id" uuid NOT NULL,
	"ad" text NOT NULL,
	"baslangic" date NOT NULL,
	"bitis" date,
	"renk" text DEFAULT 'kiremit' NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donemler_ad_kontrol" CHECK (length("donemler"."ad") between 1 and 80),
	CONSTRAINT "donemler_aralik_kontrol" CHECK ("donemler"."bitis" is null or "donemler"."bitis" >= "donemler"."baslangic")
);
--> statement-breakpoint
ALTER TABLE "baglar" ADD COLUMN "alinti_id" uuid;--> statement-breakpoint
ALTER TABLE "dugumler" ADD COLUMN "etki" text;--> statement-breakpoint
ALTER TABLE "izler" ADD COLUMN "ata_iz_id" uuid;--> statement-breakpoint
ALTER TABLE "izler" ADD COLUMN "ayrilma_sirasi" integer;--> statement-breakpoint
ALTER TABLE "alintilar" ADD CONSTRAINT "alintilar_sahip_id_kullanicilar_id_fk" FOREIGN KEY ("sahip_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alintilar" ADD CONSTRAINT "alintilar_dugum_id_dugumler_id_fk" FOREIGN KEY ("dugum_id") REFERENCES "public"."dugumler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donemler" ADD CONSTRAINT "donemler_sahip_id_kullanicilar_id_fk" FOREIGN KEY ("sahip_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alintilar_dugum_idx" ON "alintilar" USING btree ("dugum_id");--> statement-breakpoint
CREATE INDEX "donemler_sahip_idx" ON "donemler" USING btree ("sahip_id","baslangic");--> statement-breakpoint
ALTER TABLE "baglar" ADD CONSTRAINT "baglar_alinti_id_alintilar_id_fk" FOREIGN KEY ("alinti_id") REFERENCES "public"."alintilar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "izler" ADD CONSTRAINT "izler_ata_iz_id_izler_id_fk" FOREIGN KEY ("ata_iz_id") REFERENCES "public"."izler"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dugumler" ADD CONSTRAINT "dugumler_etki_kontrol" CHECK ("dugumler"."etki" is null or "dugumler"."etki" in ('degistirdi', 'iz_birakti', 'gecti'));