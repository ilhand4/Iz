CREATE TYPE "public"."eser_durumu" AS ENUM('merak', 'suruyor', 'bitti', 'yarim');--> statement-breakpoint
CREATE TABLE "ag_konumlari" (
	"dugum_id" uuid PRIMARY KEY NOT NULL,
	"x" double precision NOT NULL,
	"y" double precision NOT NULL,
	"guncelleme" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ag_konumlari_sinir_kontrol" CHECK ("ag_konumlari"."x" between -10000000 and 10000000 and "ag_konumlari"."y" between -10000000 and 10000000)
);
--> statement-breakpoint
DROP INDEX "dugumler_dis_kaynak_tekil";--> statement-breakpoint
ALTER TABLE "dugumler" ADD COLUMN "durum" "eser_durumu";--> statement-breakpoint
ALTER TABLE "dugumler" ADD COLUMN "silinme" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "izler" ADD COLUMN "silinme" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ag_konumlari" ADD CONSTRAINT "ag_konumlari_dugum_id_dugumler_id_fk" FOREIGN KEY ("dugum_id") REFERENCES "public"."dugumler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dugumler_dis_kaynak_tekil" ON "dugumler" USING btree ("sahip_id","dis_kaynak","dis_kimlik") WHERE "dugumler"."dis_kimlik" is not null and "dugumler"."silinme" is null;--> statement-breakpoint
ALTER TABLE "dugumler" ADD CONSTRAINT "dugumler_durum_kontrol" CHECK ("dugumler"."durum" is null or "dugumler"."tur" = 'eser');