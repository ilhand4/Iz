CREATE TABLE "sesler" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sahip_id" uuid NOT NULL,
	"dugum_id" uuid,
	"soru_id" uuid,
	"uzanti" text NOT NULL,
	"boyut" integer NOT NULL,
	"sure" integer,
	"metin" text,
	"durum" text DEFAULT 'bekliyor' NOT NULL,
	"hata" text,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	"islenme" timestamp with time zone,
	CONSTRAINT "sesler_durum_kontrol" CHECK ("sesler"."durum" in ('bekliyor', 'isleniyor', 'tamam', 'hata', 'kapali'))
);
--> statement-breakpoint
CREATE TABLE "sorular" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sahip_id" uuid NOT NULL,
	"kisi_id" uuid,
	"alici_adi" text NOT NULL,
	"metin" text NOT NULL,
	"jeton_ozeti" text NOT NULL,
	"son_gecerlilik" timestamp with time zone NOT NULL,
	"yanit_metni" text,
	"yanitlanma" timestamp with time zone,
	"ani_id" uuid,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sorular_jeton_ozeti_unique" UNIQUE("jeton_ozeti"),
	CONSTRAINT "sorular_metin_kontrol" CHECK (length("sorular"."metin") between 1 and 500)
);
--> statement-breakpoint
CREATE TABLE "vasiyetler" (
	"sahip_id" uuid PRIMARY KEY NOT NULL,
	"varis_id" uuid NOT NULL,
	"bekleme_ay" integer NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vasiyetler_bekleme_kontrol" CHECK ("vasiyetler"."bekleme_ay" in (3, 6, 12, 24)),
	CONSTRAINT "vasiyetler_kendisi_degil" CHECK ("vasiyetler"."sahip_id" <> "vasiyetler"."varis_id")
);
--> statement-breakpoint
ALTER TABLE "dugumler" ADD COLUMN "muhur_tarihi" date;--> statement-breakpoint
ALTER TABLE "sesler" ADD CONSTRAINT "sesler_sahip_id_kullanicilar_id_fk" FOREIGN KEY ("sahip_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesler" ADD CONSTRAINT "sesler_dugum_id_dugumler_id_fk" FOREIGN KEY ("dugum_id") REFERENCES "public"."dugumler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesler" ADD CONSTRAINT "sesler_soru_id_sorular_id_fk" FOREIGN KEY ("soru_id") REFERENCES "public"."sorular"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sorular" ADD CONSTRAINT "sorular_sahip_id_kullanicilar_id_fk" FOREIGN KEY ("sahip_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sorular" ADD CONSTRAINT "sorular_kisi_id_dugumler_id_fk" FOREIGN KEY ("kisi_id") REFERENCES "public"."dugumler"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sorular" ADD CONSTRAINT "sorular_ani_id_dugumler_id_fk" FOREIGN KEY ("ani_id") REFERENCES "public"."dugumler"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vasiyetler" ADD CONSTRAINT "vasiyetler_sahip_id_kullanicilar_id_fk" FOREIGN KEY ("sahip_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vasiyetler" ADD CONSTRAINT "vasiyetler_varis_id_kullanicilar_id_fk" FOREIGN KEY ("varis_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sesler_dugum_idx" ON "sesler" USING btree ("dugum_id");--> statement-breakpoint
CREATE INDEX "sesler_soru_idx" ON "sesler" USING btree ("soru_id");--> statement-breakpoint
CREATE INDEX "sesler_durum_idx" ON "sesler" USING btree ("durum");--> statement-breakpoint
CREATE INDEX "sorular_sahip_idx" ON "sorular" USING btree ("sahip_id","olusturma");--> statement-breakpoint
CREATE INDEX "vasiyetler_varis_idx" ON "vasiyetler" USING btree ("varis_id");