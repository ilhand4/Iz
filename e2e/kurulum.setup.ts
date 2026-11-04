// Her çalıştırmada yeni bir deneme hesabı açar ve oturumunu diğer testler için saklar.
// (Kayıt hız sınırı IP başına saatte 10; tek kayıt bu sınırın çok altında kalır.)
import { expect, test as kurulum } from '@playwright/test';

kurulum('deneme hesabı aç', async ({ page }) => {
	const ek = Math.random().toString(36).slice(2, 10);
	await page.goto('/kayit');
	await page.locator('input[name="ad"]').fill('Uçtan Uca');
	await page.locator('input[name="kullaniciAdi"]').fill(`e2e_${ek}`);
	await page.locator('input[name="eposta"]').fill(`e2e-${ek}@iz.test`);
	// Bu hesap yalnızca bu çalıştırma için açılır ve sonunda silinir
	await page.locator('input[name="sifre"]').fill(`e2e-deneme-${ek}`);
	await page.locator('input[name="sifreTekrar"]').fill(`e2e-deneme-${ek}`);
	await page.getByRole('button', { name: 'Hesap aç' }).click();

	// Kayıttan sonra ilk iz sihirbazına gelinir
	await expect(page).toHaveURL(/\/basla\?hosgeldin=1/);
	await page.context().storageState({ path: 'e2e/.oturum/kullanici.json' });
});
