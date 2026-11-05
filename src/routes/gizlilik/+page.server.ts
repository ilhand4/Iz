import { ILETISIM_EPOSTA, VERI_SORUMLUSU } from '$app/env/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	sorumlu: VERI_SORUMLUSU ?? null,
	eposta: ILETISIM_EPOSTA ?? null,
	indekslenebilir: true
});
