CREATE TABLE "kararlar" (
	"dugum_id" uuid PRIMARY KEY NOT NULL,
	"gerekce" text,
	"beklenti" text,
	"guven" integer,
	"sorulacak" date,
	"sonuc" text,
	"sonuc_notu" text,
	"sonuc_tarihi" timestamp with time zone,
	"guncelleme" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kararlar_guven_kontrol" CHECK ("kararlar"."guven" is null or "kararlar"."guven" between 0 and 100),
	CONSTRAINT "kararlar_sonuc_kontrol" CHECK ("kararlar"."sonuc" is null or "kararlar"."sonuc" in ('gerceklesti', 'kismen', 'gerceklesmedi'))
);
--> statement-breakpoint
ALTER TABLE "kararlar" ADD CONSTRAINT "kararlar_dugum_id_dugumler_id_fk" FOREIGN KEY ("dugum_id") REFERENCES "public"."dugumler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kararlar_sorulacak_idx" ON "kararlar" USING btree ("sorulacak");