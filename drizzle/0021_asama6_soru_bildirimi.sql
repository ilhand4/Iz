ALTER TABLE "bildirim_kutusu" DROP CONSTRAINT "bildirim_kutusu_tur_kontrol";--> statement-breakpoint
ALTER TABLE "bildirim_kutusu" ADD COLUMN "soru_id" uuid;--> statement-breakpoint
ALTER TABLE "bildirim_kutusu" ADD CONSTRAINT "bildirim_kutusu_soru_id_sorular_id_fk" FOREIGN KEY ("soru_id") REFERENCES "public"."sorular"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bildirim_kutusu" ADD CONSTRAINT "bildirim_kutusu_tur_kontrol" CHECK ("bildirim_kutusu"."tur" in ('dis_bag', 'grup_katilim', 'soru_yaniti'));