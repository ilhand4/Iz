-- Yazım hatasına dayanıklı arama (trigram). pg_trgm "trusted" bir uzantıdır: veritabanı sahibi kurabilir.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
ALTER TABLE "dugumler" ADD COLUMN "arama_metni" text GENERATED ALWAYS AS (lower(translate("dugumler"."baslik" || ' ' || coalesce("dugumler"."alt_baslik", ''), 'İIıÇĞÖŞÜÂÎÛçğöşüâîûÉÈÊËéèêëÁÀÄáàäÓÒóòÍÌíìÚÙúùÑñ', 'iiicgosuaiucgosuaiueeeeeeeeaaaaaaooooiiiiuuuunn'))) STORED;--> statement-breakpoint
ALTER TABLE "izler" ADD COLUMN "arama_metni" text GENERATED ALWAYS AS (lower(translate("izler"."baslik" || ' ' || coalesce("izler"."aciklama", ''), 'İIıÇĞÖŞÜÂÎÛçğöşüâîûÉÈÊËéèêëÁÀÄáàäÓÒóòÍÌíìÚÙúùÑñ', 'iiicgosuaiucgosuaiueeeeeeeeaaaaaaooooiiiiuuuunn'))) STORED;--> statement-breakpoint
CREATE INDEX "dugumler_arama_trgm_idx" ON "dugumler" USING gin ("arama_metni" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "izler_arama_trgm_idx" ON "izler" USING gin ("arama_metni" gin_trgm_ops);