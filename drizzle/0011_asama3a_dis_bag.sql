CREATE TABLE "bildirim_kutusu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alici_id" uuid NOT NULL,
	"tur" text NOT NULL,
	"aktor_id" uuid,
	"dis_bag_id" uuid,
	"grup_id" uuid,
	"okundu" timestamp with time zone,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bildirim_kutusu_tur_kontrol" CHECK ("bildirim_kutusu"."tur" in ('dis_bag', 'grup_katilim'))
);
--> statement-breakpoint
CREATE TABLE "dis_baglar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sahip_id" uuid NOT NULL,
	"kaynak_id" uuid NOT NULL,
	"hedef_id" uuid NOT NULL,
	"not" text,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dis_baglar_tekil" UNIQUE("kaynak_id","hedef_id")
);
--> statement-breakpoint
ALTER TABLE "bildirim_kutusu" ADD CONSTRAINT "bildirim_kutusu_alici_id_kullanicilar_id_fk" FOREIGN KEY ("alici_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bildirim_kutusu" ADD CONSTRAINT "bildirim_kutusu_aktor_id_kullanicilar_id_fk" FOREIGN KEY ("aktor_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bildirim_kutusu" ADD CONSTRAINT "bildirim_kutusu_dis_bag_id_dis_baglar_id_fk" FOREIGN KEY ("dis_bag_id") REFERENCES "public"."dis_baglar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bildirim_kutusu" ADD CONSTRAINT "bildirim_kutusu_grup_id_gruplar_id_fk" FOREIGN KEY ("grup_id") REFERENCES "public"."gruplar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dis_baglar" ADD CONSTRAINT "dis_baglar_sahip_id_kullanicilar_id_fk" FOREIGN KEY ("sahip_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dis_baglar" ADD CONSTRAINT "dis_baglar_kaynak_id_dugumler_id_fk" FOREIGN KEY ("kaynak_id") REFERENCES "public"."dugumler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dis_baglar" ADD CONSTRAINT "dis_baglar_hedef_id_dugumler_id_fk" FOREIGN KEY ("hedef_id") REFERENCES "public"."dugumler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bildirim_kutusu_alici_idx" ON "bildirim_kutusu" USING btree ("alici_id","olusturma");--> statement-breakpoint
CREATE INDEX "dis_baglar_hedef_idx" ON "dis_baglar" USING btree ("hedef_id");