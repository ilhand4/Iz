CREATE TABLE "eposta_jetonlari" (
	"id" text PRIMARY KEY NOT NULL,
	"kullanici_id" uuid NOT NULL,
	"amac" text NOT NULL,
	"eposta" text NOT NULL,
	"bitis" timestamp with time zone NOT NULL,
	"kullanildi" timestamp with time zone,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "eposta_jetonlari_amac_kontrol" CHECK ("eposta_jetonlari"."amac" in ('sifre_sifirlama', 'eposta_dogrulama'))
);
--> statement-breakpoint
ALTER TABLE "kullanicilar" ADD COLUMN "eposta_dogrulandi" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "eposta_jetonlari" ADD CONSTRAINT "eposta_jetonlari_kullanici_id_kullanicilar_id_fk" FOREIGN KEY ("kullanici_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eposta_jetonlari_kullanici_idx" ON "eposta_jetonlari" USING btree ("kullanici_id","amac");