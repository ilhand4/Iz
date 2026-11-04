// Veritabanı yedeği: pg_dump ile özel (sıkıştırılmış) biçimde yedekler/ klasörüne yazar,
// en yeni 10 yedeği tutar. Çalıştırma: npm run db:yedek
// Geri yükleme (README'de ayrıntılı): pg_restore --clean --if-exists -d iz_dev yedekler/<dosya>.dump
//
// Bağlantı bilgisi DATABASE_URL'den ayrıştırılıp pg_dump'a ortam değişkenleriyle (PGPASSWORD vb.)
// verilir: şifre komut satırında görünmez ve hiçbir yere yazdırılmaz.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

try {
	process.loadEnvFile('.env');
} catch {
	// .env yoksa ortam değişkenleri kullanılır
}

const KLASOR = 'yedekler';
const TUTULACAK = 10;

const adres = process.env.DATABASE_URL;
if (!adres) throw new Error('DATABASE_URL tanımlı değil (.env.example dosyasına bakın).');
const url = new URL(adres);
const veritabani = decodeURIComponent(url.pathname.slice(1));
if (!veritabani) throw new Error('DATABASE_URL içinde veritabanı adı yok.');

function pgDumpYolu() {
	if (process.env.PG_BIN) return join(process.env.PG_BIN, 'pg_dump');
	const windows = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe';
	if (process.platform === 'win32' && existsSync(windows)) return windows;
	return 'pg_dump';
}

const zaman = new Date()
	.toLocaleString('sv-SE', { timeZone: 'Europe/Istanbul' })
	.replace(' ', '_')
	.replaceAll(':', '-');
mkdirSync(KLASOR, { recursive: true });
const dosya = join(KLASOR, `${veritabani}-${zaman}.dump`);

const ortam = {
	...process.env,
	PGHOST: url.hostname || 'localhost',
	PGPORT: url.port || '5432',
	PGUSER: decodeURIComponent(url.username),
	PGPASSWORD: decodeURIComponent(url.password),
	PGDATABASE: veritabani
};

const cocuk = spawn(pgDumpYolu(), ['--format=custom', '--no-owner', `--file=${dosya}`], {
	env: ortam,
	stdio: ['ignore', 'inherit', 'inherit']
});

cocuk.on('error', (hata) => {
	console.error(
		'pg_dump çalıştırılamadı. PostgreSQL bin klasörünü PG_BIN ortam değişkeniyle belirtebilirsin.',
		hata.message
	);
	process.exit(1);
});

cocuk.on('exit', (kod) => {
	if (kod !== 0) {
		rmSync(dosya, { force: true });
		console.error(`pg_dump başarısız oldu (çıkış kodu ${kod}).`);
		process.exit(kod ?? 1);
	}
	const boyut = (statSync(dosya).size / 1024).toFixed(1);
	console.log(`Yedek alındı: ${dosya} (${boyut} KB)`);

	// Eski yedekleri temizle (yalnızca bu veritabanınınkiler)
	const eskiler = readdirSync(KLASOR)
		.filter((a) => a.startsWith(`${veritabani}-`) && a.endsWith('.dump'))
		.sort()
		.reverse()
		.slice(TUTULACAK);
	for (const a of eskiler) rmSync(join(KLASOR, a));
	if (eskiler.length) console.log(`${eskiler.length} eski yedek silindi.`);
});
