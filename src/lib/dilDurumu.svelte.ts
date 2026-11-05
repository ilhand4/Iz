// Bileşenlerde dil: `const t = $derived(ceviri.t)` sonra `{t('menu.pano')}`. Dil, kök düzenin verisinden
// (hooks → locals.dil) gelir; sayfa değişince kendiliğinden güncellenir.
import { page } from '$app/state';
import { cevirmen, type Dil } from './dil';

export const ceviri = {
	get dil(): Dil {
		return (page.data as { dil?: Dil }).dil ?? 'tr';
	},
	get t() {
		return cevirmen(this.dil);
	}
};
