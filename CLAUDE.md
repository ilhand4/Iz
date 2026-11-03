# CLAUDE.md — İz projesi çalışma notları

## Kullanıcı ve çalışma şekli

- Kullanıcı Türkçe konuşur. **Yanıtlar, arayüz metinleri, kod yorumları ve commit mesajları Türkçe.**
- Windows 11; PostgreSQL 18 yerelde kurulu (pgAdmin 4 ile yönetiyor). **Docker kullanılmıyor.** Node.js 26 LTS (`winget` ile kuruldu).
- Daha önce ASP.NET Core ile kişisel site yaptı (ayrı depo); bu projede bilerek farklı bir yığın seçti.
- Tempo: her aşamada maddelerin hepsini bitir → `npm run check`, `npm test`, `npm run build` → tarayıcıda dene (açık/koyu tema, masaüstü/mobil ekran görüntüsü) → ROADMAP.md'yi güncelle → Türkçe commit → kısa Türkçe özet.
- Kullanıcı Aşama 2'den itibaren işi **"profesyonel bir site tasarımcısı gözüyle"** yapmamı istedi: yalnızca özelliği değil görsel tutarlılığı, boş durumları, mobil kullanımı ve erişilebilirliği de bitmiş say.
- Yalnızca gerçekten kullanıcının vermesi gereken kararlarda soru sor; diğerlerinde makul varsayılanı seç ve buraya not et.
- Veritabanı şifresi ve TMDB anahtarı `.env` dosyasında; kullanıcı kendisi yazdı. Bunları okuma/yazdırma.

## Ürün

"İz — hayatının bağlantılı haritası". Düğüm (eser/kişi/yer/karar/anı) + Bağ (yönlü, "bu beni şuna götürdü" notlu) + İz (sıralı, anlatılabilir yol). Her düğümde tarih (gün/ay/yıl hassasiyetli) ve isteğe bağlı konum. Gizlilik her düğüm ve izde ayrı: `ozel` / `grup` / `herkes`. Aynı veri üç görünümde: Liste + **Ağ** + **Zaman çizgisi** (Harita Aşama 5'te). Aşamalar ve modüller: [ROADMAP.md](ROADMAP.md).

## Yığın

- **SvelteKit 3** + **Svelte 5** (runes) + **TypeScript 6**, **Vite 8**, `@sveltejs/adapter-node`
- **PostgreSQL 18** + **Drizzle ORM 0.45** (`postgres` sürücüsü v4), migration'lar `drizzle/` altında
- **Cytoscape.js 3.34** + `cytoscape-fcose` (ağ görünümü; yalnızca ağ sayfasında dinamik içe aktarmayla yüklenir)
- **@node-rs/argon2** (Argon2id), **Vitest 5**, **@electric-sql/pglite** (entegrasyon testleri)
- Yazı tipleri `@fontsource-variable/inter` ve `@fontsource-variable/fraunces` (npm; CDN yok)
- İleride: MapLibre + OSM (harita), PostGIS, pg_trgm, Claude API (varlık çıkarma)
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
- **Hız sınırı bellek içi** (tek süreç): giriş IP+e-posta başına 15 dk'da 5, IP başına 15 dk'da 30; kayıt IP başına saatte 10. Çok sunuculu yayında PostgreSQL/Redis'e taşınacak.
- **Tarih:** `date` + `tarih_hassasiyeti` (gun/ay/yil). Girdi: `1998`, `1998-05`, `05.1998`, `1998-05-12`, `12.05.1998`. Zaman damgaları `Europe/Istanbul` saat dilimiyle yazılır (sunucu/tarayıcı uyumu).
- **Konum:** şimdilik `enlem`/`boylam` (double) + `yer_adi`; Aşama 5'te PostGIS.
- **Eser arama** sunucuda yapılır (TMDB anahtarı tarayıcıya gitmez), 10 dk bellek içi önbellek, 8 sn zaman aşımı. Arama sonucundan gelen alanlar istemciden geldiği için sunucuda yeniden doğrulanır (dış kimlik deseni, görsel adresi beyaz listesi). Aynı dış eser bir kullanıcıda bir kez (kısmi tekil dizin). TMDB anahtarı **kişisel kullanım** lisanslı; gelir getiren yayında ticari lisans gerekir (ROADMAP Aşama 8). TMDB atıf metni alt bilgide ve arama sonuçlarında.
- **CSP:** satır içi betik yok; görseller yalnızca `covers.openlibrary.org`, `archive.org` / `*.archive.org` (Open Library kapakları oraya yönlenir) ve `image.tmdb.org`'dan. Dış görsellerde `referrerpolicy="no-referrer"`.
- **Testler:** saf mantık için birim testleri; veri katmanı için **PGlite** (bellek içi PostgreSQL) ile gerçek migration'lar üzerinde entegrasyon testleri (`veriKatmani.test.ts`, `vi.mock('./db/index.ts')`). Ayrı bir test veritabanı sunucusu gerekmez. PGlite'in varsayılan sıralaması `C`'dir ve `tr-TR` ICU sıralaması yoktur (yalnızca 2 genel ICU sıralaması); Türkçe sıralamaya bağlı testlerde dikkat.
- **Veritabanı** `iz_dev`, sahibi `iz` rolü, ICU `tr-TR` sıralaması ([db/kurulum.sql](db/kurulum.sql)).
- **Örnek veri:** `npm run db:seed` demo hesaplarını silip yeniden kurar (`demo@iz.test`, `ayse@iz.test`; şifre `.env`'deki `SEED_SIFRE`). Deneme sırasında açılan `deneme@iz.test` hesabına dokunmaz.
- Prettier/ESLint henüz eklenmedi (gerekirse sonraki aşamada).

## Komutlar

`npm run dev` · `npm run check` · `npm test` · `npm run build` · `npm run preview` · `npm run db:generate` · `npm run db:migrate` · `npm run db:seed`

Git Bash'te Node PATH'te olmayabilir: `export PATH="/c/Program Files/nodejs:$PATH"`. Git Bash heredoc'ları `\\` dizilerini tek `\`'ye indirir; ters eğik çizgi içeren dosyaları Write/Edit aracıyla yaz.
