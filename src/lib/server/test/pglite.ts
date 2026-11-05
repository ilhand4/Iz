// Entegrasyon testleri için bellek içi PostgreSQL (PGlite).
// Gerçek migration dosyalarıyla kurulur; ayrı bir veritabanı sunucusu ya da kurulum gerektirmez.
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { postgis } from '@electric-sql/pglite-postgis';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '../db/schema';

export async function testVeritabani() {
	const istemci = new PGlite({ extensions: { pg_trgm, postgis } });
	const db = drizzle(istemci, { schema });
	await migrate(db, { migrationsFolder: 'drizzle' });
	return db;
}
