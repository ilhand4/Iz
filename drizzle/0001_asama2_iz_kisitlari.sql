CREATE INDEX "dugumler_sahip_tarih_idx" ON "dugumler" USING btree ("sahip_id","tarih");--> statement-breakpoint
ALTER TABLE "iz_adimlari" ADD CONSTRAINT "iz_adimlari_dugum_tekil" UNIQUE("iz_id","dugum_id");--> statement-breakpoint
ALTER TABLE "iz_adimlari" ADD CONSTRAINT "iz_adimlari_sira_kontrol" CHECK ("iz_adimlari"."sira" > 0);--> statement-breakpoint
ALTER TABLE "izler" ADD CONSTRAINT "izler_baslik_kontrol" CHECK (length("izler"."baslik") between 1 and 120);