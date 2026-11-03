// Entegrasyon testleri için bellek içi PostgreSQL (PGlite).
// Gerçek migration dosyalarıyla kurulur; ayrı bir veritabanı sunucusu ya da kurulum gerektirmez.
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '../db/schema';

export async function testVeritabani() {
	const istemci = new PGlite();
	const db = drizzle(istemci, { schema });
	await migrate(db, { migrationsFolder: 'drizzle' });
	return db;
}
