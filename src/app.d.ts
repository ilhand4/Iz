// Uygulama genelindeki tipler: https://svelte.dev/docs/kit/types#app.d.ts
import type { OturumKullanicisi } from '#lib/server/oturum.ts';

declare global {
	namespace App {
		interface Locals {
			kullanici: OturumKullanicisi | null;
			oturumId: string | null;
			dil: import('#lib/dil.ts').Dil;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
