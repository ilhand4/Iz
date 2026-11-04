CREATE TABLE "kanonik_eserler" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anahtar" text NOT NULL,
	"eser_turu" "eser_turu" NOT NULL,
	"baslik" text NOT NULL,
	"alt_baslik" text,
	"yil" integer,
	"gorsel_url" text,
	"wikidata" text,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kanonik_eserler_anahtar_unique" UNIQUE("anahtar")
);
--> statement-breakpoint
ALTER TABLE "dugumler" ADD COLUMN "kanonik_eser_id" uuid;--> statement-breakpoint
ALTER TABLE "dugumler" ADD CONSTRAINT "dugumler_kanonik_eser_id_kanonik_eserler_id_fk" FOREIGN KEY ("kanonik_eser_id") REFERENCES "public"."kanonik_eserler"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dugumler_kanonik_idx" ON "dugumler" USING btree ("kanonik_eser_id");--> statement-breakpoint
-- Eser düğümünü kanonik kayda bağlayan tetikleyici. Anahtar: dış kimlik, yoksa
-- tür + sadeleştirilmiş başlık ve yapımcıdan (arama_metni) parmak izi.
CREATE OR REPLACE FUNCTION kanonik_eser_bagla() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
	k_anahtar text;
	k_id uuid;
BEGIN
	IF NEW.tur <> 'eser' OR NEW.eser_turu IS NULL THEN
		IF NEW.kanonik_eser_id IS NOT NULL THEN
			UPDATE dugumler SET kanonik_eser_id = NULL WHERE id = NEW.id;
		END IF;
		RETURN NULL;
	END IF;
	IF NEW.dis_kaynak IS NOT NULL AND NEW.dis_kimlik IS NOT NULL THEN
		k_anahtar := NEW.dis_kaynak || ':' || NEW.dis_kimlik;
	ELSE
		k_anahtar := 'pi:' || md5(NEW.eser_turu::text || '|' || btrim(NEW.arama_metni));
	END IF;
	INSERT INTO kanonik_eserler (anahtar, eser_turu, baslik, alt_baslik, yil, gorsel_url)
	VALUES (k_anahtar, NEW.eser_turu, NEW.baslik, NEW.alt_baslik, NEW.yil, NEW.gorsel_url)
	ON CONFLICT (anahtar) DO UPDATE SET
		gorsel_url = coalesce(kanonik_eserler.gorsel_url, EXCLUDED.gorsel_url),
		yil = coalesce(kanonik_eserler.yil, EXCLUDED.yil)
	RETURNING id INTO k_id;
	IF NEW.kanonik_eser_id IS DISTINCT FROM k_id THEN
		UPDATE dugumler SET kanonik_eser_id = k_id WHERE id = NEW.id;
	END IF;
	RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER dugumler_kanonik_eser
	AFTER INSERT OR UPDATE OF tur, eser_turu, baslik, alt_baslik, dis_kaynak, dis_kimlik ON dugumler
	FOR EACH ROW EXECUTE FUNCTION kanonik_eser_bagla();
--> statement-breakpoint
-- Var olan eserleri bağla
UPDATE dugumler SET baslik = baslik WHERE tur = 'eser';
