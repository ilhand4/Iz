import { sequence, type Handle } from '@sveltejs/kit/hooks';
import {
	OTURUM_CEREZI,
	oturumCereziSil,
	oturumCereziYaz,
	oturumDogrula
} from '#lib/server/oturum.ts';

const GUVENLI_YONTEMLER = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF koruması: durum değiştiren her istekte Origin başlığı sitenin kendi kökeniyle aynı olmalı.
 * SvelteKit yalnızca form içerik türlerini ve yalnızca üretimde denetler; bu kanca JSON dahil
 * tüm istekleri geliştirme ortamında da denetler. SameSite=Lax çerez ikinci savunma hattıdır.
 */
const csrfKorumasi: Handle = async ({ event, resolve }) => {
	if (!GUVENLI_YONTEMLER.has(event.request.method)) {
		const koken = event.request.headers.get('origin');
		if (koken !== event.url.origin) {
			return new Response('Bu istek başka bir siteden geldiği için reddedildi (CSRF koruması).', {
				status: 403,
				headers: { 'content-type': 'text/plain; charset=utf-8' }
			});
		}
	}
	return resolve(event);
};

const oturum: Handle = async ({ event, resolve }) => {
	event.locals.kullanici = null;
	event.locals.oturumId = null;

	const jeton = event.cookies.get(OTURUM_CEREZI);
	if (jeton) {
		const sonuc = await oturumDogrula(jeton);
		if (sonuc.oturum) {
			oturumCereziYaz(event.cookies, jeton, sonuc.oturum.bitis);
			event.locals.kullanici = sonuc.kullanici;
			event.locals.oturumId = sonuc.oturum.id;
		} else {
			oturumCereziSil(event.cookies);
		}
	}
	return resolve(event);
};

/** Tema çerezini sunucuda okuyup <html data-theme> olarak yazar: sayfa yanlış temada parlamaz */
const tema: Handle = async ({ event, resolve }) => {
	const secim = event.cookies.get('tema');
	const ozellik = secim === 'acik' || secim === 'koyu' ? `data-theme="${secim}"` : '';
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%iz.tema%', ozellik)
	});
};

const guvenlikBasliklari: Handle = async ({ event, resolve }) => {
	const yanit = await resolve(event);
	yanit.headers.set('X-Content-Type-Options', 'nosniff');
	yanit.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	yanit.headers.set('X-Frame-Options', 'DENY');
	yanit.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
	return yanit;
};

export const handle = sequence(guvenlikBasliklari, csrfKorumasi, oturum, tema);
