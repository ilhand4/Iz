import { sql, type SQL } from 'drizzle-orm';
import {
	boolean,
	check,
	date,
	doublePrecision,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';

import {
	DUGUM_TURLERI,
	ESER_DURUMLARI,
	ESER_TURLERI,
	GIZLILIK_DUZEYLERI,
	TARIH_HASSASIYETLERI
} from '../../sabitler';

// ——— Sabit değer listeleri (enum) ———

export const dugumTuru = pgEnum('dugum_turu', DUGUM_TURLERI);
export const eserTuru = pgEnum('eser_turu', ESER_TURLERI);
export const gizlilik = pgEnum('gizlilik', GIZLILIK_DUZEYLERI);
export const tarihHassasiyeti = pgEnum('tarih_hassasiyeti', TARIH_HASSASIYETLERI);
export const eserDurumu = pgEnum('eser_durumu', ESER_DURUMLARI);

/**
 * Arama için sadeleştirilmiş metin (metin.ts → sadelestir'in SQL karşılığı): Türkçe ve yaygın
 * aksanlı harfler ASCII'ye indirilir, sonra küçültülür. "I" önce "i" yapılır ki ICU tr-TR
 * sıralamasında lower('I') = 'ı' olmasın. Trigram (pg_trgm) dizini bu sütun üzerindedir.
 */
const sadelestirSql = (ifade: SQL) =>
	sql`lower(translate(${ifade}, 'İIıÇĞÖŞÜÂÎÛçğöşüâîûÉÈÊËéèêëÁÀÄáàäÓÒóòÍÌíìÚÙúùÑñ', 'iiicgosuaiucgosuaiueeeeeeeeaaaaaaooooiiiiuuuunn'))`;

const zamanDamgasi = (ad: string) => timestamp(ad, { withTimezone: true, mode: 'date' });

// ——— Hesaplar ———

export const kullanicilar = pgTable(
	'kullanicilar',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		/** Küçük harfli, ASCII: a-z 0-9 _ . */
		kullaniciAdi: text('kullanici_adi').notNull(),
		/** Küçük harfe çevrilmiş e-posta */
		eposta: text('eposta').notNull(),
		/** Görünen ad (Türkçe karakter serbest) */
		ad: text('ad').notNull(),
		sifreOzeti: text('sifre_ozeti').notNull(),
		/** Profilde görünen kısa tanıtım */
		hakkinda: text('hakkinda'),
		/** Herkese açık sayfaları arama motorlarına açık mı? Varsayılan kapalı (noindex) */
		aramaMotorlari: boolean('arama_motorlari').notNull().default(false),
		/** E-posta adresinin doğrulandığı an (null: doğrulanmadı) */
		epostaDogrulandi: zamanDamgasi('eposta_dogrulandi'),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('kullanicilar_kullanici_adi_tekil').on(t.kullaniciAdi),
		uniqueIndex('kullanicilar_eposta_tekil').on(t.eposta),
		check('kullanicilar_hakkinda_uzunluk', sql`char_length(${t.hakkinda}) <= 300`)
	]
);

