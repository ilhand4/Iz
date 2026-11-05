// Çevrimdışı okuma: uygulama dosyaları önbellekte; ziyaret edilen sayfalar ağ önce, bağlantı yoksa
// son kopyadan gösterilir. Kişisel sayfalar yalnızca bu cihazdaki tarayıcı önbelleğinde tutulur ve
// çıkış yapılınca (POST /cikis) silinir. Yazma istekleri, API, ses ve fotoğraflar önbelleğe girmez.
import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self as sw } from '$app/service-worker';

const build = immutable.map((d) => d.path);
const files = assets.map((d) => d.path as string);
const UYGULAMA = `iz-uygulama-${version}`;
const SAYFALAR = 'iz-sayfalar';
const CEVRIMDISI = '/cevrimdisi';
const EN_COK_SAYFA = 80;

const ONBELLEK_DISI =
	/^\/(api|sesler|fotograflar|cikis|giris|kayit|yanit|davet|sifre|eposta|ayarlar\/disa-aktar|emanet\/[^/]+\/disa-aktar)/;

sw.addEventListener('install', (olay) => {
	olay.waitUntil(
		(async () => {
			const onbellek = await caches.open(UYGULAMA);
			await onbellek.addAll([...build, ...files.filter((f) => !f.endsWith('.map')), CEVRIMDISI]);
			await sw.skipWaiting();
		})()
	);
});

sw.addEventListener('activate', (olay) => {
	olay.waitUntil(
		(async () => {
			for (const ad of await caches.keys())
				if (ad.startsWith('iz-uygulama-') && ad !== UYGULAMA) await caches.delete(ad);
			await sw.clients.claim();
		})()
	);
});

async function sinirla() {
	const onbellek = await caches.open(SAYFALAR);
	const anahtarlar = await onbellek.keys();
	for (const k of anahtarlar.slice(0, Math.max(0, anahtarlar.length - EN_COK_SAYFA)))
		await onbellek.delete(k);
}

sw.addEventListener('fetch', (olay) => {
	const istek = olay.request;
	const adres = new URL(istek.url);
	if (adres.origin !== sw.location.origin) return;

	// Çıkış: bu cihazda saklanan kişisel sayfalar silinir
	if (istek.method === 'POST' && adres.pathname === '/cikis') {
		olay.waitUntil(caches.delete(SAYFALAR));
		return;
	}
	if (istek.method !== 'GET' || ONBELLEK_DISI.test(adres.pathname)) return;

	// Derlenmiş dosyalar değişmez: önbellek önce
	if (build.includes(adres.pathname) || files.includes(adres.pathname)) {
		olay.respondWith(caches.match(istek).then((y) => y ?? fetch(istek)));
		return;
	}

	// Sayfalar ve sayfa verisi (__data.json): ağ önce, olmazsa son kopya, o da yoksa çevrimdışı sayfası
	const sayfaMi = istek.mode === 'navigate' || adres.pathname.endsWith('/__data.json');
	if (!sayfaMi) return;
	olay.respondWith(
		(async () => {
			try {
				const yanit = await fetch(istek);
				if (yanit.ok && yanit.type === 'basic') {
					const onbellek = await caches.open(SAYFALAR);
					await onbellek.put(istek, yanit.clone());
					void sinirla();
				}
				return yanit;
			} catch {
				const kopya = await caches.match(istek);
				if (kopya) return kopya;
				if (istek.mode === 'navigate') {
					const cevrimdisi = await caches.match(CEVRIMDISI);
					if (cevrimdisi) return cevrimdisi;
				}
				return new Response('Çevrimdışı', { status: 503 });
			}
		})()
	);
});
