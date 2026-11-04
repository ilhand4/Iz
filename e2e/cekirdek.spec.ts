// Çekirdek deneyim: ilk iz sihirbazı, hızlı ekle, eser durumu, çöp kutusu ve "Geri al", ağ konumları.
// Testler aynı hesap üzerinde sırayla çalışır; her biri bir öncekinin bıraktığı haritaya dayanır.
import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('ilk iz sihirbazı üç duraklı bir iz kurar', async ({ page }) => {
	await page.goto('/basla');
	await page.locator('label.cip', { hasText: 'Film' }).first().click();
	await page.locator('input[name="eserBaslik"]').fill('Babylon Berlin');
	await page.locator('input[name="getirenBaslik"]').fill('Deniz');
	await page.locator('input[name="getirenNot"]').fill('izle dedi');
	await page.locator('input[name="gidenBaslik"]').fill('Berlin Alexanderplatz');
	await page.locator('input[name="izBaslik"]').fill('Berlin izi');
	await page.getByRole('button', { name: /İzimi oluştur/ }).click();

	await expect(page).toHaveURL(/\/izler\/[0-9a-f-]{36}\?ilk=1/);
	await expect(page.getByRole('heading', { name: 'İlk izin hazır.' })).toBeVisible();
	await expect(page.getByRole('heading', { level: 1, name: 'Berlin izi' })).toBeVisible();
	for (const durak of ['Deniz', 'Babylon Berlin', 'Berlin Alexanderplatz']) {
		await expect(page.getByRole('link', { name: durak, exact: true }).first()).toBeVisible();
	}
});

