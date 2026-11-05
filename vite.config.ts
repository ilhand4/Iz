import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

// Dış görsellere izin verilen kaynaklar (eser kapakları).
// Open Library kapakları archive.org'a yönlendirir.
const gorselKaynaklari = [
	'https://covers.openlibrary.org',
	'https://archive.org',
	'https://*.archive.org',
	'https://image.tmdb.org'
] as const;

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Proje genelinde runes modu (kütüphaneler hariç)
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			// İçerik güvenlik politikası: satır içi betik yok, dış kaynaklar kısıtlı
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:', ...gorselKaynaklari],
					'font-src': ['self'],
					// Sesli anı kaydının gönderilmeden önce dinlenmesi (MediaRecorder → blob:)
					'media-src': ['self', 'blob:'],
					// Harita karoları, stil, yazı tipleri ve simgeler (OpenFreeMap)
					'connect-src': ['self', 'https://tiles.openfreemap.org'],
					'form-action': ['self'],
					'frame-ancestors': ['none'],
					'base-uri': ['self'],
					'object-src': ['none']
				}
			}
		})
	],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
