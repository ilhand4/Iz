import { describe, expect, it } from 'vitest';
import { iceAktarmaDogrula, markdownYaz, type DisaAktarma } from './veriTasima';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

const ornek: DisaAktarma = {
	bicim: 'iz-disa-aktarma',
	surum: 1,
	olusturma: '2026-11-04T10:00:00.000Z',
	hesap: { kullaniciAdi: 'deniz', ad: 'Deniz', hakkinda: 'Okur' },
	dugumler: [
		{
			id: A,
			tur: 'kisi',
			eserTuru: null,
			baslik: 'Selin Hoca',
			altBaslik: 'Öğretmen',
			aciklama: null,
			tarih: '2004-01-01',
			tarihHassasiyeti: 'yil',
			yil: null,
			enlem: null,
			boylam: null,
			yerAdi: null,
			gizlilik: 'ozel',
			durum: null,
			disKaynak: null,
			disKimlik: null,
			gorselUrl: null
		},
		{
			id: B,
			tur: 'eser',
			eserTuru: 'kitap',
			baslik: 'Tutunamayanlar',
			altBaslik: 'Oğuz Atay',
			aciklama: 'Üç kez başladım.\nDördüncüde bitti.',
			tarih: null,
			tarihHassasiyeti: null,
			yil: 1972,
			enlem: null,
			boylam: null,
			yerAdi: null,
			gizlilik: 'herkes',
			durum: 'bitti',
			disKaynak: null,
			disKimlik: null,
			gorselUrl: null
		}
	],
	baglar: [{ kaynakId: A, hedefId: B, not: 'derste okudu', tarih: null, tarihHassasiyeti: null }],
	izler: [
		{
			baslik: 'Atay yılları',
			aciklama: null,
			gizlilik: 'ozel',
			duraklar: [
				{ dugumId: A, not: null },
				{ dugumId: B, not: 'bitirdim' }
			]
		}
	]
};

describe('markdownYaz', () => {
	it('düğümleri, bağları ve izleri okunur biçimde yazar', () => {
		const md = markdownYaz(ornek);
		expect(md).toContain('# Deniz — İz haritası');
		expect(md).toContain('### Tutunamayanlar');
		expect(md).toContain('- Kitap · Oğuz Atay · 1972');
		expect(md).toContain('- Tarih: 2004');
		expect(md).toContain('Beni şuna götürdü:\n- Tutunamayanlar — derste okudu');
		expect(md).toContain('2. **Tutunamayanlar** — bitirdim');
		expect(md).toContain('Üç kez başladım.  \nDördüncüde bitti.');
	});
});

describe('iceAktarmaDogrula', () => {
	it('kendi dışa aktarma dosyasını olduğu gibi kabul eder', () => {
		const s = iceAktarmaDogrula(JSON.parse(JSON.stringify(ornek)));
		expect(s.tamam).toBe(true);
		if (s.tamam) {
			expect(s.atlanan).toBe(0);
			expect(s.veri.dugumler[1]).toMatchObject({ baslik: 'Tutunamayanlar', durum: 'bitti' });
		}
	});

	it('tanınmayan biçimi, sürümü ve aşırı büyük dosyayı reddeder', () => {
		expect(iceAktarmaDogrula([]).tamam).toBe(false);
		expect(iceAktarmaDogrula({ ...ornek, bicim: 'baska' }).tamam).toBe(false);
		expect(iceAktarmaDogrula({ ...ornek, surum: 2 }).tamam).toBe(false);
		expect(
			iceAktarmaDogrula({ ...ornek, dugumler: Array.from({ length: 5001 }, () => ({})) }).tamam
		).toBe(false);
	});

	it('bozuk kayıtları atlar, tehlikeli değerleri temizler', () => {
		const s = iceAktarmaDogrula({
			...ornek,
			dugumler: [
				...ornek.dugumler,
				{ id: 'kimlik-degil', tur: 'ani', baslik: 'x' },
				{ id: '33333333-3333-4333-8333-333333333333', tur: 'uydurma', baslik: 'x' },
				{
					id: '44444444-4444-4444-8444-444444444444',
					tur: 'ani',
					baslik: 'Kötü değerler',
					gorselUrl: 'https://kotu.example/iz.png',
					disKaynak: 'openlibrary',
					disKimlik: '../../etc',
					durum: 'bitti',
					enlem: 91,
					boylam: 10,
					gizlilik: 'herkese',
					tarih: '2020-13-45',
					tarihHassasiyeti: 'gun'
				}
			],
			baglar: [...ornek.baglar, { kaynakId: A, hedefId: A }, { kaynakId: A, hedefId: B }]
		});
		if (!s.tamam) throw new Error(s.hata);
		expect(s.atlanan).toBe(4);
		expect(s.veri.dugumler[2]).toMatchObject({
			gorselUrl: null,
			disKaynak: null,
			disKimlik: null,
			durum: null,
			enlem: null,
			boylam: null,
			gizlilik: 'ozel',
			tarih: null
		});
		expect(s.veri.baglar).toHaveLength(1);
	});

	it('takvimde olmayan günü tarihsiz sayar', () => {
		const s = iceAktarmaDogrula({
			...ornek,
			dugumler: [{ ...ornek.dugumler[0], tarih: '2021-02-29', tarihHassasiyeti: 'gun' }],
			baglar: [],
			izler: []
		});
		expect(s.tamam && s.veri.dugumler[0].tarih).toBe(null);
	});
});