test('hızlı ekle tek satırdan düğüm ve getireni kaydeder', async ({ page }) => {
	await page.goto('/pano');
	await page.getByRole('textbox', { name: 'Hızlı ekle' }).fill('Deniz önerdi → Aylak Adam');
	await page.getByRole('button', { name: 'Ekle', exact: true }).click();

	await expect(page).toHaveURL(/\/hizli\?/);
	// Dış kaynak adayları gelse de gelmese de elle "yeni" seçilebilir
	await page.locator('input[name="ana"][value="yeni"]').check();
	await page.locator('input[name="baslik"]').fill('Aylak Adam');
	// "Deniz" haritada birebir var: varsayılan olarak o seçilmiş olmalı
	await expect(page.locator('input[name="getiren"][value^="mevcut:"]').first()).toBeChecked();
	await page.getByRole('button', { name: 'Ekle', exact: true }).click();

	await expect(page).toHaveURL(/\/dugumler\/[0-9a-f-]{36}\?eklendi=1/);
	await expect(page.getByRole('heading', { level: 1, name: 'Aylak Adam' })).toBeVisible();
	// "önerdi" fiili: merak listesine girer
	await expect(page.getByRole('button', { name: 'Merak ediyorum' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	const getirenler = page.locator('section[aria-labelledby="gelen-baslik"]');
	await expect(getirenler.getByRole('link', { name: 'Deniz' })).toBeVisible();
});

test('eser durumu tek tıkla değişir ve bildirim çıkar', async ({ page }) => {
	await page.goto('/dugumler?durum=merak');
	await page.getByRole('link', { name: /Aylak Adam/ }).click();
	await page.getByRole('button', { name: 'Okudum' }).click();
	await expect(page.getByRole('status').filter({ hasText: /Durum: Okudum/ })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Okudum' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);

	await page.goto('/dugumler?durum=merak');
	await expect(page.getByRole('heading', { name: 'Merak listen boş' })).toBeVisible();
});

test('çöp kutusuna atılan düğüm "Geri al" ile döner', async ({ page }) => {
	await page.goto('/dugumler');
	await page.getByRole('link', { name: /Aylak Adam/ }).click();
	await page.getByRole('link', { name: 'Düzenle' }).click();
	await page.getByRole('button', { name: 'Çöp kutusuna at' }).click();

	await expect(page).toHaveURL(/\/dugumler$/);
	const baloncuk = page.getByRole('status').filter({ hasText: 'çöp kutusuna taşındı' });
	await expect(baloncuk).toBeVisible();
	await expect(page.getByRole('link', { name: /Aylak Adam/ })).toHaveCount(0);

	await baloncuk.getByRole('button', { name: 'Geri al' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Geri alındı.' })).toBeVisible();
	await expect(page.getByRole('link', { name: /Aylak Adam/ })).toBeVisible();
});

test('çöp kutusu sayfası geri yükler', async ({ page }) => {
	await page.goto('/dugumler');
	await page.getByRole('link', { name: /Berlin Alexanderplatz/ }).click();
	await page.getByRole('link', { name: 'Düzenle' }).click();
	await page.getByRole('button', { name: 'Çöp kutusuna at' }).click();
	await expect(page).toHaveURL(/\/dugumler$/);

	await page.goto('/cop-kutusu');
	await expect(page.locator('li', { hasText: 'Berlin Alexanderplatz' })).toBeVisible();
	await expect(page.getByText('30 gün sonra kalıcı olarak silinecek')).toBeVisible();
	await page.getByRole('button', { name: /Geri yükle: Berlin Alexanderplatz/ }).click();
	await expect(page.getByRole('status').filter({ hasText: 'geri yüklendi' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Çöp kutusu boş' })).toBeVisible();
});

test('bağ kaldırma geri alınabilir', async ({ page }) => {
	await page.goto('/dugumler');
	await page.getByRole('link', { name: /Babylon Berlin/ }).click();
	const getirenler = page.locator('section[aria-labelledby="gelen-baslik"]');
	await expect(getirenler.getByRole('link', { name: 'Deniz' })).toBeVisible();
	await getirenler.getByRole('button', { name: /Deniz” bağını kaldır/ }).click();
	const baloncuk = page.getByRole('status').filter({ hasText: 'Bağ kaldırıldı.' });
	await expect(baloncuk).toBeVisible();
	await expect(getirenler.getByRole('link', { name: 'Deniz' })).toHaveCount(0);
	await baloncuk.getByRole('button', { name: 'Geri al' }).click();
	await expect(getirenler.getByRole('link', { name: 'Deniz' })).toBeVisible();
});

test('ağ ilk açılışta yerleşimi kaydeder', async ({ page }) => {
	const kayit = page.waitForRequest(
		(r) => r.url().endsWith('/api/ag/konumlar') && r.method() === 'PUT'
	);
	await page.goto('/dugumler/ag');
	const istek = await kayit;
	const govde = istek.postDataJSON() as { konumlar: { id: string }[] };
	expect(govde.konumlar.length).toBeGreaterThanOrEqual(4);
	expect((await istek.response())?.status()).toBe(200);
	await expect(page.getByRole('application', { name: /Bağlantı ağı/ })).toBeVisible();
});

test('pano haritanın karakterlerini ve merak listesini gösterir', async ({ page }) => {
	await page.goto('/pano');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Merhaba');
	await expect(page.getByRole('search', { name: 'Hızlı ekle' })).toBeVisible();
	// 4 düğüm, 3 bağ: karakterler bölümü açılır
	await expect(page.getByRole('heading', { name: 'Haritanın karakterleri' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Kökler' })).toBeVisible();
});

test('ayarlar: profil kaydedilir, profil sayfası yalnızca açık içeriği gösterir', async ({
	page
}) => {
	await page.goto('/ayarlar');
	await page.getByLabel('Kısa tanıtım').fill('Kitaplardan şehirlere giden yollar.');
	await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Profilin kaydedildi.' })).toBeVisible();
	await expect(page.getByText('Bu cihaz')).toBeVisible();

	await page.locator('#profil a[href^="/@"]').click();
	await expect(page).toHaveURL(/\/@e2e_/);
	await expect(page.getByText('Kitaplardan şehirlere giden yollar.')).toBeVisible();
	// Testlerde eklenen her şey özel: profil boş görünmeli
	await expect(page.getByRole('heading', { name: 'Henüz herkese açık bir şey yok' })).toBeVisible();
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});

test('veriler JSON olarak indirilir', async ({ page }) => {
	await page.goto('/ayarlar#veriler');
	const indirme = page.waitForEvent('download');
	await page.getByRole('link', { name: /JSON olarak indir/ }).click();
	const dosya = await indirme;
	expect(dosya.suggestedFilename()).toMatch(/^iz-e2e_.+\.json$/);
});
