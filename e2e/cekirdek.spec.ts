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
	await expect(page.getByText('Bu cihaz', { exact: true })).toBeVisible();

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

test('herkese açık iz başka sitelere gömülebilir, özel iz gömülemez', async ({ page }) => {
	await page.goto('/izler');
	await page.getByRole('link', { name: /Berlin izi/ }).click();
	await expect(page).toHaveURL(/\/izler\/[0-9a-f-]{36}/);
	const izAdresi = page.url().split('?')[0];

	// Özel izin gömme sayfası yok
	const ozel = await page.request.get(`${izAdresi}/gom`);
	expect(ozel.status()).toBe(404);

	await page.goto(`${izAdresi}/duzenle`);
	await page.locator('input[name="gizlilik"][value="herkes"]').check({ force: true });
	await page.getByRole('button', { name: 'Bilgileri kaydet' }).click();
	await expect(
		page.getByRole('status').filter({ hasText: 'İz bilgileri kaydedildi.' })
	).toBeVisible();

	const yanit = await page.request.get(`${izAdresi}/gom`);
	expect(yanit.status()).toBe(200);
	expect(yanit.headers()['content-security-policy']).toContain('frame-ancestors *');
	expect(yanit.headers()['x-frame-options']).toBeUndefined();
	// Diğer sayfalar çerçevelenemez
	const normal = await page.request.get(izAdresi);
	expect(normal.headers()['x-frame-options']).toBe('DENY');

	await page.goto(izAdresi);
	await page.getByText('Sitene göm').click();
	await expect(page.getByLabel('Gömme kodu')).toHaveValue(/<iframe src=".+\/gom"/);

	await page.goto(`${izAdresi}/gom`);
	await expect(page.getByRole('heading', { level: 1, name: 'Berlin izi' })).toBeVisible();
	await expect(page.getByRole('banner')).toHaveCount(0);
	// Düğümler özel: gömülü izde başlıkları görünmez
	await expect(page.getByText('Gizli durak')).toHaveCount(3);
});

test('profil RSS akışı yalnızca açık izleri içerir', async ({ page }) => {
	await page.goto('/ayarlar');
	const profil = await page.locator('#profil a[href^="/@"]').getAttribute('href');
	const yanit = await page.request.get(`${profil}/rss.xml`);
	expect(yanit.headers()['content-type']).toContain('application/rss+xml');
	const xml = await yanit.text();
	expect(xml).toContain('<title>Berlin izi</title>');
	expect(xml).not.toContain('Babylon Berlin');
});

test('arama yazım hatasına dayanıklı', async ({ page }) => {
	await page.goto('/dugumler?q=babilon');
	await expect(page.getByRole('link', { name: /Babylon Berlin/ })).toBeVisible();
	await page.goto('/izler?q=berln');
	await expect(page.getByRole('link', { name: /Berlin izi/ })).toBeVisible();
});

test('şifremi unuttum: kayıtlı olsun olmasın aynı yanıt', async ({ browser }) => {
	// Oturumsuz bir bağlam
	const baglam = await browser.newContext({ storageState: { cookies: [], origins: [] } });
	const page = await baglam.newPage();
	await page.goto('/giris');
	await page.getByRole('link', { name: 'Şifremi unuttum' }).click();
	await expect(page.getByRole('heading', { name: 'Şifreni mi unuttun?' })).toBeVisible();
	await page.getByLabel('E-posta').fill('olmayan-hesap@iz.test');
	await expect(page.getByLabel('E-posta')).toHaveValue('olmayan-hesap@iz.test');
	await page.getByRole('button', { name: 'Bağlantı gönder' }).click();
	await expect(page.getByRole('status')).toContainText('kayıtlı bir hesap varsa');

	await page.goto('/sifre-sifirla?jeton=uydurma');
	await expect(page.getByRole('heading', { name: 'Bağlantı geçersiz' })).toBeVisible();
	await baglam.close();
});

test('herkese açık izin paylaşım görseli PNG olarak üretilir', async ({ page }) => {
	await page.goto('/izler');
	await page.getByRole('link', { name: /Berlin izi/ }).click();
	await expect(page).toHaveURL(/\/izler\/[0-9a-f-]{36}/);
	const izAdresi = page.url().split('?')[0];
	await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\.png$/);
	const png = await page.request.get(`${izAdresi}/og.png`);
	expect(png.status()).toBe(200);
	expect(png.headers()['content-type']).toBe('image/png');
	expect((await png.body()).length).toBeGreaterThan(5000);
});

