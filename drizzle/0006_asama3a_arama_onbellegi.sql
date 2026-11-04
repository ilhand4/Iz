-- UNLOGGED: WAL yazılmaz, hızlıdır; çökmede tablo boşalır (yalnızca önbellek).
CREATE UNLOGGED TABLE "eser_arama_onbellegi" (
	"anahtar" text PRIMARY KEY NOT NULL,
	"sonuclar" jsonb NOT NULL,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL
);
