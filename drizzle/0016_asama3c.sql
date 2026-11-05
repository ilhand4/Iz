CREATE TABLE "bag_avi_redleri" (
	"sahip_id" uuid NOT NULL,
	"kaynak_id" uuid NOT NULL,
	"hedef_id" uuid NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bag_avi_redleri_sahip_id_kaynak_id_hedef_id_pk" PRIMARY KEY("sahip_id","kaynak_id","hedef_id")
);
--> statement-breakpoint
ALTER TABLE "dugumler" ADD COLUMN "wikidata" text;--> statement-breakpoint
ALTER TABLE "bag_avi_redleri" ADD CONSTRAINT "bag_avi_redleri_sahip_id_kullanicilar_id_fk" FOREIGN KEY ("sahip_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bag_avi_redleri" ADD CONSTRAINT "bag_avi_redleri_kaynak_id_dugumler_id_fk" FOREIGN KEY ("kaynak_id") REFERENCES "public"."dugumler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bag_avi_redleri" ADD CONSTRAINT "bag_avi_redleri_hedef_id_dugumler_id_fk" FOREIGN KEY ("hedef_id") REFERENCES "public"."dugumler"("id") ON DELETE cascade ON UPDATE no action;