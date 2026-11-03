import { defineConfig } from 'drizzle-kit';

// drizzle-kit .env dosyasını kendisi okumaz; Node'un yerleşik yükleyicisini kullanıyoruz
try {
	process.loadEnvFile('.env');
} catch {
	// .env yoksa ortam değişkenleri doğrudan kullanılır
}

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL tanımlı değil (.env.example dosyasına bakın).');
}

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL },
	strict: true,
	verbose: true
});
