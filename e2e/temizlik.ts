// Uçtan uca testlerin açtığı hesapları (ve bağlı tüm verilerini) siler.
// Bağlantı bilgisi DATABASE_URL'den okunur (yerelde .env, CI'da iş akışı ortamı); hiçbir yere yazdırılmaz.
import { existsSync } from 'node:fs';
import postgres from 'postgres';

export default async function temizlik() {
	if (!process.env.DATABASE_URL && existsSync('.env')) process.loadEnvFile('.env');
	const adres = process.env.DATABASE_URL;
	if (!adres) return;
	const sql = postgres(adres, { max: 1, onnotice: () => {} });
	try {
		// Düğümler, bağlar, izler ve oturumlar kullanıcıya "on delete cascade" ile bağlı
		await sql`delete from kullanicilar where eposta like 'e2e-%@iz.test'`;
	} finally {
		await sql.end();
	}
}
