# CLAUDE.md — İz projesi çalışma notları

## Kullanıcı ve çalışma şekli

- Kullanıcı Türkçe konuşur. **Yanıtlar, arayüz metinleri, kod yorumları ve commit mesajları Türkçe.**
- Windows 11; PostgreSQL 18 yerelde kurulu (pgAdmin 4 ile yönetiyor). **Docker kullanılmıyor.** Node.js 26 LTS (`winget` ile kuruldu).
- Daha önce ASP.NET Core ile kişisel site yaptı (ayrı depo); bu projede bilerek farklı bir yığın seçti.
- Tempo: her aşamada maddelerin hepsini bitir → `npm run check`, `npm test`, `npm run build` → tarayıcıda dene (açık/koyu tema, masaüstü/mobil ekran görüntüsü) → ROADMAP.md'yi güncelle → Türkçe commit → `git push origin main` (kullanıcı 5 Kasım 2026'da push'u bana bıraktı; GitHub Desktop'un kimlik bilgileri kullanılıyor) → GitHub Actions sonucunu kontrol et → kısa Türkçe özet.
- Kullanıcı Aşama 2'den itibaren işi **"profesyonel bir site tasarımcısı gözüyle"** yapmamı istedi: yalnızca özelliği değil görsel tutarlılığı, boş durumları, mobil kullanımı ve erişilebilirliği de bitmiş say.
- Yalnızca gerçekten kullanıcının vermesi gereken kararlarda soru sor; diğerlerinde makul varsayılanı seç ve buraya not et.
- **Sıradaki iş:** Aşama 8 (PWA, İngilizce arayüz, yayına alma). Aşama 1–7 bitti. Açık kalan kullanıcı kararı: **e-posta servisi seçimi** (seçilene kadar iletiler geliştirmede terminale yazılır, üretimde gönderilmez). Üretim `.env`'ine `BODY_SIZE_LIMIT=30M` eklenmeli (kullanıcı yazar; sesli yanıtlar 25 MB'a kadar). Aşama 3'e kaynaklık eden dış değerlendirmedeki örnek kodlar olduğu gibi kullanılmaz; mevcut şemaya (uuid, `herkes`) ek sütun/tablo olarak uyarlanır.
- Veritabanı şifresi ve TMDB anahtarı `.env` dosyasında; kullanıcı kendisi yazdı. Bunları okuma/yazdırma.

## Ürün

