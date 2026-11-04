-- UNLOGGED: hızlı, çökmede boşalabilir (yalnızca deneme sayaçları)
CREATE UNLOGGED TABLE "hiz_kayitlari" (
	"ad" text NOT NULL,
	"anahtar" text NOT NULL,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hiz_kayitlari_idx" ON "hiz_kayitlari" USING btree ("ad","anahtar","zaman");