// Örnek veri: iki demo hesabı, birbirine bağlı düğümler ve bir iz.
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

const demoDugumleri: Tohum[] = [
	{
		anahtar: 'kitaplik',
		tur: 'ani',
		baslik: 'Babaannemin kitaplığı',
		aciklama: 'Kadıköy’deki evin koridorunda, tavana kadar uzanan raflar. Yazları orada kitap seçerdim.',
		tarih: '1998-07-01',
		tarihHassasiyeti: 'ay',
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
		tarih: '1998-08-01',
		tarihHassasiyeti: 'ay',
		gizlilik: 'herkes'
	},
	{ anahtar: 'sabahattin', tur: 'kisi', baslik: 'Sabahattin Ali', altBaslik: 'Yazar', gizlilik: 'herkes' },
	{
		anahtar: 'kuyucakli',
		tur: 'eser',
		eserTuru: 'kitap',
		baslik: 'Kuyucaklı Yusuf',
		altBaslik: 'Sabahattin Ali',
		yil: 1937,
		tarih: '1999-01-01',
		tarihHassasiyeti: 'yil'
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
		anahtar: 'almanca',
		tur: 'karar',
		baslik: 'Almanca öğrenmeye başlamak',
		aciklama: 'Madonna’daki Berlin’i kendi gözümle görmek istedim. Akşam kursuna yazıldım.',
		tarih: '2019-09-15',
		tarihHassasiyeti: 'gun'
	},
	{
		anahtar: 'himmel',
		tur: 'eser',
		eserTuru: 'film',
		baslik: 'Berlin Üzerinde Gökyüzü',
		altBaslik: 'Der Himmel über Berlin · Wim Wenders',
		yil: 1987,
		tarih: '2020-02-01',
		tarihHassasiyeti: 'ay',
		gizlilik: 'herkes'
	},
	{ anahtar: 'nickcave', tur: 'kisi', baslik: 'Nick Cave', altBaslik: 'Müzisyen' },
	{
		anahtar: 'boatman',
		tur: 'eser',
		eserTuru: 'muzik',
		baslik: 'The Boatman’s Call',
		altBaslik: 'Nick Cave & The Bad Seeds',
		yil: 1997,
		tarih: '2020-03-01',
		tarihHassasiyeti: 'ay'
	}
];

const demoBaglari: [string, string, string | null][] = [
	['kitaplik', 'madonna', 'Rafta, sararmış bir baskı olarak buldum'],
	['madonna', 'sabahattin', 'Yazarını merak ettim'],
	['sabahattin', 'kuyucakli', 'Diğer romanlarını okudum'],
	['madonna', 'berlin', 'Hikâyenin geçtiği şehir'],
	['berlin', 'almanca', 'Bir gün gitmek istedim'],
	['almanca', 'himmel', 'Kurstaki hocam önerdi'],
	['himmel', 'nickcave', 'Filmde konser sahnesi var'],
	['nickcave', 'boatman', null]
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

	const [iz] = await db
		.insert(izler)
		.values({
			sahipId: demo.id,
			baslik: 'Bir kitaplıktan Berlin’e',
			aciklama: 'Babaannemin rafındaki tek bir kitabın beni nasıl başka bir dile ve şehre götürdüğü.',
			gizlilik: 'herkes'
		})
		.returning({ id: izler.id });
	await db.insert(izAdimlari).values(
		['kitaplik', 'madonna', 'berlin', 'almanca', 'himmel'].map((anahtar, i) => ({
			izId: iz.id,
			dugumId: kimlikler[anahtar],
			sira: i + 1
		}))
	);

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

	console.log('Örnek veri yüklendi.');
	console.log(`  demo@iz.test ve ayse@iz.test hesapları (şifre: .env içindeki SEED_SIFRE)`);
	console.log(`  ${demoDugumleri.length + 2} düğüm, ${demoBaglari.length} bağ, 1 iz`);
}

try {
	await tohumla();
} finally {
	await istemci.end();
}