"İz — hayatının bağlantılı haritası". Düğüm (eser/kişi/yer/karar/anı) + Bağ (yönlü, "bu beni şuna götürdü" notlu) + İz (sıralı, anlatılabilir yol). Her düğümde tarih (gün/ay/yıl hassasiyetli) ve isteğe bağlı konum. Gizlilik her düğüm ve izde ayrı: `ozel` / `grup` / `herkes`. Aynı veri üç görünümde: Liste + **Ağ** + **Zaman çizgisi** (Harita Aşama 5'te). Aşamalar ve modüller: [ROADMAP.md](ROADMAP.md).

## Yığın

- **SvelteKit 3** + **Svelte 5** (runes) + **TypeScript 6**, **Vite 8**, `@sveltejs/adapter-node`
- **PostgreSQL 18** + **Drizzle ORM 0.45** (`postgres` sürücüsü v4), migration'lar `drizzle/` altında
- **Cytoscape.js 3.34** + `cytoscape-fcose` (ağ görünümü; yalnızca ağ sayfasında dinamik içe aktarmayla yüklenir)
- **@node-rs/argon2** (Argon2id), **Vitest 5**, **@electric-sql/pglite** (entegrasyon testleri)
- Yazı tipleri `@fontsource-variable/inter` ve `@fontsource-variable/fraunces` (npm; CDN yok)
- **MapLibre GL 6.15** (harita; karolar OpenFreeMap), **PostGIS 3.6** (yerelde Stack Builder ile kurulu), **sharp 0.35** (fotoğraf işleme), pg_trgm
- **whisper.cpp b5454** (yerel ses → yazı; `~/.iz/araclar/`, model `ggml-large-v3-turbo-q5_0.bin`) + **ffmpeg 9** (winget). Claude API kullanılmıyor (kullanıcı kararı).
- Tüm sürümler `package.json`'da **tam sürümle sabit** (`npm install -E`).

## SvelteKit 3 / Svelte 5'e özgü notlar (önceki sürümlerden farklı!)

- Yapılandırma `svelte.config.js`'de değil, **`vite.config.ts` içinde `sveltekit({ ... })`** seçenekleri olarak (adapter, csp vb.).
- `$lib` yerine **`#lib`** (package.json `imports`). TS dosyalarını **uzantısıyla** içe aktar: `import { x } from '#lib/server/dugumler.ts'`. Klasör: `'#lib/server/db/index.ts'`. `.svelte` ve `.css` de uzantılı.
- Ortam değişkenleri **`src/env.ts`**'de `defineEnvVars` ile tanımlanır, **`$app/env/private`**'tan okunur. `dev`/`browser` → `$app/env`.
- `Handle` tipi **`@sveltejs/kit/hooks`**'tan gelir (`@sveltejs/kit`'ten değil).
- Kit'in kendi CSRF denetimi yalnızca üretimde ve yalnızca form içerik türlerinde çalışır; bu yüzden `hooks.server.ts`'de kendi Origin denetimimiz var.
- **Köken (origin):** Kit 3'te `paths.origin` derleme zamanı ayarıdır; `adapter-node` 6 artık `ORIGIN` ortam değişkenini okumaz ve vekil başlığı yoksa protokolü **`https`** varsayar. Bu yüzden `npm start` (`node build`) HTTPS arkasında yayın içindir; yerelde http ile form gönderimi CSRF'e takılır. Yerelde üretim derlemesini denemek için **`npm run preview`** kullan.
- `json()`/`text()` kullanımdan kalktı → `Response.json()` / `new Response()`.
- **Svelte 5 etiket içindeki baştaki/sondaki boşlukları siler:** `<span>, </span>` → `,`. Boşluk gerekiyorsa ifade kullan: `{', '}`.
- Yazılabilir `$derived` (Svelte ≥ 5.25): `let x = $derived(data.y); x = yeniDeger;` — sunucudan gelen listeyi yerelde değiştirip (sürükle-bırak) kaydedince yeniden yüklemek için kullanılıyor.
- **Geliştirme sunucusu tuhaflığı:** Bir dosya kaydedildiği anda gelen ilk SSR isteği bazen `Cannot read properties of null (reading 'function')` ile 500 verir (Vite'ın sunucu tarafı yeniden yüklemesiyle yarış). Sayfayı yenilemek yeter; üretim derlemesini etkilemez.

## Mimari

- `src/lib/server/` yalnızca sunucu kodu (Kit bunu istemciye sızdırmaz). Saf (veritabanına bağlı olmayan) mantık ayrı dosyalarda tutulur ki birim testlenebilsin: `dogrulama.ts`, `yetki.ts`, `hizSiniri.ts`, `eserArama.ts` dönüştürücüleri, `../tarih.ts`, `../metin.ts`, `../zaman.ts`.
- Veri erişimi: düğüm/bağ `dugumler.ts`, izler `izler.ts`. **Her yazma sorgusu `sahip_id` ile süzülür**; okuma `gorunurluk()` SQL koşuluyla (saf karşılığı `yetki.ts → gorebilirMi`). `db.execute` sonucu için `satirlar()` (postgres.js dizi, PGlite `{ rows }` döner).
- Sayfalar form eylemleriyle (form actions) çalışır, `use:enhance` ile ilerleyici iyileştirme; JavaScript kapalıyken de işler (eser alanlarını göster/gizle `:has()` ile CSS'te; durak sıralamada ok düğmeleri birer form; aranabilir seçici JS yoksa `<select>`).
- Tema: çerez `tema=acik|koyu`, yoksa sistem. `hooks.server.ts` `%iz.tema%` yer tutucusunu `<html data-theme>` ile değiştirir. Renkler `light-dark()` ile tek yerde. Cytoscape gerçek renk istediği için `AgGorunumu` renkleri gizli bir öğeye `color: var(--…)` uygulayıp okur; tema değişince (MutationObserver + `prefers-color-scheme`) yeniden boyar.
- Tasarım belirteçleri `src/lib/stiller/tasarim.css`: Türkçe adlı CSS değişkenleri (`--zemin`, `--yuzey`, `--metin`, `--vurgu`, `--tur-eser`…), aralık ölçeği `--a-1…--a-8`, `--ust-yukseklik`, ortak sınıflar `.kap`, `.kart`, `.dugme`, `.rozet`, `.alan`, `.bildirim`.
- Ortak bileşenler (`src/lib/bilesenler/`): `SayfaBasligi` (üst etiket + başlık + açıklama + eylemler), `GorunumSecici` (Liste/Ağ/Zaman/Harita), `BosDurum`, `TurSekli`/`TurRozeti`, `DugumSecici` (ARIA combobox), `GizlilikSecici`, `DugumFormu`, `IzFormu`, `IzKarti`, `BagOgesi`, `AgGorunumu`.
- **Tür görsel dili:** her türün rengi **ve şekli** var (renk körlüğü için): eser yuvarlak kare, kişi daire, yer üçgen, karar eşkenar dörtgen, anı beşgen. SVG şekiller `TurSekli.svelte`'de, Cytoscape karşılıkları `AgGorunumu.svelte → CYTOSCAPE_SEKLI`'de; ikisi birlikte değişmeli.

## Alınan kararlar (varsayılanlar)

- **Adlandırma:** Alan adları ve tanımlayıcılar Türkçe ama ASCII (`dugum`, `baglar`, `kullaniciAdi`). Tablolar Türkçe (`kullanicilar`, `dugumler`…). npm betik adları alışılmış İngilizce (`db:migrate`, `db:seed`).
- **Gizlilik varsayılanı `ozel`.** `grup` düzeyi, gruplar gelene kadar (Aşama 3) yalnızca sahibine açık.
- **Görünmeyen düğüm/iz = 404** (403 değil): başkasının özel içeriğinin varlığı belli olmasın. Geçersiz UUID de 404.
- **Bağlar yalnızca kişinin kendi düğümleri arasında** kurulur. Bağ, iki ucu da izleyene görünürse görünür. Düğüm sayfasından iki yönde kurulur (`yon=giden|gelen`, alan adı `digerId`).
- **İzler:** duraklar yalnızca sahibin kendi düğümlerinden; bir düğüm aynı izde bir kez (tekil kısıt). Herkese açık izde, izleyenin göremediği düğümler **"gizli durak"** olarak döner (başlık ve not gönderilmez); sahibine kaç durağın görünmeyeceği uyarısı gösterilir. Sıralama: `(iz_id, sira)` tekil olduğu için önce tüm sıralar +1.000.000 kaydırılır, sonra 1'den yazılır; iz satırı `FOR UPDATE` ile kilitlenir. Durak çıkarılınca sıra yeniden numaralanır. Duraklar arasındaki "nasıl götürdü" metni, ardışık düğümler arasındaki bağın notundan gelir (ayrı alan yok).
- **Ağ görünümü: Cytoscape.js** (Sigma.js değil): kişisel haritalar yüzlerce düğüm düzeyinde; Cytoscape şekil/ok/etiket biçemi ve yerleşimleri hazır sunuyor. Binlerce düğüme çıkılırsa Sigma.js/WebGL yeniden değerlendirilir. Yerleşim fcose (her açılışta yeniden hesaplanır). Dar ekranda sığdırınca yakınlık 0,6'nın altına düşerse 0,6'da ortalanır. Odaklanınca düğüm komşularıyla birlikte panelin örtmediği alana sığdırılır.
- **Zaman çizgisi:** yalnızca yılı bilinenler "Yıl içinde", ayı bilinenler ilgili ay başında; aynı tarihte belirsiz olan önce gelir. Yoğunluk şeridi 120 yıldan geniş aralıkta yalnızca dolu yılları gösterir.
- **Oturum:** 32 bayt rastgele jeton çerezde; veritabanında SHA-256 özeti. 30 gün; son 15 güne girince kendiliğinden uzar. Çerez `HttpOnly`, `SameSite=Lax`, üretimde `Secure`. Çıkış yalnızca POST.
- **Şifre:** en az 10, en çok 200 karakter; Argon2id (19 MiB, 2 tur). Kırpılmaz. Olmayan kullanıcıyla girişte de sahte doğrulama yapılır (zamanlama eşitleme).
- **Kullanıcı adı:** `[a-z0-9_.]{3,30}`, Türkçe karakter yok (adres/etiket olarak kullanılacak). Görünen ad serbest. E-posta ve kullanıcı adı **Türkçe olmayan** küçültmeyle (`toLowerCase()`; "I" → "i"). Arama ise Türkçe kurallarıyla ve aksansız (`metin.ts → sadelestir`).
- **Kayıtta** "bu e-posta zaten kayıtlı" denir (kullanılabilirlik ↔ hesap sayımı ödünleşimi; hız sınırı var).
- **Hız sınırı kalıcı** (`sinirlar.ts → KaliciHizSiniri`, UNLOGGED `hiz_kayitlari`, `pg_advisory_xact_lock`; Redis gerekmez): giriş IP+e-posta başına 15 dk'da 5, IP başına 15 dk'da 30; kayıt IP başına saatte 10. `hizSiniri.ts` yalnızca bellek içi sınıf + `beklemeMesaji`.
- **Tarih:** `date` + `tarih_hassasiyeti` (gun/ay/yil). Girdi: `1998`, `1998-05`, `05.1998`, `1998-05-12`, `12.05.1998`. Zaman damgaları `Europe/Istanbul` saat dilimiyle yazılır (sunucu/tarayıcı uyumu).
- **Konum:** `enlem`/`boylam` (double) + `yer_adi` asıl veridir; PostGIS `konum geography` onlardan üretilir (Aşama 5).
- **Eser arama** sunucuda yapılır (TMDB anahtarı tarayıcıya gitmez), 10 dk bellek içi önbellek, 8 sn zaman aşımı. Arama sonucundan gelen alanlar istemciden geldiği için sunucuda yeniden doğrulanır (dış kimlik deseni, görsel adresi beyaz listesi). Aynı dış eser bir kullanıcıda bir kez (kısmi tekil dizin). TMDB anahtarı **kişisel kullanım** lisanslı; gelir getiren yayında ticari lisans gerekir (ROADMAP Aşama 8). TMDB atıf metni alt bilgide ve arama sonuçlarında.
- **CSP:** satır içi betik yok; görseller yalnızca `covers.openlibrary.org`, `archive.org` / `*.archive.org` (Open Library kapakları oraya yönlenir) ve `image.tmdb.org`'dan. Dış görsellerde `referrerpolicy="no-referrer"`.
- **Testler:** saf mantık için birim testleri; veri katmanı için **PGlite** (bellek içi PostgreSQL) ile gerçek migration'lar üzerinde entegrasyon testleri (`veriKatmani.test.ts`, `cekirdekDeneyim.test.ts`; `vi.mock('./db/index.ts')`). Ayrı bir test veritabanı sunucusu gerekmez. PGlite'in varsayılan sıralaması `C`'dir ve `tr-TR` ICU sıralaması yoktur (yalnızca 2 genel ICU sıralaması); Türkçe sıralamaya bağlı testlerde dikkat.
- **Veritabanı** `iz_dev`, sahibi `iz` rolü, ICU `tr-TR` sıralaması ([db/kurulum.sql](db/kurulum.sql)).
- **Örnek veri:** `npm run db:seed` demo hesaplarını silip yeniden kurar (`demo@iz.test`, `ayse@iz.test`; şifre `.env`'deki `SEED_SIFRE`). Deneme sırasında açılan `deneme@iz.test` hesabına dokunmaz.
- **Biçim ve lint:** Prettier (sekme, tek tırnak, satır 100, sondaki virgül yok) + ESLint (ts + svelte + prettier). `svelte/no-navigation-without-resolve` kapalı; `_` ile başlayan kullanılmayan değişkenlere izin var. Satır sonları LF (`.gitattributes`). Commit öncesi `npm run lint`.
- **Uçtan uca testler (Playwright):** `e2e/`; `npm run test:e2e` derleyip 4180'de `preview` açar. Yerelde **kurulu Edge** (`channel: 'msedge'`, tarayıcı indirilmez), CI'da Chromium. Kurulum projesi her çalıştırmada `e2e-<rastgele>@iz.test` hesabı açar ve oturumu `e2e/.oturum/`a saklar (giriş hız sınırına takılmamak için); `e2e/temizlik.ts` bu hesapları siler (DATABASE_URL'i kendisi okur, yazdırmaz). Testler tek işçide, sıralı. axe ile ciddi/kritik ihlal olmamalı (açık/koyu, masaüstü/mobil).
- **CI:** `.github/workflows/denetim.yml`: lint → check → test → build; sonra `postgres:18` servisiyle migrate + e2e.
- **Yedek:** `npm run db:yedek` (`scripts/yedek.ts`): `pg_dump --format=custom` → `yedekler/` (git dışı), son 10 tutulur. Kimlik bilgileri `PG*` ortam değişkenleriyle verilir, komut satırına/çıktıya yazılmaz. `pg_dump` yolu `PG_BIN` ya da `C:\Program Files\PostgreSQL\18\bin`.

### Aşama 2.5 kararları

- **Yazılımsal silme:** `dugumler.silinme` ve `izler.silinme` (timestamptz). Her okuma/yazma sorgusu `etkin(tablo)` ile süzülür (`gorunurluk()` de içerir). Çöpteki düğüm bağlarıyla ve iz duraklarıyla birlikte saklanır, geri yüklenince hepsi döner; izde ve ağda görünmez. 30 gün sonra kalıcı silinir: zamanlanmış iş yok, sahibi panoya ya da çöp kutusuna gelince `suresiDolanlariTemizle`. Dış eser tekil dizini çöptekileri saymaz; geri yüklerken aynı eser yeniden eklenmişse `cakisma`.
- **Bildirimler:** form eylemleri `{ bildirim: { mesaj, tur?, geriAl?, baglanti? } }` döndürür; `Bildirimler.svelte` (düzende) `page.form.bildirim`'i baloncuk olarak gösterir. `geriAl` ya bir sunucu eylemi (`{ eylem: '/mutlak/yol?/eylem', alanlar }`, fetch + `deserialize` + `refreshAll`) ya da tarayıcı fonksiyonu (`{ fn }`). Silme sonrası liste sayfasına `?silindi=<id>` ile yönlenir; `SilindiBildirimi` başlığı çöpten okuyup "Geri al"lı baloncuk gösterir ve parametreyi `goto(…, { replace, shallow })` ile kaldırır. Sayfadaki eski yeşil bant bildirimleri kaldırıldı (yalnızca kalıcı uyarılar ve form hataları sayfada).
- **Eser durumu:** `eser_durumu` enum (`merak`, `suruyor`, `bitti`, `yarim`), yalnızca eserde (CHECK). Etiketler esere göre (`durumEtiketi`: Okudum/İzledim/Dinledim/Oynadım…). "Bitti" denince tarih boşsa bu ay (`buAyinTarihi`, İstanbul saati). Merak listesi = `/dugumler?durum=merak` (merak + sürüyor). Merak edilen eser kartta ve ağda kesik kenarlı.
- **"Seni buraya ne getirdi?":** düğüm formunun ilk sorusu (`getiren*` alanları, `getirenDogrula`); boş bırakmak "bilmiyorum" sayılır. Yazma `dugumVeGetireniKaydet` ile tek işlemde (yetkisizse hiçbir şey yazılmaz; aynı dış eser varsa onu kullanır). Yeni düğüm sayfasında (`?eklendi=1`) gelen bağı yoksa soru kartı öne çıkar; pano "bağsızlar" bağlantıları `?getiren=1` ile aynı kartı açar.
- **Hızlı ekle** (`/hizli?metin=`): `hizliEkle.ts` sezgisel Türkçe ayrıştırıcı (oklar, ayraçlar, "önerdi", "sayesinde", "-i okurken", "-den keşfettim"; şimdiki zamanda kök ünlüsü düştüğü için `izl|dinl|oyn` kökleri). Onay ekranı: haritadaki eşleşmeler (birebir önce), dış adaylar, "yeni". Dış eserin bilgisi istemciden alınmaz, eylemde arama (önbellekten) yeniden yapılır.
- **İlk iz sihirbazı** (`/basla`): kayıttan sonra açılır; eser + getiren + giden → üç özel düğüm, iki bağ, bir özel iz; eser "bitti". En az iki durak zorunlu.
- **Ağ konumları:** `ag_konumlari` (düğüm başına x/y). İlk açılışta fcose çalışır ve tüm konumlar kaydedilir; sonra harita kayıtlı konumlarla (`preset`) kurulur, yeni düğümler `eksikKonumlariYerlestir` ile kayıtlı komşularının ortasına (kimlikten sabit açıyla) konur. Sürükleme `dragfree` + 600 ms toplu PUT `/api/ag/konumlar` (sahiplik süzgeci, en çok 5000). "Yeniden yerleştir" geri alınabilir.
- **Haritanın karakterleri** (`analiz.ts`, panoda 4+ düğüm ve 3+ bağ varsa): kökler (giriş 0, çıkış > 0), kapı açanlar (dolaylı ulaşılan ≥ 2), kavşaklar (≥ 3 komşu, Brandes arasındalığı > 0), bağsızlar (bağı ve izi yok). 2000 düğümün üstünde pahalı ölçüler atlanır. "Açtığı kapılar" = `yolBul(…, 'ileri')`.

### Aşama 3a kararları

- **Profil** `/@kullaniciAdi` (rota klasörü `src/routes/@[kullaniciAdi]`): sahibi baksa bile her zaman anonim izleyicinin gördüğü (`gorunurluk(…, null)`); bağlar yalnızca iki ucu da açık olanlar. Ağ sahibinin kayıtlı yerleşimiyle çizilir, `AgGorunumu kaydet={false}`.
- **İz önizlemeleri** (`izleriListele(sahipId, { izleyenId, dugumId, limit })`): izleyen sahibi değilse yalnızca görebileceği izler; önizlemede görmediği durakların başlığı gönderilmez, `durakSayisi` yine tümünü sayar. Düğüm sayfasındaki "Geçtiği izler" de bunu kullanır.
- **noindex:** kök düzen `page.data.indekslenebilir !== true` ise `<meta name="robots" content="noindex">` yazar. Tanıtım sayfası (`+page.ts`) her zaman `true`; profil, açık düğüm ve açık iz sayfaları sahibinin `kullanicilar.arama_motorlari` ayarına göre (varsayılan kapalı).
- **Ayarlar** (`/ayarlar`, `hesap.ts`): şifre soran işlemler (e-posta, şifre, hesap silme) `hesapSiniri` (kullanıcı başına 15 dk'da 10). Şifre değişince mevcut oturum dışındakiler silinir. E-posta değişikliği e-posta servisi seçilene kadar yalnızca şifreyle onaylanır. Hesap silme: kullanıcı adını yazmak + şifre; her şey zincirleme silinir, `/?hesapSilindi=1`.
- **Oturumlar:** `oturumlar.cihaz` ("Edge · Windows"; tam User-Agent saklanmaz, `cihaz.ts`) ve `son_kullanim` (en çok saatte bir yazılır). Sayfaya oturum kimliğinin (jeton özeti) yalnızca ilk 16 karakteri gider.
- **Veri taşıma:** biçim `{ bicim: 'iz-disa-aktarma', surum: 2, … }` (sürüm 1 dosyaları da okunur) (`veriTasima.ts`, saf; `disaIceAktar.ts`, veritabanı). Dışa aktarmaya çöptekiler girmez. İçe aktarma eklemelidir, tek işlemde; kimlikler yeniden üretilir; aynı dış eser (haritada ya da dosyada) birleşir; konumlar yalnızca yeni düğümler için; bozuk kayıtlar atlanıp sayılır. En çok 5 MB, 5000 düğüm, 20000 bağ, 500 iz; kullanıcı başına saatte 5. Üretimde `BODY_SIZE_LIMIT=16M` gerekir (adapter-node varsayılanı 512K).
- **E-posta:** `posta.ts → epostaGonder`; servis kullanıcı seçene kadar yok: geliştirmede (ve Vitest'te) ileti terminale yazılır, üretimde gönderilmez ve bağlantı log'a düşmez. Jetonlar `eposta_jetonlari` (SHA-256 özeti, amaç başına kullanıcıda tek geçerli jeton; sıfırlama 1 saat, doğrulama 3 gün). Jeton, hesabın e-postası değişince geçersizleşir. Sıfırlama: yanıt her durumda aynı, IP başına saatte 5 + adres başına saatte 3; başarıda tüm oturumlar kapanır ve e-posta doğrulanmış sayılır. Jetonlu sayfalarda `<meta name="referrer" content="no-referrer">`.
- **Arama:** `dugumler.arama_metni` ve `izler.arama_metni` üretilmiş sütunlar (`schema.ts → sadelestirSql`: Türkçe/aksanlı harfler `translate` ile ASCII'ye, sonra `lower`; "I" önce "i"). `aramaKosulu(sutun, q)`: her sözcük `like` ya da `word_similarity ≥ 0.45`; birebir önce. pg_trgm migration'da `CREATE EXTENSION` (trusted); PGlite'ta `extensions: { pg_trgm }`.
- **Sayfalama:** `imlec.ts` (zaman damgasının PostgreSQL metni + kimlik, base64url; mikro saniye korunur). `dugumSayfasi` (60, `olusturma, id`), `izSayfasi` (30, `guncelleme, id`); aramada sayfalama yok (en alakalı 200). `DahaFazla.svelte` sonraki sayfayı `goto(…, { replace, reset: false })` ile yükler, sayfa önceki listeyi `birikim`de tutar (`$effect.pre` ile ilk sayfada sıfırlanır).
- **Arama önbelleği:** `eser_arama_onbellegi` UNLOGGED (migration'da elle). `eserArama.ts` saf kalsın diye katman `kaliciOnbellekKur` ile `hooks.server.ts`'de takılır; hata verirse yok sayılır.
- **Gömme ve RSS:** `/izler/[id]/gom` her zaman anonim görünüm; kök düzen bu rotada üst menü/alt bilgi çizmez; `hooks.server.ts` yalnızca bu rotada CSP'yi `frame-ancestors *` yapar ve `X-Frame-Options` koymaz. `/@kullanici/rss.xml` yalnızca açık izler (önizleme süzgeciyle), sahibi arama motorlarını kapattıysa `X-Robots-Tag: noindex`.
- **Türkçe sayı + ad:** sayıdan sonra çoğul eki yok ("3 eser", "3 eserler" değil): `DUGUM_TURU_ETIKETI` kullan, `DUGUM_TURU_COGUL` başlık/süzgeç içindir.

- **Kişi düğümü uyarısı:** tür kişi + gizlilik herkes seçilince formda CSS `:has()` ile mahremiyet uyarısı (JS gerekmez).

### Aşama 3a (ikinci yarı) kararları

- **Kanonik eser:** `kanonik_eserler` + veritabanı tetikleyicisi `kanonik_eser_bagla` (eser düğümü eklenince/değişince dış kimlikle ya da başlık+yapımcı+tür parmak iziyle bağlanır). `kesif.ts`: kör kesişim (aynı eseri ekleyen başkalarının **yalnızca açık** izleri), keşif yolları ("X'ten sonra Z'ye gidenler"), keşiften merak listesine ekleme. Yalnızca sahibine ve yalnızca eser düğümlerinde.
- **Gruplar:** `gruplar`, `grup_uyeleri`; davet bağlantısı 7 gün (`/davet/[jeton]`). `gorunurluk()` grup arkadaşlığını `grupArkadasiSql` ile içerir; saf karşılığı `gorebilirMi(kayit, izleyenId, grupArkadasi)`. **Ortak iz:** `izler.ortak_grup_id`; grup üyeleri kendi düğümlerini durak ekleyip çıkarabilir (`duzenlemeYetkisi`), başkasının durağını yalnızca iz sahibi çıkarır.
- **Gölge düğüm:** gizlilik `golge` (yalnızca düğümde; izlerde `IZ_GIZLILIK_DUZEYLERI`). Başkası başlık yerine yalnızca tür şeklini, istek başına anonim kimlikle görür. **Dolaylı bağ** (`dolayli.ts`): iki açık düğüm arasındaki gizli ara düğümler tek kesikli bağa indirgenir; ara düğümün türü/sayısı sızmaz.
- **Dış bağ** ("Senin izin beni buraya götürdü"): `dis_baglar` (başkasının açık düğümünden kendi düğümüne) + `bildirim_kutusu`; hedef özelse sahibine başlığı gitmez. Zil sayacı = okunmamış bildirim + sonucu sorulacak kararlar. Beğeni/takipçi/akış yok.
- **OG görseli:** `ogGorsel.ts` saf SVG üretir, `@resvg/resvg-js` PNG'ye çevirir (`/izler/[id]/og.png`, yalnızca açık izler; Yıllık kartı yalnızca sahibine).
- **Passkey:** `@simplewebauthn/server` + `/browser`; `gecis_anahtarlari`; meydan okuma 5 dk'lık çerezde (`iz_meydan`). Ayarlardan eklenir/silinir, girişte "Geçiş anahtarıyla giriş yap".

### Aşama 3b kararları

- **`baglar.ts`** bağ katmanı (dugumBaglari, yolBul, geldigiYol, actigiKapilar, bagKur/Guncelle/Sil, cevreDugumleri…). **Bağ türü** `besler/celisir/cagristirir/sentezler`, boş = belirtilmemiş (eski bağlar etiketlenmez); ağda renk + çizgi biçemi asıl, fcose yay uzunluğu ikincil; lejant aynı zamanda süzgeç.
- **Ağ:** görünüm/süzgeç/odak adrese yazılır (paylaşılabilir); yön tuşlarıyla komşuya geçiş; "Bağ kur" kipinde iki düğüme tıklayarak `/api/baglar`; zaman sürgüsü düğümleri sırayla gösterir (yeniden yerleşim yok); 500 düğüm üstünde odak çevresi özyinelemeli sorguyla (`cevreDugumleri`). Dönem haleleri ve etkiye göre boyut.
- **Komut paleti** (Ctrl+K, `/api/ara`), düğüm formunda eser önerisi (`/api/eser-ara`) ve `[[…]]` satır içi bağ (kaydetmeden önce önizlenir).
- **Dönemler** (`/donemler`, renkli bantlar), **etki** (`degistirdi/iz_birakti/gecti`, puan değil), **alıntılar** (eserlerde; bağ notu bir alıntıya işaret edebilir), **iz çatallanması** (`izler.ata_iz_id` + ayrılma sırası), **hat haritası** (`/izler/hat`, `hatHaritasi.ts`; aktarma = birden çok izin geçtiği düğüm).

### Aşama 3c kararları

- **İçe aktarma** (`/ice-aktar`): Goodreads/Letterboxd CSV, Spotify JSON, Kindle `My Clippings.txt` (`disKaynaklar.ts`, saf; BOM `String.fromCharCode(0xfeff)` ile, dosyada literal BOM yazma). Hepsi **özel** eklenir; aynı başlık+yapımcı birleşir, alıntılar tekrarsız. En çok 5 MB, kullanıcı başına saatte 5.
- **Bağ avı** (`/bag-avi`): aynı yapımcı / yakın tarih çiftleri; "hayır" cevabı `bag_avi_redleri`'ne yazılır, bir daha sorulmaz.
- **Günün sorusu** yalnızca pazartesi/çarşamba/cuma (İstanbul), gün için sabit seçim; gelen bağı olmayan düğüm. **Bugün geçmişte:** günü bilinen düğümlerin yıldönümü.
- **Zenginleştirme:** eserin yapımcısı kişi düğümü olarak önerilir (varsa yeniden açılmaz); Wikidata yalnızca **boş** alanları doldurur (`dugumler.wikidata`).
- **İz Yıllığı** (`/yillik/[yil]`, `kart.png`): yalnızca sahibine.

### Aşama 4 kararları (Karar Defteri)

- `kararlar` tablosu (düğüm başına bir satır, `dugum_id` PK): gerekçe, beklenti, güven (0–100 tam sayı), `sorulacak` (date; tarih girdisi esnek), sonuç (`gerceklesti/kismen/gerceklesmedi`), sonuç notu/tarihi. Yalnızca **karar** türündeki, sahibinin etkin düğümüne yazılır (`kararDefteriDb.ts`).
- Defter **kişiseldir**: düğüm herkese açık olsa da defter yalnızca sahibine gösterilir; profil, OG görseli, gömme ve RSS'e hiç girmez.
- **Veri taşıma sürüm 2:** düğümde `etki`, `wikidata`, `karar` (defter); bağda `tur`, `alintiId`; izde `id`, `ataIzId`, `ayrilmaSirasi`; üst düzeyde `alintilar`, `donemler`. İçe aktarmada defter ve alıntılar yalnızca **yeni açılan** düğümlere yazılır (birleşen düğümün kendi verisi korunur); bağın alıntısı kaynak düğümün alıntısı değilse düşer; ata iz dosyada yoksa çatal bilgisi düşer. Ortak iz grubu taşınmaz (grup hesaba bağlı). Drizzle sol birleşimde iç içe nesne seçimini boşaltabildiği için defter alanları düz seçilir.
- "Zamanı geldi" = sonuç yok ve `sorulacak ≤ bugün` (İstanbul günü). Zamanlanmış iş yok: pano kartı, zil sayacı ve `/bildirimler` bölümü her yüklemede sorgular.
- Kalibrasyon (`kararDefteri.ts`, saf): 50 altı tek dilim, sonra 10'luk dilimler; "kısmen" = 0,5. Brier puanı; 5 sonuçtan az iken yorum yapılmaz. Grafik SVG + erişilebilir tablo (`/kararlar`).

### Aşama 5 kararları

- **Harita:** MapLibre yalnızca harita gereken yerde dinamik içe aktarılır (`haritaYukle.ts`). Worker `maplibre-gl/dist/maplibre-gl-worker.mjs?url` ile kendi kökenimizden (CSP'ye `blob:` gerekmez); CSP `connect-src`'ye yalnızca `https://tiles.openfreemap.org` eklendi. Stil: açıkta `positron`, koyuda `dark`; tema değişince `setStyle`. Karo sağlayıcısı değişecekse `KARO_KOKENI` + CSP birlikte. Dokunmatikte `cooperativeGestures` (iki parmakla kaydırma). WebGL/karo hatasında mesaj, liste yine çalışır.
- **Saf mantık** `konumlar.ts`: `yerlereGrupla` (5 ondalık ≈ 1 m aynı yer; "yer" türü varsa yerin adı odur), `bagCizgileri` (aynı yer ve yinelenen çiftler atlanır), `sinirlar`, `mesafeYaz`.
- **PostGIS:** eklenti güvenilir değil; yerelde `postgres` kullanıcısıyla bir kez `CREATE EXTENSION postgis;` (db/kurulum.sql). `konum` üretilmiş sütun olduğu için `dugumGetir` onu seçmez (`dugumSutunlari`); tam satır seçen yeni kodda da sayfaya gönderme. PGlite'ta `@electric-sql/pglite-postgis` (test dosyası başına yükleme ~birkaç sn). CI imajı `postgis/postgis:18-3.6`. Drizzle `customType` tür adını tırnaklıyor: migration elle düzeltildi.
- **Fotoğraflar:** `fotograflar` tablosu + diskte `~/.iz/yuklemeler/fotograflar/<id>.webp` (Aşama 6'da OneDrive dışına taşındı) ve `<id>-k.webp` (640 px); klasör git dışı ve **veritabanı yedeğine girmez** (yayında ayrıca yedeklenmeli). Yalnızca `yer` ve `ani` düğümlerinde (`FOTOGRAFLI_TURLER`). sharp ile yeniden kodlama (EXIF/GPS silinir, `rotate()` yönü uygular), JPEG/PNG/WebP/AVIF/TIFF; HEIC desteklenmez. En çok 15 MB, düğüm başına 12, kullanıcı başına saatte 40. Önce satır, sonra dosya; dosya yazılamazsa satır silinir. `/fotograflar/[id]` (?k=1 küçük) düğümün görünürlüğüyle; her zaman `Cache-Control: private`. Hesap/düğüm silinince dosyalar `sahipsizFotograflariTemizle` ile (10 dk pay; panoda saatte en çok bir kez, hesap silmede hemen) silinir. Fotoğraflar JSON dışa aktarmaya girmez.
- **Hak beyanı:** `kendi / aile / izinli / kamu`; `izinli` ve `kamu`'da kaynak zorunlu; onay kutusu zorunlu. Karşılaştırma çifti: en eski "eski" ile en yeni "yeni" (`karsilastirmaCifti`).
- **Üretim:** fotoğraf yükleme için `BODY_SIZE_LIMIT=16M` (içe aktarmanın 6M'ini de kapsar).
- Windows'ta testlerde `sharp.cache(false)` (yoksa geçici klasör kilitli kalır).

### Aşama 6 kararları (Aile Hafızası)

- **Kullanıcı kararları:** yazıya dökme **yerel** (whisper.cpp; ses dışarı gitmez), varlık çıkarma **yerel kurallarla** (Claude API yok).
- **Dosya yerleri** (`depolama.ts`): proje OneDrive'da olduğu için yüklemeler `~/.iz/yuklemeler/{fotograflar,sesler}`, araçlar `~/.iz/araclar/` (yayında `YUKLEME_KLASORU`, `IZ_ARACLAR`). Araç yolları ayrıca `WHISPER_KOMUTU`, `WHISPER_MODELI`, `FFMPEG_KOMUTU` ile; ffmpeg yoksa winget bağlantısı `%LOCALAPPDATA%\Microsoft\WinGet\Links\ffmpeg.exe` denenir. Araç yoksa ses `kapali` durumunda saklanır, metin elle yazılır.
- **Sesler** (`sesler` tablosu, `sesler.ts`, `yaziyaDokme.ts`): tür baytlardan tanınır (`ses.ts → sesTuru`: webm/ogg/flac/wav/m4a/mp3), en çok 25 MB, düğüm başına 10, saatte 30. Süreç içi tek işçili kuyruk; açılışta yarım kalanlar `sesKuyrugunuBaslat` (hooks). ffmpeg → 16 kHz mono WAV (en çok 30 dk) → `whisper-cli -l tr -nt -otxt`. Elle yazılmış metnin üzerine yazılmaz (`coalesce`). `halusinasyonuAyikla` "Altyazı M.K." vb. siler (Türkçe "İ" `/i` ile eşleşmez: `[iİ]`). Görünürlük: sahibi + (düğüm grup/herkes ise) grup arkadaşları + aktif varis; **anonim asla**. `/sesler/[id]` Range destekli. CSP `media-src 'self' blob:`, `Permissions-Policy: microphone=(self)`.
- **Yerel varlık çıkarma** (`varliklar.ts`): büyük harfli öbekler; cümle başındaki tek sözcük ancak eki/akrabalığı varsa ya da başka yerde de büyük harfle geçiyorsa; cümle başındaki ekli sıradan sözcük öbekten atılır ("Bayramlarda Fatma nine"); kesme sonrası -de/-den/-e → yer, -nin/-i/-le → kişi; "teyzenin" gibi ekli akrabalık kökü ada eklenir. Öneriler `/dugumler/[id]/oneriler`; seçilenler tek işlemde özel düğüm + "Anlatırken geçti" bağı + (tarihsizse) yıl.
- **Yakınlara soru** (`sorular` tablosu): jeton yalnızca SHA-256 özeti, bağlantı bir kez gösterilir, 60 gün, bir kez yanıtlanır (yarış güvenli `where yanitlanma is null`), IP başına saatte 20. Yanıt sesi `sesler.soru_id` ile (düğümsüz, yalnız sahibine). Bildirim türü `soru_yaniti`. "Anı olarak ekle": özel anı, ses taşınır, kişi düğümünden bağ. E-posta servisi olmadığı için gönderim WhatsApp bağlantısı/kopyalama ile.
- **Arşiv ve kitap** (`arsiv.ts`, `ArsivKitabi.svelte`): grup arşivi yalnızca üyelerin **grup** gizlilikli (herkese açıklar değil) anı/yer/kişileri; kişisel kitap sahibin hepsi. PDF kitaplığı yok: `@media print` + `@page A5`, "Yazdır ya da PDF olarak kaydet".
- **Zaman kapsülü** (`dugumler.muhur_tarihi`): `muhursuz()` koşulu fotoğraf/ses/arşiv/öneri/Wikidata sorgularında; `dugumGetir` açıklamayı boşaltıp `muhurlu` döner; `dugumGuncelle` mühürlüyü güncellemez, düzenleme sayfası 423. Mühürlü düğüme ses eklenebilir (kapsüle girer). "Beklemeden aç" = `kapsuluAc`. Dışa aktarmada açıklama yer alır (sahibinin verisi).
- **Dijital vasiyet** (`vasiyetler`, `kullanicilar.son_etkinlik`): sayaç oturum kullanıldıkça (saatte en çok bir) sıfırlanır. `varisSql` `gorunurluk()` içinde: süre dolunca varis her şeyi görür, yazma sorguları sahip_id ile süzüldüğü için salt okunur. `/emanet` (bekleyenler de görünür), `/emanet/[kullaniciAdi]` kitap + JSON indirme.

### Aşama 7 kararları (Çeviri Masası)

- **Telif (kullanıcı kararı, Kasım 2026): kısa alıntı + beyan.** `ceviri.ts`: `CEVIRI_EN_UZUN = 600`, `ALINTI_PARAGRAF_SINIRI = 5` (yalnızca `alinti` dayanaklı çeviri içeren paragraflar sayılır; aynı paragrafa ikinci alıntı serbest), paragraf başına en çok 8 çeviri. Dayanak `kamu / izinli / alinti` (CHECK). Çevirmen zorunlu. Sınır `ceviriEkle` içinde masa satırı `FOR UPDATE` kilitlenerek denetlenir.
- **Tablolar:** `ceviri_masalari` (gizlilik `golge` olamaz, `eser_id` yalnızca sahibin eseri), `ceviri_paragraflari` (sira), `ceviriler`, `ceviri_oylari` (PK paragraf+kullanıcı: paragraf başına tek oy), `ceviri_yorumlari`.
- **Erişim** (`ceviriMasasi.ts`): görme masa gizliliğiyle; paragraf/ayar yalnızca sahibi; çeviri ekleme sahibi + (grup/herkes masasında) grup arkadaşları; oy ve yorum masayı gören her girişli kullanıcı; silme yazarı ya da masa sahibi. Eser bağlantısı izleyen eseri göremiyorsa gönderilmez. Saatte 60 çeviri/yorum.
- **Fark vurgusu** istemcide (`sozcukFarki`): bir sözcük, paragraftaki **öteki çevirilerin hepsinde** karşılıksızsa `<mark>`.

## Komutlar

`npm run dev` · `npm run check` · `npm test` · `npm run build` · `npm run preview` · `npm run db:generate` · `npm run db:migrate` · `npm run db:seed`

Git Bash'te Node PATH'te olmayabilir: `export PATH="/c/Program Files/nodejs:$PATH"`. Git Bash heredoc'ları `\\` dizilerini tek `\`'ye indirir; ters eğik çizgi içeren dosyaları Write/Edit aracıyla yaz.
