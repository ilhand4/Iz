import { defineEnvVars } from '@sveltejs/kit/env';

// Ortam değişkenleri: .env dosyasından okunur (örnek: .env.example)
export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'PostgreSQL bağlantı adresi',
		// Eksikse uygulama yine açılır; veritabanı ilk kullanıldığında anlaşılır bir hata verilir
		schema: (deger) => deger || undefined
	},
	TMDB_ANAHTARI: {
		description:
			'TMDB API anahtarı (v3) ya da okuma jetonu (v4). Boşsa film/dizi araması kapalıdır.',
		schema: (deger) => deger?.trim() || undefined
	}
});
