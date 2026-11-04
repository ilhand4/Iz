// Örnek veri: iki demo hesabı, 1998–2023'e yayılmış birbirine bağlı düğümler ve iki iz.
// Çalıştırma: npm run db:seed (önce npm run db:migrate). Tekrar çalıştırılabilir: demo hesapları silinip yeniden kurulur.
import { inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/server/db/schema';
import { sifreOzetle } from '../src/lib/server/sifre';

try {
	process.loadEnvFile('.env');
} catch {
	// .env yoksa ortam değişkenleri kullanılır
}

const adres = process.env.DATABASE_URL;
if (!adres) throw new Error('DATABASE_URL tanımlı değil (.env.example dosyasına bakın).');
const sifre = process.env.SEED_SIFRE || 'iz-demo-2026';

const istemci = postgres(adres, { max: 1 });
const db = drizzle(istemci, { schema });
const { kullanicilar, dugumler, baglar, izler, izAdimlari } = schema;

const DEMO_EPOSTALAR = ['demo@iz.test', 'ayse@iz.test'];

type Tohum = Omit<schema.YeniDugum, 'sahipId'> & { anahtar: string };

const gun = (tarih: string) => ({ tarih, tarihHassasiyeti: 'gun' as const });
const ay = (yilAy: string) => ({ tarih: `${yilAy}-01`, tarihHassasiyeti: 'ay' as const });
const yil = (y: number) => ({ tarih: `${y}-01-01`, tarihHassasiyeti: 'yil' as const });

const demoDugumleri: Tohum[] = [
	{
		anahtar: 'kitaplik',
		tur: 'ani',
		baslik: 'Babaannemin kitaplığı',
		aciklama:
			'Kadıköy’deki evin koridorunda, tavana kadar uzanan raflar. Yazları orada kitap seçerdim.',
		...ay('1998-07'),
		enlem: 40.9903,
		boylam: 29.0295,
		yerAdi: 'Kadıköy, İstanbul'
	},
	{
		anahtar: 'madonna',
		tur: 'eser',
		eserTuru: 'kitap',
		baslik: 'Kürk Mantolu Madonna',
		altBaslik: 'Sabahattin Ali',
		yil: 1943,
		...ay('1998-08'),
		gizlilik: 'herkes'
	},
	{
		anahtar: 'sabahattin',
		tur: 'kisi',
		baslik: 'Sabahattin Ali',
		altBaslik: 'Yazar',
		...ay('1998-09'),
		gizlilik: 'herkes'
	},
	{
		anahtar: 'kuyucakli',
		tur: 'eser',
		eserTuru: 'kitap',
		baslik: 'Kuyucaklı Yusuf',
		altBaslik: 'Sabahattin Ali',
		yil: 1937,
		...yil(1999)
	},
	{
		anahtar: 'berlin',
		tur: 'yer',
		baslik: 'Berlin',
		altBaslik: 'Almanya',
		enlem: 52.52,
		boylam: 13.405,
		yerAdi: 'Berlin',
		gizlilik: 'herkes'
	},
	{
		anahtar: 'selin',
		tur: 'kisi',
		baslik: 'Selin Hoca',
		altBaslik: 'Lise edebiyat öğretmenim',
		...yil(2004)
	},
	{
		anahtar: 'tutunamayanlar',
		tur: 'eser',
		eserTuru: 'kitap',
		baslik: 'Tutunamayanlar',
		altBaslik: 'Oğuz Atay',
		yil: 1972,
		...ay('2005-01'),
		gizlilik: 'herkes'
	},
	{
		anahtar: 'tehlikeli',
		tur: 'eser',
		eserTuru: 'kitap',
		baslik: 'Tehlikeli Oyunlar',
		altBaslik: 'Oğuz Atay',
		yil: 1973,
		...yil(2006)
	},
	{
		anahtar: 'moda',
		tur: 'yer',
		baslik: 'Moda Sahili',
		altBaslik: 'Kadıköy',
		...ay('2010-06'),
		enlem: 40.98,
		boylam: 29.026,
		yerAdi: 'Moda, Kadıköy'
	},
	{
		anahtar: 'kulup',
		tur: 'ani',
		baslik: 'İlk kitap kulübü buluşması',
		aciklama:
			'Yedi kişiydik; Tutunamayanlar’ın ilk yüz sayfasını konuştuk ve hiçbirimiz bitirememiştik.',
		...gun('2011-10-02'),
		yerAdi: 'Moda, Kadıköy'
	},
	{
		anahtar: 'almanca',
		tur: 'karar',
		baslik: 'Almanca öğrenmeye başlamak',
		aciklama: 'Madonna’daki Berlin’i kendi gözümle görmek istedim. Akşam kursuna yazıldım.',
		...gun('2019-09-15')
	},
	{
		anahtar: 'himmel',
		tur: 'eser',
		eserTuru: 'film',
		baslik: 'Berlin Üzerinde Gökyüzü',
		altBaslik: 'Der Himmel über Berlin · Wim Wenders',
		yil: 1987,
		...ay('2020-02'),
		gizlilik: 'herkes'
	},
	{
		anahtar: 'nickcave',
		tur: 'kisi',
		baslik: 'Nick Cave',
		altBaslik: 'Müzisyen',
		...ay('2020-03')
	},
	{
		anahtar: 'boatman',
		tur: 'eser',
		eserTuru: 'muzik',
		baslik: 'The Boatman’s Call',
		altBaslik: 'Nick Cave & The Bad Seeds',
		yil: 1997,
		...ay('2020-03')
	},
	{
		anahtar: 'yukseklisans',
		tur: 'karar',
		baslik: 'Yüksek lisans için Berlin’e başvurmak',
		...ay('2021-01')
	},
	{
		anahtar: 'kreuzberg',
		tur: 'yer',
		baslik: 'Kreuzberg',
		altBaslik: 'Berlin',
		...ay('2022-04'),
		enlem: 52.4986,
		boylam: 13.403,
		yerAdi: 'Kreuzberg, Berlin'
	},
	{
		anahtar: 'babylon',
		tur: 'eser',
		eserTuru: 'dizi',
		baslik: 'Babylon Berlin',
		yil: 2017,
		...ay('2022-11')
	},
	{
		anahtar: 'kis',
		tur: 'ani',
		baslik: 'Kreuzberg’de ilk kış',
		aciklama: 'Saat dörtte kararan günler. Pencereden kanala bakıp eve, babaanneme mektup yazdım.',
		...ay('2022-12')
	},
	{
		anahtar: 'disco',
		tur: 'eser',
		eserTuru: 'oyun',
		baslik: 'Disco Elysium',
		altBaslik: 'ZA/UM',
		yil: 2019,
		...ay('2023-01')
	}
];

const demoBaglari: [string, string, string | null][] = [
	['kitaplik', 'madonna', 'Rafta, sararmış bir baskı olarak buldum'],
	['madonna', 'sabahattin', 'Yazarını merak ettim'],
	['sabahattin', 'kuyucakli', 'Diğer romanlarını okudum'],
	['madonna', 'berlin', 'Hikâyenin geçtiği şehir'],
	['selin', 'tutunamayanlar', 'Derste bir paragrafını okudu'],
	['tutunamayanlar', 'tehlikeli', 'Atay’ın başka neler yazdığını aradım'],
	['tutunamayanlar', 'kulup', 'Kitabı tartışacak birilerini aradım'],
	['moda', 'kulup', 'Buluşmalar sahildeki çay bahçesindeydi'],
	['kulup', 'almanca', 'Kulüpten biri akşam kursunu önerdi'],
	['berlin', 'almanca', 'Bir gün orada yaşamak istedim'],
	['almanca', 'himmel', 'Kurstaki hocam önerdi'],
	['himmel', 'nickcave', 'Filmde konser sahnesi var'],
	['nickcave', 'boatman', null],
	['almanca', 'yukseklisans', 'Dil yeterince ilerleyince cesaret ettim'],
	['yukseklisans', 'kreuzberg', 'Okula yakın bir oda buldum'],
	['berlin', 'babylon', 'Şehrin eski hâlini merak ettim'],
	['kreuzberg', 'kis', null],
	['kis', 'disco', 'Uzun kış akşamları']
];

const demoIzleri: {
	baslik: string;
	aciklama: string;
	gizlilik: 'ozel' | 'herkes';
	duraklar: [string, string | null][];
}[] = [
	{
		baslik: 'Bir kitaplıktan Berlin’e',
		aciklama:
			'Babaannemin rafındaki tek bir kitabın beni nasıl başka bir dile ve başka bir şehre götürdüğü.',
		gizlilik: 'herkes',
		duraklar: [
			['kitaplik', 'On iki yaşındaydım. Rafların en altında, tozlu bir sırt gördüm.'],
			['madonna', 'Raif Efendi’nin defteri bir yaz boyu elimden düşmedi.'],
			['berlin', 'Hikâyenin geçtiği şehir aklıma o yaz kazındı.'],
			['almanca', 'Yirmi yıl sonra, bir akşam kursunda “Ich heiße…” diye başladım.'],
			['yukseklisans', null],
			['kreuzberg', 'Sonunda oradaydım. Madonna’nın şehrinde, kendi odamda.']
		]
	},
	{
		baslik: 'Oğuz Atay yılları',
		aciklama: 'Bir öğretmenin okuduğu tek paragraftan bir kitap kulübüne.',
		gizlilik: 'ozel',
		duraklar: [
			['selin', 'Derste Selim Işık’tan bir paragraf okudu ve sustu.'],
			['tutunamayanlar', 'Üç kez başladım, dördüncüde bitirdim.'],
			['tehlikeli', null],
			['kulup', 'Kimse bitirememişti ama herkes konuşmak istiyordu.']
		]
	}
];

async function tohumla() {
	// Önceki demo verisini temizle (düğümler, bağlar, izler, oturumlar zincirleme silinir)
	await db.delete(kullanicilar).where(inArray(kullanicilar.eposta, DEMO_EPOSTALAR));

	const ozet = await sifreOzetle(sifre);
	const [demo, ayse] = await db
		.insert(kullanicilar)
		.values([
			{ kullaniciAdi: 'demo', eposta: 'demo@iz.test', ad: 'Deniz Demir', sifreOzeti: ozet },
			{ kullaniciAdi: 'ayse', eposta: 'ayse@iz.test', ad: 'Ayşe Işık', sifreOzeti: ozet }
		])
		.returning({ id: kullanicilar.id });

	const kimlikler: Record<string, string> = {};
	for (const { anahtar, ...dugum } of demoDugumleri) {
		const [satir] = await db
			.insert(dugumler)
			.values({ ...dugum, sahipId: demo.id })
			.returning({ id: dugumler.id });
		kimlikler[anahtar] = satir.id;
	}

	await db.insert(baglar).values(
		demoBaglari.map(([kaynak, hedef, not]) => ({
			sahipId: demo.id,
			kaynakId: kimlikler[kaynak],
			hedefId: kimlikler[hedef],
			not
		}))
	);

	for (const iz of demoIzleri) {
		const [satir] = await db
			.insert(izler)
			.values({ sahipId: demo.id, baslik: iz.baslik, aciklama: iz.aciklama, gizlilik: iz.gizlilik })
			.returning({ id: izler.id });
		await db.insert(izAdimlari).values(
			iz.duraklar.map(([anahtar, not], i) => ({
				izId: satir.id,
				dugumId: kimlikler[anahtar],
				sira: i + 1,
				not
			}))
		);
	}

	// İkinci kullanıcı: bir özel, bir herkese açık düğüm (yetki denemeleri için)
	await db.insert(dugumler).values([
		{
			sahipId: ayse.id,
			tur: 'ani',
			baslik: 'Ayşe’nin gizli günlüğü',
			aciklama: 'Bu düğüm özeldir; başka hiç kimse görmemeli.',
			gizlilik: 'ozel'
		},
		{
			sahipId: ayse.id,
			tur: 'eser',
			eserTuru: 'kitap',
			baslik: 'İnce Memed',
			altBaslik: 'Yaşar Kemal',
			yil: 1955,
			gizlilik: 'herkes'
		}
	]);
	await db.insert(izler).values({
		sahipId: ayse.id,
		baslik: 'Ayşe’nin özel izi',
		aciklama: 'Bu iz özeldir; başka hiç kimse görmemeli.',
		gizlilik: 'ozel'
	});

	console.log('Örnek veri yüklendi.');
	console.log('  demo@iz.test ve ayse@iz.test hesapları (şifre: .env içindeki SEED_SIFRE)');
	console.log(
		`  ${demoDugumleri.length + 2} düğüm, ${demoBaglari.length} bağ, ${demoIzleri.length + 1} iz`
	);
}

try {
	await tohumla();
} finally {
	await istemci.end();
}
