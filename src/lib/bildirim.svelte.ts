// Bildirim baloncukları: kısa geri bildirimler ve "Geri al".
// Form eylemleri sonuçlarında `bildirim` döndürür; düzen bileşeni bunları burada gösterir.
// Yalnızca tarayıcıda kullanılır: sunucuda modül durumu istekler arasında paylaşılacağı için
// goster() SSR sırasında hiçbir şey yapmaz.
import { deserialize } from '$app/forms';
import { refreshAll } from '$app/navigation';

export type GeriAlEylemi =
	/** Sunucu eylemi, ör. "/dugumler/…?/bagKur"; alanlar form verisi olarak gönderilir */
	| { eylem: string; alanlar: Record<string, string> }
	/** Tarayıcıda geri alma (ör. ağ yerleşimini eski hâline döndürmek) */
	| { fn: () => void | Promise<void> };

export type BildirimGirdisi = {
	mesaj: string;
	tur?: 'basari' | 'hata' | 'bilgi';
	geriAl?: GeriAlEylemi;
	baglanti?: { href: string; metin: string };
	/** Milisaniye; 0 verilirse kendiliğinden kapanmaz */
	sure?: number;
};

export type Bildirim = BildirimGirdisi & { id: number; tur: 'basari' | 'hata' | 'bilgi' };

class BildirimDeposu {
	liste = $state<Bildirim[]>([]);
	#sayac = 0;
	#zamanlayicilar = new Map<number, ReturnType<typeof setTimeout>>();

	goster(girdi: BildirimGirdisi): number | null {
		if (typeof window === 'undefined') return null;
		const id = ++this.#sayac;
		const tur = girdi.tur ?? 'basari';
		const sure = girdi.sure ?? (girdi.geriAl || tur === 'hata' ? 8000 : 5000);
		this.liste.push({ ...girdi, id, tur, sure });
		// Aynı anda en fazla üç baloncuk
		while (this.liste.length > 3) this.kapat(this.liste[0].id);
		this.#zamanla(id, sure);
		return id;
	}

	kapat(id: number) {
		clearTimeout(this.#zamanlayicilar.get(id));
		this.#zamanlayicilar.delete(id);
		const i = this.liste.findIndex((b) => b.id === id);
		if (i >= 0) this.liste.splice(i, 1);
	}

	/** Fare üzerindeyken ya da odaklanınca kendiliğinden kapanmasın */
	duraklat(id: number) {
		clearTimeout(this.#zamanlayicilar.get(id));
		this.#zamanlayicilar.delete(id);
	}

	devamEt(id: number) {
		const b = this.liste.find((x) => x.id === id);
		if (b && b.sure !== 0) this.#zamanla(id, 3000);
	}

	async geriAl(b: Bildirim) {
		this.kapat(b.id);
		const eylem = b.geriAl;
		if (!eylem) return;
		try {
			if ('fn' in eylem) {
				await eylem.fn();
			} else {
				const veri = new FormData();
				for (const [ad, deger] of Object.entries(eylem.alanlar)) veri.set(ad, deger);
				const yanit = await fetch(eylem.eylem, {
					method: 'POST',
					body: veri,
					headers: { 'x-sveltekit-action': 'true', accept: 'application/json' }
				});
				const sonuc = deserialize(await yanit.text());
				if (sonuc.type === 'failure' || sonuc.type === 'error') throw new Error('geri alınamadı');
				await refreshAll();
			}
			this.goster({ mesaj: 'Geri alındı.', tur: 'bilgi' });
		} catch {
			this.goster({ mesaj: 'Geri alınamadı. Sayfayı yenileyip tekrar dene.', tur: 'hata' });
		}
	}

	#zamanla(id: number, sure: number) {
		if (!sure) return;
		this.#zamanlayicilar.set(
			id,
			setTimeout(() => this.kapat(id), sure)
		);
	}
}

export const bildirimler = new BildirimDeposu();
