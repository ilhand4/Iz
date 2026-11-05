// Erişilebilirlik: axe-core ile ciddi ve kritik ihlal olmamalı (açık ve koyu temada, masaüstü ve mobilde).
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const SAYFALAR = [
	'/pano',
	'/dugumler',
	'/dugumler/yeni',
	'/izler',
	'/basla',
	'/cop-kutusu',
	'/ara',
	'/ayarlar',
	'/sifremi-unuttum',
	'/gruplar',
	'/bildirimler',
	'/donemler',
	'/izler/hat',
	'/dugumler/ag',
	'/dugumler/zaman',
	'/ice-aktar',
	'/bag-avi',
	'/yillik'
];

for (const tema of ['light', 'dark'] as const) {
	test.describe(`${tema === 'light' ? 'açık' : 'koyu'} tema`, () => {
		test.use({ colorScheme: tema });

		for (const yol of SAYFALAR) {
			test(`${yol} sayfasında ciddi ihlal yok`, async ({ page }) => {
				await page.goto(yol);
				await expect(page.locator('main')).toBeVisible();
				const sonuc = await new AxeBuilder({ page }).analyze();
				const ciddi = sonuc.violations.filter(
					(v) => v.impact === 'critical' || v.impact === 'serious'
				);
				expect(
					ciddi.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
				).toEqual([]);
			});
		}
	});
}
