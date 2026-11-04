import { epostayiDogrula } from '#lib/server/epostaJetonu.ts';
import type { PageServerLoad } from './$types';

// Bağlantı açılınca doğrulanır; aynı bağlantı ikinci kez açılırsa "geçersiz" görünür
export const load: PageServerLoad = async ({ url, locals }) => {
	const eposta = await epostayiDogrula(url.searchParams.get('jeton') ?? '');
	return { eposta, girisli: !!locals.kullanici };
};
