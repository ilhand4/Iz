CREATE TABLE "ceviri_masalari" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sahip_id" uuid NOT NULL,
	"eser_id" uuid,
	"baslik" text NOT NULL,
	"ozgun_dil" text,
	"aciklama" text,
	"gizlilik" "gizlilik" DEFAULT 'ozel' NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ceviri_masalari_gizlilik_kontrol" CHECK ("ceviri_masalari"."gizlilik"::text <> 'golge')
);
--> statement-breakpoint
CREATE TABLE "ceviri_oylari" (
	"paragraf_id" uuid NOT NULL,
	"kullanici_id" uuid NOT NULL,
	"ceviri_id" uuid NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ceviri_oylari_paragraf_id_kullanici_id_pk" PRIMARY KEY("paragraf_id","kullanici_id")
);
--> statement-breakpoint
CREATE TABLE "ceviri_paragraflari" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"masa_id" uuid NOT NULL,
	"sira" integer NOT NULL,
	"yer" text,
	"ozgun" text,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ceviri_yorumlari" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ceviri_id" uuid NOT NULL,
	"yazar_id" uuid NOT NULL,
	"metin" text NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ceviri_yorumlari_metin_kontrol" CHECK (length("ceviri_yorumlari"."metin") between 1 and 1000)
);
--> statement-breakpoint
CREATE TABLE "ceviriler" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paragraf_id" uuid NOT NULL,
	"ekleyen_id" uuid NOT NULL,
	"metin" text NOT NULL,
	"cevirmen" text NOT NULL,
	"yayinevi" text,
	"yil" integer,
	"dayanak" text NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ceviriler_metin_kontrol" CHECK (length("ceviriler"."metin") between 1 and 600),
	CONSTRAINT "ceviriler_dayanak_kontrol" CHECK ("ceviriler"."dayanak" in ('kamu', 'izinli', 'alinti'))
);
--> statement-breakpoint
ALTER TABLE "ceviri_masalari" ADD CONSTRAINT "ceviri_masalari_sahip_id_kullanicilar_id_fk" FOREIGN KEY ("sahip_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ceviri_masalari" ADD CONSTRAINT "ceviri_masalari_eser_id_dugumler_id_fk" FOREIGN KEY ("eser_id") REFERENCES "public"."dugumler"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ceviri_oylari" ADD CONSTRAINT "ceviri_oylari_paragraf_id_ceviri_paragraflari_id_fk" FOREIGN KEY ("paragraf_id") REFERENCES "public"."ceviri_paragraflari"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ceviri_oylari" ADD CONSTRAINT "ceviri_oylari_kullanici_id_kullanicilar_id_fk" FOREIGN KEY ("kullanici_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ceviri_oylari" ADD CONSTRAINT "ceviri_oylari_ceviri_id_ceviriler_id_fk" FOREIGN KEY ("ceviri_id") REFERENCES "public"."ceviriler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ceviri_paragraflari" ADD CONSTRAINT "ceviri_paragraflari_masa_id_ceviri_masalari_id_fk" FOREIGN KEY ("masa_id") REFERENCES "public"."ceviri_masalari"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ceviri_yorumlari" ADD CONSTRAINT "ceviri_yorumlari_ceviri_id_ceviriler_id_fk" FOREIGN KEY ("ceviri_id") REFERENCES "public"."ceviriler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ceviri_yorumlari" ADD CONSTRAINT "ceviri_yorumlari_yazar_id_kullanicilar_id_fk" FOREIGN KEY ("yazar_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ceviriler" ADD CONSTRAINT "ceviriler_paragraf_id_ceviri_paragraflari_id_fk" FOREIGN KEY ("paragraf_id") REFERENCES "public"."ceviri_paragraflari"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ceviriler" ADD CONSTRAINT "ceviriler_ekleyen_id_kullanicilar_id_fk" FOREIGN KEY ("ekleyen_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ceviri_masalari_sahip_idx" ON "ceviri_masalari" USING btree ("sahip_id","olusturma");--> statement-breakpoint
CREATE INDEX "ceviri_masalari_eser_idx" ON "ceviri_masalari" USING btree ("eser_id");--> statement-breakpoint
CREATE INDEX "ceviri_oylari_ceviri_idx" ON "ceviri_oylari" USING btree ("ceviri_id");--> statement-breakpoint
CREATE INDEX "ceviri_paragraflari_masa_idx" ON "ceviri_paragraflari" USING btree ("masa_id","sira");--> statement-breakpoint
CREATE INDEX "ceviri_yorumlari_ceviri_idx" ON "ceviri_yorumlari" USING btree ("ceviri_id","olusturma");--> statement-breakpoint
CREATE INDEX "ceviriler_paragraf_idx" ON "ceviriler" USING btree ("paragraf_id");