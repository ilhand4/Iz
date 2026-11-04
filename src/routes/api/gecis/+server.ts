// Geçiş anahtarı (passkey) uç noktası. Köken denetimi hooks.server.ts'de.
// İstek gövdesi: { adim: 'kayit-secenekleri' | 'kayit' | 'giris-secenekleri' | 'giris', ... }
import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/env';
import { cihazAdi } from '#lib/server/cihaz.ts';
import {
	girisDogrula,
	girisSecenekleri,
	kayitDogrula,
	kayitSecenekleri,
	MEYDAN_CEREZI
} from '#lib/server/gecisAnahtari.ts';
import { beklemeMesaji, ipGirisSiniri } from '#lib/server/hizSiniri.ts';
import { jetonUret, oturumAc, oturumCereziYaz } from '#lib/server/oturum.ts';
import { guvenliDonus } from '#lib/server/yetki.ts';
import type { RequestHandler } from './$types';

function meydanCereziYaz(cookies: Cookies, kimlik: string) {
	cookies.set(MEYDAN_CEREZI, kimlik, {
		path: '/api/gecis',
		httpOnly: true,
		sameSite: 'strict',
		secure: !dev,
		maxAge: 300
	});
}

export const POST: RequestHandler = async ({ request, url, cookies, locals, getClientAddress }) => {
	let govde: Record<string, unknown>;
	try {
		govde = await request.json();
	} catch {
		return Response.json({ hata: 'Geçersiz istek.' }, { status: 400 });
	}
	const rpID = url.hostname;
	const beklenen = { koken: url.origin, rpID };
	const meydan = cookies.get(MEYDAN_CEREZI);

	switch (govde.adim) {
		case 'kayit-secenekleri': {
			if (!locals.kullanici) return Response.json({ hata: 'Giriş yapmalısın.' }, { status: 401 });
			const { secenekler, meydanKimligi } = await kayitSecenekleri(locals.kullanici.id, rpID);
			meydanCereziYaz(cookies, meydanKimligi);
			return Response.json(secenekler);
		}
		case 'kayit': {
			if (!locals.kullanici) return Response.json({ hata: 'Giriş yapmalısın.' }, { status: 401 });
			cookies.delete(MEYDAN_CEREZI, { path: '/api/gecis' });
			const ad = typeof govde.ad === 'string' && govde.ad.trim() ? govde.ad.trim() : null;
			const tamam = await kayitDogrula(
				locals.kullanici.id,
				govde.yanit as Parameters<typeof kayitDogrula>[1],
				meydan,
				beklenen,
				ad ?? cihazAdi(request.headers.get('user-agent')) ?? 'Geçiş anahtarı'
			);
			return tamam
				? Response.json({ tamam: true })
				: Response.json({ hata: 'Geçiş anahtarı doğrulanamadı.' }, { status: 400 });
		}
		case 'giris-secenekleri': {
			const sinir = ipGirisSiniri.dene(getClientAddress());
			if (!sinir.izin) {
				return Response.json({ hata: beklemeMesaji(sinir.beklemeSaniye) }, { status: 429 });
			}
			const { secenekler, meydanKimligi } = await girisSecenekleri(rpID);
			meydanCereziYaz(cookies, meydanKimligi);
			return Response.json(secenekler);
		}
		case 'giris': {
			cookies.delete(MEYDAN_CEREZI, { path: '/api/gecis' });
			const kullaniciId = await girisDogrula(
				govde.yanit as Parameters<typeof girisDogrula>[0],
				meydan,
				beklenen
			);
			if (!kullaniciId) {
				return Response.json({ hata: 'Geçiş anahtarıyla giriş yapılamadı.' }, { status: 400 });
			}
			const jeton = jetonUret();
			const oturum = await oturumAc(
				jeton,
				kullaniciId,
				cihazAdi(request.headers.get('user-agent'))
			);
			oturumCereziYaz(cookies, jeton, oturum.bitis);
			const donus = typeof govde.donus === 'string' ? govde.donus : null;
			return Response.json({ yonlendir: guvenliDonus(donus) });
		}
		default:
			return Response.json({ hata: 'Bilinmeyen adım.' }, { status: 400 });
	}
};
