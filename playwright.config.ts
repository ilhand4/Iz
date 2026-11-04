// Uçtan uca testler: üretim derlemesi `vite preview` ile ayağa kaldırılır ve gerçek veritabanına
// bağlanır (DATABASE_URL). Her çalıştırma `e2e-…@iz.test` adlı yeni bir hesap açar; bitince siler.
// Yerelde tarayıcı indirmemek için kurulu Microsoft Edge kullanılır; CI'da Playwright Chromium'u.
import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;
const PORT = 4180;
const kanal = CI ? undefined : 'msedge';

export default defineConfig({
	testDir: 'e2e',
	// Testler aynı hesabı sırayla kullanır
	fullyParallel: false,
	workers: 1,
	forbidOnly: CI,
	retries: CI ? 1 : 0,
	reporter: CI ? [['github'], ['list']] : 'list',
	timeout: 30_000,
	expect: { timeout: 10_000 },
	use: {
		baseURL: `http://localhost:${PORT}`,
		locale: 'tr-TR',
		timezoneId: 'Europe/Istanbul',
		trace: 'retain-on-failure'
	},
	globalTeardown: './e2e/temizlik.ts',
	projects: [
		{ name: 'kurulum', testMatch: /kurulum\.setup\.ts/, use: { channel: kanal } },
		{
			name: 'masaustu',
			testMatch: /\.spec\.ts/,
			dependencies: ['kurulum'],
			use: {
				...devices['Desktop Chrome'],
				channel: kanal,
				storageState: 'e2e/.oturum/kullanici.json'
			}
		},
		{
			name: 'mobil',
			testMatch: /erisilebilirlik\.spec\.ts/,
			dependencies: ['kurulum'],
			use: {
				...devices['Pixel 7'],
				channel: kanal,
				storageState: 'e2e/.oturum/kullanici.json'
			}
		}
	],
	webServer: {
		command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !CI,
		timeout: 240_000
	}
});