test('geçiş anahtarı eklenir ve şifresiz giriş yapılır', async ({ page }) => {
	// Chromium/Edge sanal doğrulayıcısı (gerçek cihaz gerekmez)
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('WebAuthn.enable');
	await cdp.send('WebAuthn.addVirtualAuthenticator', {
		options: {
			protocol: 'ctap2',
			transport: 'internal',
			hasResidentKey: true,
			hasUserVerification: true,
			isUserVerified: true,
			automaticPresenceSimulation: true
		}
	});

	await page.goto('/ayarlar#gecis');
	await page.getByRole('button', { name: 'Bu cihaza geçiş anahtarı ekle' }).click();
	await expect(
		page.getByRole('status').filter({ hasText: 'Geçiş anahtarı eklendi' })
	).toBeVisible();
	await expect(page.locator('#gecis li')).toHaveCount(1);

	// Çıkış yap, aynı sayfada (aynı doğrulayıcıyla) geçiş anahtarıyla gir
	await page.getByRole('button', { name: 'Çıkış yap' }).click();
	await page.goto('/giris');
	await page.getByRole('button', { name: 'Geçiş anahtarıyla giriş yap' }).click();
	await expect(page).toHaveURL(/\/pano/);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Merhaba');

	// Kaydedilen oturum çerezi çıkışla geçersizleşti; sonraki testler için yenisini sakla
	await page.context().storageState({ path: 'e2e/.oturum/kullanici.json' });
});

test('komut paleti Ctrl+K ile açılır ve düğüme götürür', async ({ page }) => {
	await page.goto('/pano');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Merhaba');
	await page.keyboard.press('Control+k');
	const palet = page.getByRole('dialog', { name: 'Komut paleti' });
	await expect(palet).toBeVisible();
	await palet.getByRole('combobox').fill('babilon');
	await expect(palet.getByRole('option', { name: /Babylon Berlin/ })).toBeVisible();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/dugumler\/[0-9a-f-]{36}$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Babylon Berlin' })).toBeVisible();
});

test('ağ görünümü adrese yazılır ve bağ türü lejantı süzer', async ({ page }) => {
	await page.goto('/dugumler/ag?gizli=kisi');
	await expect(page.getByRole('application', { name: /Bağlantı ağı/ })).toBeVisible();
	await expect(page.getByRole('button', { name: /Kişiler/ })).toHaveAttribute(
		'aria-pressed',
		'false'
	);
	await expect(page.getByRole('button', { name: 'Bağ kur' })).toBeVisible();
	// Deneme haritasında tek yıl var: zaman sürgüsü (gerekmediği için) gösterilmez
	await expect(page.locator('#zaman-surgusu')).toHaveCount(0);
	await expect(page).toHaveURL(/gizli=kisi/);
});

test('Goodreads dosyası içe aktarılır, bağ avı soru sorar', async ({ page }) => {
	await page.goto('/ice-aktar');
	await page.getByLabel(/Goodreads/).check();
	const csv = [
		'Book Id,Title,Author,Original Publication Year,Date Read,Exclusive Shelf',
		'1,Kürk Mantolu Madonna,Sabahattin Ali,1943,2019/08/01,read',
		'2,İçimizdeki Şeytan,Sabahattin Ali,1940,2019/09/01,read'
	].join('\n');
	await page.locator('#dosya').setInputFiles({
		name: 'goodreads_library_export.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(csv, 'utf8')
	});
	await page.getByRole('button', { name: 'Getir' }).click();
	await expect(page).toHaveURL(/\/bag-avi\?eklenen=2/);
	await expect(page.getByRole('status')).toContainText('2 yeni eser');
	await expect(page.getByRole('heading', { name: /düğümünden mi geldin\?/ })).toBeVisible();
	await page.getByRole('button', { name: 'Evet, oradan geldim' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Bağ kuruldu.' })).toBeVisible();
});

test('İz Yıllığı yılın özetini gösterir', async ({ page }) => {
	await page.goto('/yillik/2019');
	await expect(page.getByRole('heading', { level: 1, name: '2019' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Seni en çok yere götüren' })).toBeVisible();
	const kart = await page.request.get('/yillik/2019/kart.png');
	expect(kart.headers()['content-type']).toBe('image/png');
});
