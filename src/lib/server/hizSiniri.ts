/**
 * Bellek içi kayan pencere hız sınırlayıcı (saf; birim testli). Uygulamadaki sınırlar
 * kalıcıdır ve PostgreSQL'de tutulur: sinirlar.ts → KaliciHizSiniri.
 */
export class HizSiniri {
	private readonly kayitlar = new Map<string, number[]>();

	constructor(
		private readonly limit: number,
		private readonly pencereMs: number,
		private readonly simdi: () => number = Date.now
	) {}

	/** Bir deneme kaydeder; sınır aşıldıysa izin vermez ve kaç saniye beklenmesi gerektiğini döner. */
	dene(anahtar: string): { izin: boolean; beklemeSaniye: number } {
		const simdi = this.simdi();
		const esik = simdi - this.pencereMs;
		const denemeler = (this.kayitlar.get(anahtar) ?? []).filter((t) => t > esik);

		if (denemeler.length >= this.limit) {
			this.kayitlar.set(anahtar, denemeler);
			const enEski = denemeler[0];
			return { izin: false, beklemeSaniye: Math.ceil((enEski + this.pencereMs - simdi) / 1000) };
		}

		denemeler.push(simdi);
		this.kayitlar.set(anahtar, denemeler);
		this.temizle(esik);
		return { izin: true, beklemeSaniye: 0 };
	}

	sifirla(anahtar: string): void {
		this.kayitlar.delete(anahtar);
	}

	// Bellek şişmesin: arada bir süresi dolmuş anahtarları at
	private temizle(esik: number): void {
		if (this.kayitlar.size < 1000) return;
		for (const [anahtar, denemeler] of this.kayitlar) {
			if (denemeler.every((t) => t <= esik)) this.kayitlar.delete(anahtar);
		}
	}
}

export function beklemeMesaji(saniye: number): string {
	const dakika = Math.ceil(saniye / 60);
	return dakika > 1
		? `Çok fazla deneme yapıldı. Lütfen ${dakika} dakika sonra tekrar deneyin.`
		: `Çok fazla deneme yapıldı. Lütfen ${saniye} saniye sonra tekrar deneyin.`;
}
