/**
 * Bellek içi kayan pencere hız sınırlayıcı.
 * Tek süreçli çalışma için yeterli; birden çok sunucuya geçince PostgreSQL ya da Redis'e taşınmalı.
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

/** Kişi başına: aynı IP + e-posta için 15 dakikada 5 deneme */
export const girisSiniri = new HizSiniri(5, 15 * 60_000);
/** IP başına: 15 dakikada 30 giriş denemesi */
export const ipGirisSiniri = new HizSiniri(30, 15 * 60_000);
/** IP başına: saatte 10 kayıt */
export const kayitSiniri = new HizSiniri(10, 60 * 60_000);

export function beklemeMesaji(saniye: number): string {
	const dakika = Math.ceil(saniye / 60);
	return dakika > 1
		? `Çok fazla deneme yapıldı. Lütfen ${dakika} dakika sonra tekrar deneyin.`
		: `Çok fazla deneme yapıldı. Lütfen ${saniye} saniye sonra tekrar deneyin.`;
}
