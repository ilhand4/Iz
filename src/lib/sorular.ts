// Yakınlara soru: hazır soru bankası ve "bu haftanın sorusu" (saf; birim testleri sorular.test.ts).
// Amaç: bir büyüğün hafızasındakini, hesap açmasına gerek kalmadan, yazarak ya da sesli mesajla almak.

export const SORU_BANKASI = [
	'Çocukken oturduğun evi anlatır mısın? Hangi odada ne vardı?',
	'Annenle babanın nasıl tanıştığını biliyor musun?',
	'Okula ilk gittiğin günden ne hatırlıyorsun?',
	'Gençliğinde en sevdiğin şarkı hangisiydi? Onu nerede dinlerdin?',
	'Bayramlar senin çocukluğunda nasıl geçerdi?',
	'Hayatında seni en çok etkileyen kitap ya da film hangisi?',
	'İlk işin neydi? İlk maaşınla ne yaptın?',
	'Mahallende kimler vardı? Unutamadığın bir komşun var mı?',
	'Hayatının dönüm noktası dediğin bir karar var mı? Bugün yine aynısını yapar mıydın?',
	'Gittiğin en uzak yer neresi? Oraya nasıl gittin?',
	'Büyüklerinden duyduğun ve hiç unutmadığın bir söz var mı?',
	'Çocukken hangi oyunları oynardınız?',
	'Evlendiğin günü anlatır mısın?',
	'En çok özlediğin bir yemek ve onu yapan kişi kim?',
	'Bir fotoğrafa bakınca aklına gelen ilk anı ne?',
	'Gençken bir gün kesinlikle yapacağım dediğin şey neydi?',
	'Hayatında bir dönem bitti dediğin bir an oldu mu? Neydi?',
	'Seni bugünkü sen yapan üç kişi kim?',
	'Bir şehre ilk geldiğinde neler hissettin?',
	'Benim doğduğum günü hatırlıyor musun?',
	'Askerlik ya da okul yıllarından anlatmaya doyamadığın bir hikâye var mı?',
	'Hangi radyo programını, hangi diziyi kaçırmazdın?',
	'Bir zamanlar çok sevdiğin ama artık olmayan bir yer var mı?',
	'Bana vermek istediğin bir öğüt olsa ne olurdu?'
] as const;

/** ISO hafta numarası (pazartesi başlar) */
export function isoHafta(tarih: Date): { yil: number; hafta: number } {
	const d = new Date(Date.UTC(tarih.getUTCFullYear(), tarih.getUTCMonth(), tarih.getUTCDate()));
	const gun = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - gun);
	const yilBasi = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return {
		yil: d.getUTCFullYear(),
		hafta: Math.ceil(((d.getTime() - yilBasi.getTime()) / 86400000 + 1) / 7)
	};
}

/** Haftada bir soru: aynı hafta hep aynı soru, sırayla dönerek */
export function haftaninSorusu(tarih = new Date()) {
	const { yil, hafta } = isoHafta(tarih);
	return SORU_BANKASI[(yil * 53 + hafta) % SORU_BANKASI.length];
}

/** WhatsApp ile paylaşma bağlantısı (e-posta servisi olmadan yakına ulaştırmak için) */
export function whatsappBaglantisi(metin: string) {
	return `https://wa.me/?text=${encodeURIComponent(metin)}`;
}

export const SORU_GECERLILIK_GUN = 60;
export const EN_UZUN_YANIT = 20000;
