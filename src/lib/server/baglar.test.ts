// Bağ türleri, satır içi bağlar ve aşamalı ağ sorgusu (PGlite üzerinde).
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./db/index.ts', async () => {
	const { testVeritabani } = await import('./test/pglite.ts');
	return { db: await testVeritabani() };
});

const { db } = await import('./db/index.ts');
const { dugumler, kullanicilar } = await import('./db/schema.ts');
const baglar = await import('./baglar.ts');
const { haritaVerisi } = await import('./dugumler.ts');
const { bagDogrula, bagBilgisiDogrula } = await import('./dogrulama.ts');

let ali: string;
const d: Record<string, string> = {};

function form(alanlar: Record<string, string>) {
	const fd = new FormData();
	for (const [k, v] of Object.entries(alanlar)) fd.set(k, v);
	return fd;
}

beforeAll(async () => {
	const [k] = await db
		.insert(kullanicilar)
		.values({ kullaniciAdi: 'ali', eposta: 'ali@iz.test', ad: 'Ali', sifreOzeti: 'x' })
		.returning({ id: kullanicilar.id });
	ali = k.id;
	for (const ad of ['A', 'B', 'C', 'D', 'E', 'Kürk Mantolu Madonna']) {
		const [x] = await db
			.insert(dugumler)
			.values({ sahipId: ali, tur: 'ani', baslik: ad })
			.returning({ id: dugumler.id });
		d[ad] = x.id;
	}
});

describe('bağ türleri', () => {
	it('formdaki tür doğrulanır; boş "belirtilmemiş", geçersiz tür yok sayılır', () => {
		const s = bagDogrula(form({ yon: 'giden', digerId: d.B, tur: 'celisir' }), d.A);
		expect(s.tamam && s.veri.tur).toBe('celisir');
		const bos = bagBilgisiDogrula(form({ not: '', tur: '' }));
		expect(bos.tamam && bos.veri.tur).toBeNull();
		const kotu = bagBilgisiDogrula(form({ tur: 'nefret' }));
		expect(kotu.tamam && kotu.veri.tur).toBeNull();
		// Formda tür alanı hiç yoksa dokunulmaz
		const yok = bagBilgisiDogrula(form({ not: 'x' }));
		expect(yok.tamam && 'tur' in yok.veri).toBe(false);
	});

	it('tür kaydedilir, harita verisinde döner ve güncellenir', async () => {
		expect(
			await baglar.bagKur(ali, {
				kaynakId: d.A,
				hedefId: d.B,
				not: null,
				tarih: null,
				tarihHassasiyeti: null,
				tur: 'besler'
			})
		).toBe('kuruldu');
		const { giden } = await baglar.dugumBaglari(d.A, ali);
		expect(giden[0].tur).toBe('besler');
		await baglar.bagGuncelle(giden[0].id, ali, {
			not: null,
			tarih: null,
			tarihHassasiyeti: null,
			tur: 'sentezler'
		});
		const harita = await haritaVerisi(ali);
		expect(harita.baglar.find((b) => b.kaynakId === d.A)?.tur).toBe('sentezler');
	});
});

describe('satır içi bağlar', () => {
	it('[[Başlık]] adındaki kendi düğümlerine bağ kurar; bulunamayanı ve kendini atlar', async () => {
		const kurulan = await baglar.satirIciBaglariKur(
			ali,
			d.C,
			'Önce [[kürk mantolu madonna]], sonra [[Yok böyle bir şey]] ve [[C]].'
		);
		expect(kurulan).toBe(1);
		const { giden } = await baglar.dugumBaglari(d.C, ali);
		expect(giden.map((b) => b.dugum.baslik)).toEqual(['Kürk Mantolu Madonna']);
		// İkinci kayıtta yeniden kurulmaz
		expect(await baglar.satirIciBaglariKur(ali, d.C, '[[Kürk Mantolu Madonna]]')).toBe(0);
	});
});

describe('aşamalı ağ sorgusu', () => {
	it('odak çevresi bağ yönüne bakmadan derinliğe göre', async () => {
		// A → B (yukarıda), D → C, C → Madonna (yukarıda); E bağsız
		await baglar.bagKur(ali, {
			kaynakId: d.D,
			hedefId: d.C,
			not: null,
			tarih: null,
			tarihHassasiyeti: null
		});
		const bir = await baglar.cevreDugumleri(ali, d.C, 1);
		expect(new Set(bir)).toEqual(new Set([d.C, d.D, d['Kürk Mantolu Madonna']]));
		const yalniz = await baglar.cevreDugumleri(ali, d.E, 2);
		expect(yalniz).toEqual([d.E]);
		const kisitli = await haritaVerisi(ali, bir);
		expect(kisitli.dugumler).toHaveLength(3);
		expect(kisitli.baglar.every((b) => bir.includes(b.kaynakId) && bir.includes(b.hedefId))).toBe(
			true
		);
		expect(await baglar.enBaglisi(ali)).toBe(d.C);
	});
});
