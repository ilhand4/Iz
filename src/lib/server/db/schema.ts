import { sql, type SQL } from 'drizzle-orm';
import {
	boolean,
	check,
	customType,
	date,
	doublePrecision,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';

import {
	DUGUM_TURLERI,
	ESER_DURUMLARI,
	ESER_TURLERI,
	GIZLILIK_DUZEYLERI,
	TARIH_HASSASIYETLERI
} from '../../sabitler';

/**
 * PostGIS coğrafi noktası (WGS 84). Uygulama koordinatları enlem/boylam sütunlarına yazar;
 * bu sütun onlardan üretilir ve mesafe sorguları (GiST dizini) için kullanılır.
 */
const cografiNokta = customType<{ data: string; driverData: string }>({
	dataType: () => 'geography(Point, 4326)'
});

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
		/** Son oturum kullanımı (en çok saatte bir yazılır); dijital vasiyetin zamanlayıcısı */
		sonEtkinlik: zamanDamgasi('son_etkinlik').notNull().defaultNow(),
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

// ——— Gruplar: aile, arkadaşlar, kitap kulübü… ———
// "grup" gizliliğindeki içerik, sahibiyle en az bir ortak grubu olan herkese görünür.

export const gruplar = pgTable(
	'gruplar',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		ad: text('ad').notNull(),
		aciklama: text('aciklama'),
		/** Davet bağlantısındaki jetonun SHA-256 özeti (null: davet kapalı) */
		davetOzeti: text('davet_ozeti').unique(),
		davetBitis: zamanDamgasi('davet_bitis'),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [check('gruplar_ad_kontrol', sql`length(${t.ad}) between 1 and 80`)]
);

export const grupUyeleri = pgTable(
	'grup_uyeleri',
	{
		grupId: uuid('grup_id')
			.notNull()
			.references(() => gruplar.id, { onDelete: 'cascade' }),
		kullaniciId: uuid('kullanici_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		/** yonetici: davet, üye çıkarma, grubu düzenleme/silme */
		rol: text('rol').notNull().default('uye'),
		katilma: zamanDamgasi('katilma').notNull().defaultNow()
	},
	(t) => [
		primaryKey({ columns: [t.grupId, t.kullaniciId] }),
		index('grup_uyeleri_kullanici_idx').on(t.kullaniciId),
		check('grup_uyeleri_rol_kontrol', sql`${t.rol} in ('yonetici', 'uye')`)
	]
);

/** Geçiş anahtarları (passkey / WebAuthn): şifresiz giriş */
export const gecisAnahtarlari = pgTable(
	'gecis_anahtarlari',
	{
		/** Kimlik bilgisinin kimliği (base64url) */
		id: text('id').primaryKey(),
		kullaniciId: uuid('kullanici_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		/** COSE açık anahtarı (base64url) */
		acikAnahtar: text('acik_anahtar').notNull(),
		sayac: integer('sayac').notNull().default(0),
		/** "internal,hybrid" gibi */
		aktarimlar: text('aktarimlar'),
		/** Kullanıcının verdiği ad ya da cihaz özeti ("Edge · Windows") */
		ad: text('ad').notNull(),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow(),
		sonKullanim: zamanDamgasi('son_kullanim')
	},
	(t) => [index('gecis_anahtarlari_kullanici_idx').on(t.kullaniciId)]
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
		/** Wikidata kimliği ("Q123"): zenginleştirmeyle doldurulur */
		wikidata: text('wikidata'),
		/** Etki ölçeği (puan değil): degistirdi / iz_birakti / gecti; null: belirtilmemiş */
		etki: text('etki'),
		/** Zaman kapsülü: bu güne kadar içerik (açıklama, fotoğraf, ses) sahibine bile gösterilmez */
		muhurTarihi: date('muhur_tarihi', { mode: 'string' }),
		/** Eserin ortak kaydı (tetikleyiciyle doldurulur; eser değilse null) */
		kanonikEserId: uuid('kanonik_eser_id').references(() => kanonikEserler.id, {
			onDelete: 'set null'
		}),
		/** PostGIS noktası; enlem/boylamdan üretilir (yazılmaz) */
		konum: cografiNokta('konum').generatedAlwaysAs(
			(): SQL =>
				sql`case when ${dugumler.enlem} is not null and ${dugumler.boylam} is not null then st_setsrid(st_makepoint(${dugumler.boylam}, ${dugumler.enlem}), 4326)::geography end`
		)
	},
	(t) => [
		index('dugumler_sahip_idx').on(t.sahipId, t.olusturma),
		// Zaman çizgisi sıralaması için
		index('dugumler_sahip_tarih_idx').on(t.sahipId, t.tarih),
		index('dugumler_gizlilik_idx').on(t.gizlilik),
		index('dugumler_arama_trgm_idx').using('gin', sql`${t.aramaMetni} gin_trgm_ops`),
		index('dugumler_kanonik_idx').on(t.kanonikEserId),
		index('dugumler_konum_idx').using('gist', t.konum),
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
		check('dugumler_baslik_kontrol', sql`length(${t.baslik}) between 1 and 200`),
		check(
			'dugumler_etki_kontrol',
			sql`${t.etki} is null or ${t.etki} in ('degistirdi', 'iz_birakti', 'gecti')`
		)
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
		/** besler / celisir / cagristirir / sentezler; null: belirtilmemiş */
		tur: text('tur'),
		/** Bağ notu kaynak düğümün bir alıntısına işaret edebilir */
		alintiId: uuid('alinti_id').references((): AnyPgColumn => alintilar.id, {
			onDelete: 'set null'
		}),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [
		unique('baglar_kaynak_hedef_tekil').on(t.kaynakId, t.hedefId),
		check(
			'baglar_tur_kontrol',
			sql`${t.tur} is null or ${t.tur} in ('besler', 'celisir', 'cagristirir', 'sentezler')`
		),
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
		/** Çatallanma: bu iz hangi izden, kaçıncı duraktan sonra ayrıldı */
		ataIzId: uuid('ata_iz_id').references((): AnyPgColumn => izler.id, { onDelete: 'set null' }),
		ayrilmaSirasi: integer('ayrilma_sirasi'),
		/** Ortak iz: bu grubun üyeleri izi görür ve kendi düğümlerinden durak ekleyebilir */
		ortakGrupId: uuid('ortak_grup_id').references(() => gruplar.id, { onDelete: 'set null' }),
		aramaMetni: text('arama_metni').generatedAlwaysAs((): SQL =>
			sadelestirSql(sql`${izler.baslik} || ' ' || coalesce(${izler.aciklama}, '')`)
		)
	},
	(t) => [
		index('izler_sahip_idx').on(t.sahipId),
		index('izler_arama_trgm_idx').using('gin', sql`${t.aramaMetni} gin_trgm_ops`),
		// "gölge" yalnızca düğümler için (metne çevirerek: aynı işlemde eklenen enum değeri kullanılamaz)
		check('izler_golge_kontrol', sql`${t.gizlilik}::text <> 'golge'`),
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

// ——— Kullanıcılar arası: "Senin izin beni buraya götürdü" ———
// Başkasının görebildiğin düğümünden kendi düğümüne bağ. Kuran kişi bağın sahibidir; kaynak
// düğümün sahibine bildirim gider. Kaynak düğüm sonradan gizlenirse bağ kimseye gösterilmez.

export const disBaglar = pgTable(
	'dis_baglar',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sahipId: uuid('sahip_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		kaynakId: uuid('kaynak_id')
			.notNull()
			.references(() => dugumler.id, { onDelete: 'cascade' }),
		hedefId: uuid('hedef_id')
			.notNull()
			.references(() => dugumler.id, { onDelete: 'cascade' }),
		not: text('not'),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [
		unique('dis_baglar_tekil').on(t.kaynakId, t.hedefId),
		index('dis_baglar_hedef_idx').on(t.hedefId)
	]
);

/** Uygulama içi bildirimler (beğeni ya da takipçi yok; yalnızca anlamlı olaylar) */
export const bildirimKutusu = pgTable(
	'bildirim_kutusu',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		aliciId: uuid('alici_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		/**
		 * dis_bag: biri senin düğümünden kendi düğümüne bağ kurdu; grup_katilim: grubuna biri katıldı;
		 * soru_yaniti: bir yakının sorduğun soruyu yanıtladı
		 */
		tur: text('tur').notNull(),
		aktorId: uuid('aktor_id').references(() => kullanicilar.id, { onDelete: 'cascade' }),
		disBagId: uuid('dis_bag_id').references(() => disBaglar.id, { onDelete: 'cascade' }),
		grupId: uuid('grup_id').references(() => gruplar.id, { onDelete: 'cascade' }),
		soruId: uuid('soru_id').references((): AnyPgColumn => sorular.id, { onDelete: 'cascade' }),
		okundu: zamanDamgasi('okundu'),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [
		index('bildirim_kutusu_alici_idx').on(t.aliciId, t.olusturma),
		check(
			'bildirim_kutusu_tur_kontrol',
			sql`${t.tur} in ('dis_bag', 'grup_katilim', 'soru_yaniti')`
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

// ——— Dönemler (hayat bölümleri): "Kadıköy yılları 2004–2011" ———

export const donemler = pgTable(
	'donemler',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sahipId: uuid('sahip_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		ad: text('ad').notNull(),
		baslangic: date('baslangic', { mode: 'string' }).notNull(),
		/** null: sürüyor */
		bitis: date('bitis', { mode: 'string' }),
		/** Palet anahtarı: kiremit, hardal, yesil, mavi, mor, gri */
		renk: text('renk').notNull().default('kiremit'),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [
		index('donemler_sahip_idx').on(t.sahipId, t.baslangic),
		check('donemler_ad_kontrol', sql`length(${t.ad}) between 1 and 80`),
		check('donemler_aralik_kontrol', sql`${t.bitis} is null or ${t.bitis} >= ${t.baslangic}`)
	]
);

// ——— Alıntılar: eserlerden satırlar ———

export const alintilar = pgTable(
	'alintilar',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sahipId: uuid('sahip_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		dugumId: uuid('dugum_id')
			.notNull()
			.references(() => dugumler.id, { onDelete: 'cascade' }),
		metin: text('metin').notNull(),
		/** "s. 42", "1:12:30" gibi yer bilgisi */
		yer: text('yer'),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [
		index('alintilar_dugum_idx').on(t.dugumId),
		check('alintilar_metin_kontrol', sql`length(${t.metin}) between 1 and 2000`)
	]
);

// ——— Bağ avı: "hayır, oradan gelmedim" cevapları bir daha sorulmasın ———

export const bagAviRedleri = pgTable(
	'bag_avi_redleri',
	{
		sahipId: uuid('sahip_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		kaynakId: uuid('kaynak_id')
			.notNull()
			.references(() => dugumler.id, { onDelete: 'cascade' }),
		hedefId: uuid('hedef_id')
			.notNull()
			.references(() => dugumler.id, { onDelete: 'cascade' }),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.sahipId, t.kaynakId, t.hedefId] })]
);

// ——— Karar Defteri: karar düğümünün gerekçesi, beklentisi, güveni ve sonucu ———

export const kararlar = pgTable(
	'kararlar',
	{
		dugumId: uuid('dugum_id')
			.primaryKey()
			.references(() => dugumler.id, { onDelete: 'cascade' }),
		gerekce: text('gerekce'),
		beklenti: text('beklenti'),
		/** Beklentinin gerçekleşeceğine güven (%) */
		guven: integer('guven'),
		/** Sonucun sorulacağı gün */
		sorulacak: date('sorulacak', { mode: 'string' }),
		/** gerceklesti / kismen / gerceklesmedi */
		sonuc: text('sonuc'),
		sonucNotu: text('sonuc_notu'),
		sonucTarihi: zamanDamgasi('sonuc_tarihi'),
		guncelleme: zamanDamgasi('guncelleme').notNull().defaultNow()
	},
	(t) => [
		index('kararlar_sorulacak_idx').on(t.sorulacak),
		check('kararlar_guven_kontrol', sql`${t.guven} is null or ${t.guven} between 0 and 100`),
		check(
			'kararlar_sonuc_kontrol',
			sql`${t.sonuc} is null or ${t.sonuc} in ('gerceklesti', 'kismen', 'gerceklesmedi')`
		)
	]
);

// ——— Kalıcı hız sınırı (UNLOGGED): sunucu yeniden başlasa ya da çoğalsa da sınırlar korunur ———

export const hizKayitlari = pgTable(
	'hiz_kayitlari',
	{
		/** Sınırın adı ("giris", "kayit"…) */
		ad: text('ad').notNull(),
		/** IP, e-posta ya da kullanıcı kimliği */
		anahtar: text('anahtar').notNull(),
		zaman: zamanDamgasi('zaman').notNull().defaultNow()
	},
	(t) => [index('hiz_kayitlari_idx').on(t.ad, t.anahtar, t.zaman)]
);

export type Kullanici = typeof kullanicilar.$inferSelect;
export type Dugum = typeof dugumler.$inferSelect;
export type YeniDugum = typeof dugumler.$inferInsert;
export type Bag = typeof baglar.$inferSelect;
export type { DugumTuru, EserDurumu, EserTuru, Gizlilik, TarihHassasiyeti } from '../../sabitler';

// ——— Fotoğraflar: "Bir zamanlar burası" (eski / yeni) ———

export const fotograflar = pgTable(
	'fotograflar',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sahipId: uuid('sahip_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		dugumId: uuid('dugum_id')
			.notNull()
			.references(() => dugumler.id, { onDelete: 'cascade' }),
		/** eski / yeni */
		donem: text('donem').notNull(),
		/** Çekildiği yıl (biliniyorsa) */
		yil: integer('yil'),
		aciklama: text('aciklama'),
		/** Kim çekti, nereden: "Babamın albümü", "SALT Araştırma" */
		kaynak: text('kaynak'),
		/** Hak beyanı: kendi / aile / izinli / kamu */
		hak: text('hak').notNull(),
		genislik: integer('genislik').notNull(),
		yukseklik: integer('yukseklik').notNull(),
		boyut: integer('boyut').notNull(),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [
		index('fotograflar_dugum_idx').on(t.dugumId, t.olusturma),
		check('fotograflar_donem_kontrol', sql`${t.donem} in ('eski', 'yeni')`),
		check('fotograflar_hak_kontrol', sql`${t.hak} in ('kendi', 'aile', 'izinli', 'kamu')`),
		check('fotograflar_yil_kontrol', sql`${t.yil} is null or ${t.yil} between 1800 and 2200`)
	]
);

// ——— Sesli anılar: kayıt ve yerel yazıya dökme (whisper.cpp) ———

export const sesler = pgTable(
	'sesler',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		/** Arşivin sahibi (yakınının yanıtıysa soruyu soran) */
		sahipId: uuid('sahip_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		dugumId: uuid('dugum_id').references(() => dugumler.id, { onDelete: 'cascade' }),
		soruId: uuid('soru_id').references((): AnyPgColumn => sorular.id, { onDelete: 'cascade' }),
		uzanti: text('uzanti').notNull(),
		boyut: integer('boyut').notNull(),
		/** Saniye (yazıya dökülürken hesaplanır) */
		sure: integer('sure'),
		metin: text('metin'),
		/** bekliyor / isleniyor / tamam / hata / kapali (yazıya dökme aracı yok) */
		durum: text('durum').notNull().default('bekliyor'),
		hata: text('hata'),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow(),
		islenme: zamanDamgasi('islenme')
	},
	(t) => [
		index('sesler_dugum_idx').on(t.dugumId),
		index('sesler_soru_idx').on(t.soruId),
		index('sesler_durum_idx').on(t.durum),
		check(
			'sesler_durum_kontrol',
			sql`${t.durum} in ('bekliyor', 'isleniyor', 'tamam', 'hata', 'kapali')`
		)
	]
);

// ——— Yakınlara soru: hesap gerektirmeyen bağlantıyla yanıt (yazılı ya da sesli) ———

export const sorular = pgTable(
	'sorular',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sahipId: uuid('sahip_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		/** Soruların sorulduğu yakın (haritadaki kişi düğümü, isteğe bağlı) */
		kisiId: uuid('kisi_id').references(() => dugumler.id, { onDelete: 'set null' }),
		aliciAdi: text('alici_adi').notNull(),
		metin: text('metin').notNull(),
		/** Yanıt bağlantısındaki jetonun SHA-256 özeti */
		jetonOzeti: text('jeton_ozeti').notNull().unique(),
		sonGecerlilik: zamanDamgasi('son_gecerlilik').notNull(),
		yanitMetni: text('yanit_metni'),
		yanitlanma: zamanDamgasi('yanitlanma'),
		/** Yanıttan oluşturulan anı düğümü */
		aniId: uuid('ani_id').references(() => dugumler.id, { onDelete: 'set null' }),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [
		index('sorular_sahip_idx').on(t.sahipId, t.olusturma),
		check('sorular_metin_kontrol', sql`length(${t.metin}) between 1 and 500`)
	]
);

// ——— Dijital vasiyet: uzun süre giriş yapılmazsa arşiv güvenilen kişiye açılır ———

export const vasiyetler = pgTable(
	'vasiyetler',
	{
		sahipId: uuid('sahip_id')
			.primaryKey()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		varisId: uuid('varis_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		/** Son girişten bu kadar ay sonra arşiv varise açılır */
		beklemeAy: integer('bekleme_ay').notNull(),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [
		index('vasiyetler_varis_idx').on(t.varisId),
		check('vasiyetler_bekleme_kontrol', sql`${t.beklemeAy} in (3, 6, 12, 24)`),
		check('vasiyetler_kendisi_degil', sql`${t.sahipId} <> ${t.varisId}`)
	]
);

// ——— Çeviri Masası: aynı paragrafın farklı Türkçe çevirileri, oy ve yorum ———

export const ceviriMasalari = pgTable(
	'ceviri_masalari',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sahipId: uuid('sahip_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		/** Masanın bağlı olduğu eser düğümü (sahibinin haritasında) */
		eserId: uuid('eser_id').references(() => dugumler.id, { onDelete: 'set null' }),
		baslik: text('baslik').notNull(),
		/** Özgün dil, ör. "Rusça" */
		ozgunDil: text('ozgun_dil'),
		aciklama: text('aciklama'),
		gizlilik: gizlilik('gizlilik').notNull().default('ozel'),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [
		index('ceviri_masalari_sahip_idx').on(t.sahipId, t.olusturma),
		index('ceviri_masalari_eser_idx').on(t.eserId),
		check('ceviri_masalari_gizlilik_kontrol', sql`${t.gizlilik}::text <> 'golge'`)
	]
);

export const ceviriParagraflari = pgTable(
	'ceviri_paragraflari',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		masaId: uuid('masa_id')
			.notNull()
			.references(() => ceviriMasalari.id, { onDelete: 'cascade' }),
		sira: integer('sira').notNull(),
		/** Eserdeki yeri: "1. bölüm, 3. paragraf" */
		yer: text('yer'),
		/** Özgün metin (isteğe bağlı; kısa) */
		ozgun: text('ozgun'),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [index('ceviri_paragraflari_masa_idx').on(t.masaId, t.sira)]
);

export const ceviriler = pgTable(
	'ceviriler',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		paragrafId: uuid('paragraf_id')
			.notNull()
			.references(() => ceviriParagraflari.id, { onDelete: 'cascade' }),
		ekleyenId: uuid('ekleyen_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		metin: text('metin').notNull(),
		cevirmen: text('cevirmen').notNull(),
		yayinevi: text('yayinevi'),
		yil: integer('yil'),
		/** Telif dayanağı: kamu (süresi dolmuş) / izinli / alinti (inceleme amaçlı kısa alıntı) */
		dayanak: text('dayanak').notNull(),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [
		index('ceviriler_paragraf_idx').on(t.paragrafId),
		check('ceviriler_metin_kontrol', sql`length(${t.metin}) between 1 and 600`),
		check('ceviriler_dayanak_kontrol', sql`${t.dayanak} in ('kamu', 'izinli', 'alinti')`)
	]
);

/** Paragraf başına bir oy: "bu paragrafta en çok bu çeviriyi beğendim" */
export const ceviriOylari = pgTable(
	'ceviri_oylari',
	{
		paragrafId: uuid('paragraf_id')
			.notNull()
			.references(() => ceviriParagraflari.id, { onDelete: 'cascade' }),
		kullaniciId: uuid('kullanici_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		ceviriId: uuid('ceviri_id')
			.notNull()
			.references(() => ceviriler.id, { onDelete: 'cascade' }),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [
		primaryKey({ columns: [t.paragrafId, t.kullaniciId] }),
		index('ceviri_oylari_ceviri_idx').on(t.ceviriId)
	]
);

export const ceviriYorumlari = pgTable(
	'ceviri_yorumlari',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		ceviriId: uuid('ceviri_id')
			.notNull()
			.references(() => ceviriler.id, { onDelete: 'cascade' }),
		yazarId: uuid('yazar_id')
			.notNull()
			.references(() => kullanicilar.id, { onDelete: 'cascade' }),
		metin: text('metin').notNull(),
		olusturma: zamanDamgasi('olusturma').notNull().defaultNow()
	},
	(t) => [
		index('ceviri_yorumlari_ceviri_idx').on(t.ceviriId, t.olusturma),
		check('ceviri_yorumlari_metin_kontrol', sql`length(${t.metin}) between 1 and 1000`)
	]
);
