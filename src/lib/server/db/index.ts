import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '$app/env/private';
import * as schema from './schema';

function baglantiAdresi(): string {
	if (!DATABASE_URL) {
		throw new Error(
			'DATABASE_URL tanımlı değil. .env.example dosyasını .env olarak kopyalayıp bağlantı bilgisini yazın.'
		);
	}
	return DATABASE_URL;
}

const istemci = postgres(baglantiAdresi(), { max: 10 });

export const db = drizzle(istemci, { schema });
export { schema };
