ALTER TABLE "kullanicilar" ADD COLUMN "hakkinda" text;--> statement-breakpoint
ALTER TABLE "kullanicilar" ADD COLUMN "arama_motorlari" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "oturumlar" ADD COLUMN "cihaz" text;--> statement-breakpoint
ALTER TABLE "oturumlar" ADD COLUMN "son_kullanim" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "kullanicilar" ADD CONSTRAINT "kullanicilar_hakkinda_uzunluk" CHECK (char_length("kullanicilar"."hakkinda") <= 300);