import { fail } from '@sveltejs/kit';
import { alan, epostaHatasi } from '#lib/server/dogrulama.ts';
import { sifirlamaGonder } from '#lib/server/epostaJetonu.ts';
import { beklemeMesaji, sifirlamaEpostaSiniri, sifirlamaSiniri } from '#lib/server/hizSiniri.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, url, getClientAddress }) => {
		const eposta = alan(await request.formData(), 'eposta').toLowerCase();
		const hata = epostaHatasi(eposta);
		if (hata) return fail(400, { hata, eposta });

		const sinir = sifirlamaSiniri.dene(getClientAddress());
		if (!sinir.izin) return fail(429, { hata: beklemeMesaji(sinir.beklemeSaniye), eposta });
		// Adres başına sınır aşılsa da yanıt aynı: hangi adresin kayıtlı olduğu anlaşılmasın
		if (sifirlamaEpostaSiniri.dene(eposta).izin) await sifirlamaGonder(eposta, url.origin);
		return { gonderildi: true, eposta };
	}
};