export const oturumlar = pgTable(
	'oturumlar',
	{
		/** Çerezdeki jetonun SHA-256 özeti; jetonun kendisi veritabanında tutulmaz */
		id: text('id').primaryKey(),
		kullaniciId: uuid('kullanici_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		bitis: zamanDamgasi('bitis').notNull(),
		/** "Edge · Windows" gibi kısa cihaz açıklaması (oturum yönetimi için) */
		cihaz: text('cihaz'),
		sonKullanim: zamanDamgasi('son_kullanim').notNull().defaultNow(),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [index('oturumlar_kullanici_idx').on(t.kullaniciId)]
);

/** Tek kullanımlık e-posta bağlantıları (şifre sıfırlama, e-posta doğrulama) */
export const epostaJetonlari = pgTable(
	'eposta_jetonlari',
	{
		/** Jetonun SHA-256 özeti; jetonun kendisi yalnızca e-postadaki bağlantıda */
		id: text('id').primaryKey(),
		kullaniciId: uuid('kullanici_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		amac: text('amac').notNull(),
		/** Doğrulanacak adres (e-posta değişince eski bağlantılar geçersiz kalsın) */
		eposta: text('eposta').notNull(),
		bitis: zamanDamgasi('bitis').notNull(),
		kullanildi: zamanDamgasi('kullanildi'),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [
		index('eposta_jetonlari_kullanici_idx').on(t.kullaniciId, t.amac),
		check(
			'eposta_jetonlari_amac_kontrol',
			sql`${t.amac} in ('sifre_sifirlama', 'eposta_dogrulama')`
		)
	]
);

// ——— Kanonik eserler: kişisel düğümlerden bağımsız ortak eser kaydı ———
// Anahtar önce dış kimlikten ("openlibrary:OL1W", "tmdb:movie/603"), yoksa sadeleştirilmiş
// tür + başlık + yapımcıdan üretilen parmak izinden ("pi:<md5>"). Eşleme veritabanı
// tetikleyicisiyle yapılır (drizzle/0007): düğüm hangi yoldan yazılırsa yazılsın bağlanır.

export const kanonikEserler = pgTable('kanonik_eserler', {
	id: uuid('id').primaryKey().defaultRandom(),
	anahtar: text('anahtar').notNull().unique(),
	eserTuru: eserTuru('eser_turu').notNull(),
	baslik: text('baslik').notNull(),
	altBaslik: text('alt_baslik'),
	yil: integer('yil'),
	gorselUrl: text('gorsel_url'),
	/** Wikidata kimliği ("Q123"); zenginleştirmeyle doldurulur */
	wikidata: text('wikidata'),
	olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
});

// ——— Düğümler: eser, kişi, yer, karar, anı ———

export const dugumler = pgTable(
	'dugumler',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sahipId: uuid('sahip_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		tur: dugumTuru('tur').notNull(),
		/** Yalnızca tur = 'eser' iken dolu */
		eserTuru: eserTuru('eser_turu'),
		baslik: text('baslik').notNull(),
		/** Eser için yazar/yönetmen, kişi için rol vb. kısa bilgi */
		altBaslik: text('alt_baslik'),
		aciklama: text('aciklama'),
		/** Düğümün hayatındaki tarihi (okuduğun gün, tanıştığın yıl…) */
		tarih: date('tarih', { mode: 'string' }),
		tarihHassasiyeti: tarihHassasiyeti('tarih_hassasiyeti'),
		/** Eserin yayın yılı gibi dış bilgi */
		yil: integer('yil'),
		/** İsteğe bağlı konum (ileride PostGIS'e taşınacak) */
		enlem: doublePrecision('enlem'),
		boylam: doublePrecision('boylam'),
		yerAdi: text('yer_adi'),
		gizlilik: gizlilik('gizlilik').notNull().default('ozel'),
		/** Dış kaynak: 'openlibrary', 'tmdb' … */
		disKaynak: text('dis_kaynak'),
		/** Dış kaynaktaki kimlik: 'OL27448W', 'movie/603' … */
		disKimlik: text('dis_kimlik'),
		gorselUrl: text('gorsel_url'),
		/** Yalnızca eserler: merak ediyorum / sürüyor / bitti / yarım bıraktım */
		durum: eserDurumu('durum'),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow(),
		guncelleme: zamanDamgasi('guncelleme').notNull().defaultNow(),
		/** Doluysa düğüm çöp kutusundadır; 30 gün sonra kalıcı olarak silinir */
		silinme: zamanDamgasi('silinme'),
		aramaMetni: text('arama_metni').generatedAlwaysAs((): SQL =>
			sadelestirSql(sql`${dugumler.baslik} || ' ' || coalesce(${dugumler.altBaslik}, '')`)
		),
		/** Eserin ortak kaydı (tetikleyiciyle doldurulur; eser değilse null) */
		kanonikEserId: uuid('kanonik_eser_id').references(() => kanonikEserler.id, {
			onDelete: 'set null'
		})
	},
	(t) => [
		index('dugumler_sahip_idx').on(t.sahipId, t.olusturma),
		// Zaman çizgisi sıralaması için
		index('dugumler_sahip_tarih_idx').on(t.sahipId, t.tarih),
		index('dugumler_gizlilik_idx').on(t.gizlilik),
		index('dugumler_arama_trgm_idx').using('gin', sql`${t.aramaMetni} gin_trgm_ops`),
		index('dugumler_kanonik_idx').on(t.kanonikEserId),
		// Aynı kullanıcı aynı dış eseri iki kez eklemesin (çöp kutusundakiler sayılmaz)
		uniqueIndex('dugumler_dis_kaynak_tekil')
			.on(t.sahipId, t.disKaynak, t.disKimlik)
			.where(sql`${t.disKimlik} is not null and ${t.silinme} is null`),
		check('dugumler_durum_kontrol', sql`${t.durum} is null or ${t.tur} = 'eser'`),
		check('dugumler_eser_turu_kontrol', sql`(${t.tur} = 'eser') = (${t.eserTuru} is not null)`),
		check(
			'dugumler_konum_kontrol',
			sql`(${t.enlem} is null) = (${t.boylam} is null) and (${t.enlem} is null or (${t.enlem} between -90 and 90 and ${t.boylam} between -180 and 180))`
		),
		check('dugumler_tarih_kontrol', sql`(${t.tarih} is null) = (${t.tarihHassasiyeti} is null)`),
		check('dugumler_baslik_kontrol', sql`length(${t.baslik}) between 1 and 200`)
	]
);

// ——— Bağlar: "bu beni şuna götürdü" ———

export const baglar = pgTable(
	'baglar',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sahipId: uuid('sahip_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		/** Beni götüren */
		kaynakId: uuid('kaynak_id')
			.notNull()
			.references(() => dugumler.id, { onDelete: 'cascade' }),
		/** Götürdüğü yer */
		hedefId: uuid('hedef_id')
			.notNull()
			.references(() => dugumler.id, { onDelete: 'cascade' }),
		/** Nasıl götürdü? */
		not: text('not'),
		tarih: date('tarih', { mode: 'string' }),
		tarihHassasiyeti: tarihHassasiyeti('tarih_hassasiyeti'),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [
		unique('baglar_kaynak_hedef_tekil').on(t.kaynakId, t.hedefId),
		index('baglar_hedef_idx').on(t.hedefId),
		index('baglar_sahip_idx').on(t.sahipId),
		check('baglar_kendine_bag_kontrol', sql`${t.kaynakId} <> ${t.hedefId}`),
		check('baglar_tarih_kontrol', sql`(${t.tarih} is null) = (${t.tarihHassasiyeti} is null)`)
	]
);

// ——— İzler: düğümlerden oluşan, anlatılabilir sıralı yollar ———

export const izler = pgTable(
	'izler',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sahipId: uuid('sahip_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		baslik: text('baslik').notNull(),
		aciklama: text('aciklama'),
		gizlilik: gizlilik('gizlilik').notNull().default('ozel'),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow(),
		guncelleme: zamanDamgasi('guncelleme').notNull().defaultNow(),
		/** Doluysa iz çöp kutusundadır */
		silinme: zamanDamgasi('silinme'),
		aramaMetni: text('arama_metni').generatedAlwaysAs((): SQL =>
			sadelestirSql(sql`${izler.baslik} || ' ' || coalesce(${izler.aciklama}, '')`)
		)
	},
	(t) => [
		index('izler_sahip_idx').on(t.sahipId),
		index('izler_arama_trgm_idx').using('gin', sql`${t.aramaMetni} gin_trgm_ops`),
		check('izler_baslik_kontrol', sql`length(${t.baslik}) between 1 and 120`)
	]
);

export const izAdimlari = pgTable(
	'iz_adimlari',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		izId: uuid('iz_id')
			.notNull()
			.references(() => izler.id, { onDelete: 'cascade' }),
		dugumId: uuid('dugum_id')
			.notNull()
			.references(() => dugumler.id, { onDelete: 'cascade' }),
		sira: integer('sira').notNull(),
		/** Bu adımın anlatısı */
		not: text('not')
	},
	(t) => [
		unique('iz_adimlari_sira_tekil').on(t.izId, t.sira),
		// Bir düğüm aynı izde bir kez durak olabilir
		unique('iz_adimlari_dugum_tekil').on(t.izId, t.dugumId),
		index('iz_adimlari_dugum_idx').on(t.dugumId),
		check('iz_adimlari_sira_kontrol', sql`${t.sira} > 0`)
	]
);

// ——— Ağ görünümünde düğüm konumları ———
// Harita her açılışta aynı yerleşimle açılsın diye kaydedilir (zihinsel haritanın korunması)

export const agKonumlari = pgTable(
	'ag_konumlari',
	{
		dugumId: uuid('dugum_id')
			.primaryKey()
			.references(() => dugumler.id, { onDelete: 'cascade' }),
		x: doublePrecision('x').notNull(),
		y: doublePrecision('y').notNull(),
		guncelleme: zamanDamgasi('guncelleme').notNull().defaultNow()
	},
	(t) => [
		check(
			'ag_konumlari_sinir_kontrol',
			sql`${t.x} between -10000000 and 10000000 and ${t.y} between -10000000 and 10000000`
		)
	]
);

// ——— Eser araması önbelleği (UNLOGGED: çökmede boşalabilir, önemli değil) ———

export const eserAramaOnbellegi = pgTable('eser_arama_onbellegi', {
	/** "kitap:tutunamayanlar", "film:dune" gibi küçük harfli anahtar */
	anahtar: text('anahtar').primaryKey(),
	sonuclar: jsonb('sonuclar').notNull(),
	zaman: zamanDamgasi('zaman').notNull().defaultNow()
});

export type Kullanici = typeof kullanicilar.$inferSelect;
export type Dugum = typeof dugumler.$inferSelect;
export type YeniDugum = typeof dugumler.$inferInsert;
export type Bag = typeof baglar.$inferSelect;
export type { DugumTuru, EserDurumu, EserTuru, Gizlilik, TarihHassasiyeti } from '../../sabitler';
