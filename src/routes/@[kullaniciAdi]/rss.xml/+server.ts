// Herkese açık izlerin RSS akışı (özel izler ve özel durakların başlıkları hiç girmez)
import { error } from '@sveltejs/kit';
import { KULLANICI_ADI_DESENI } from '#lib/server/dogrulama.ts';
import { izleriListele } from '#lib/server/izler.ts';
import { profilGetir } from '#lib/server/profil.ts';
import type { RequestHandler } from './$types';

function kacir(metin: string) {
	return metin
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export const GET: RequestHandler = async ({ params, url }) => {
	const ad = params.kullaniciAdi.toLowerCase();
	const profil = KULLANICI_ADI_DESENI.test(ad) ? await profilGetir(ad) : null;
	if (!profil) error(404, 'Böyle bir kullanıcı yok.');
	const izler = await izleriListele(profil.id, { izleyenId: null, limit: 30 });
	const kok = url.origin;
	const ogeler = izler
		.map((iz) => {
			const duraklar = iz.duraklar.map((d) => d.baslik).join(' → ');
			const aciklama = [iz.aciklama, duraklar && `Duraklar: ${duraklar}`]
				.filter(Boolean)
				.join('\n\n');
			return `\t\t<item>
\t\t\t<title>${kacir(iz.baslik)}</title>
\t\t\t<link>${kok}/izler/${iz.id}</link>
\t\t\t<guid isPermaLink="true">${kok}/izler/${iz.id}</guid>
\t\t\t<pubDate>${iz.guncelleme.toUTCString()}</pubDate>
\t\t\t<description>${kacir(aciklama)}</description>
\t\t</item>`;
		})
		.join('\n');
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
\t<channel>
\t\t<title>${kacir(profil.ad)} · İz</title>
\t\t<link>${kok}/@${profil.kullaniciAdi}</link>
\t\t<atom:link href="${kok}/@${profil.kullaniciAdi}/rss.xml" rel="self" type="application/rss+xml" />
\t\t<description>${kacir(profil.hakkinda ?? `${profil.ad} adlı kişinin İz'deki herkese açık izleri`)}</description>
\t\t<language>tr</language>
${ogeler}
\t</channel>
</rss>
`;
	return new Response(xml, {
		headers: {
			'content-type': 'application/rss+xml; charset=utf-8',
			'cache-control': 'public, max-age=900',
			// Sahibi arama motorlarına kapattıysa akış da dizine eklenmesin
			...(profil.aramaMotorlari ? {} : { 'x-robots-tag': 'noindex' })
		}
	});
};
