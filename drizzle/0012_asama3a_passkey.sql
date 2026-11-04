CREATE TABLE "gecis_anahtarlari" (
	"id" text PRIMARY KEY NOT NULL,
	"kullanici_id" uuid NOT NULL,
	"acik_anahtar" text NOT NULL,
	"sayac" integer DEFAULT 0 NOT NULL,
	"aktarimlar" text,
	"ad" text NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	"son_kullanim" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "gecis_anahtarlari" ADD CONSTRAINT "gecis_anahtarlari_kullanici_id_kullanicilar_id_fk" FOREIGN KEY ("kullanici_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gecis_anahtarlari_kullanici_idx" ON "gecis_anahtarlari" USING btree ("kullanici_id");