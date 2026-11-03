# CLAUDE.md — İz projesi çalışma notları

## Kullanıcı ve çalışma şekli

- Kullanıcı Türkçe konuşur. **Yanıtlar, arayüz metinleri, kod yorumları ve commit mesajları Türkçe.**
- Windows 11; PostgreSQL 18 yerelde kurulu (pgAdmin 4 ile yönetiyor). **Docker kullanılmıyor.** Node.js 26 LTS (`winget` ile kuruldu).
- Daha önce ASP.NET Core ile kişisel site yaptı (ayrı depo); bu projede bilerek farklı bir yığın seçti.
- Tempo: her aşamada maddelerin hepsini bitir → `npm run check`, `npm test`, `npm run build` → tarayıcıda dene (açık/koyu tema, masaüstü/mobil ekran görüntüsü) → ROADMAP.md'yi güncelle → Türkçe commit → kısa Türkçe özet.
- Yalnızca gerçekten kullanıcının vermesi gereken kararlarda soru sor; diğerlerinde makul varsayılanı seç ve buraya not et.
- Veritabanı şifresi `.env` dosyasında; kullanıcı kendisi yazdı. Şifreyi okuma/yazdırma.

## Ürün

"İz — hayatının bağlantılı haritası". Düğüm (eser/kişi/yer/karar/anı) + Bağ (yönlü, "bu beni şuna götürdü" notlu) + İz (sıralı, anlatılabilir yol). Her düğümde tarih (gün/ay/yıl hassasiyetli) ve isteğe bağlı konum. Gizlilik her düğüm ve izde ayrı: `ozel` / `grup` / `herkes`. Aşamalar ve modüller: [ROADMAP.md](ROADMAP.md).

## Yığın

- **SvelteKit 3** + **Svelte 5** (runes) + **TypeScript 6**, **Vite 8**, `@sveltejs/adapter-node`
- **PostgreSQL 18** + **Drizzle ORM 0.45** (`postgres` sürücüsü v4), migration'lar `drizzle/` altında
- **@node-rs/argon2** (Argon2id), **Vitest 5**
- Yazı tipleri `@fontsource-variable/inter` ve `@fontsource-variable/fraunces` (npm; CDN yok)
- İleride: Cytoscape.js/Sigma.js (ağ), MapLibre + OSM (harita), PostGIS, pg_trgm, Claude API (varlık çıkarma)
- Tüm sürümler `package.json`'da **tam sürümle sabit** (`npm install -E`).

## SvelteKit 3'e özgü notlar (önceki sürümlerden farklı!)

- Yapılandırma `svelte.config.js`'de değil, **`vite.config.ts` içinde `sveltekit({ ... })`** seçenekleri olarak (adapter, csp vb.).
- `$lib` yerine **`#lib`** (package.json `imports`). TS dosyalarını **uzantısıyla** içe aktar: `import { x } from '#lib/server/dugumler.ts'`. Klasör: `'#lib/server/db/index.ts'`. `.svelte` ve `.css` de uzantılı.
- Ortam değişkenleri **`src/env.ts`**'de `defineEnvVars` ile tanımlanır, **`$app/env/private`**'tan okunur. `dev`/`browser` → `$app/env`.
- `Handle` tipi **`@sveltejs/kit/hooks`**'tan gelir (`@sveltejs/kit`'ten değil).
- Kit'in kendi CSRF denetimi yalnızca üretimde ve yalnızca form içerik türlerinde çalışır; bu yüzden `hooks.server.ts`'de kendi Origin denetimimiz var.
- `json()`/`text()` kullanımdan kalktı → `Response.json()` / `new Response()`.

## Mimari

- `src/lib/server/` yalnızca sunucu kodu (Kit bunu istemciye sızdırmaz). Saf (veritabanına bağlı olmayan) mantık ayrı dosyalarda tutulur ki birim testlenebilsin: `dogrulama.ts`, `yetki.ts`, `hizSiniri.ts`, `eserArama.ts` dönüştürücüleri, `../tarih.ts`.
- Veri erişimi `dugumler.ts`'de toplanır. **Her yazma sorgusu `sahip_id` ile süzülür**; okuma `gorunurluk()` SQL koşuluyla (saf karşılığı `yetki.ts → gorebilirMi`).
- Sayfalar form eylemleriyle (form actions) çalışır, `use:enhance` ile ilerleyici iyileştirme; JavaScript kapalıyken de işler (ör. eser alanlarını göster/gizle `:has()` ile CSS'te).
- Tema: çerez `tema=acik|koyu`, yoksa sistem. `hooks.server.ts` `%iz.tema%` yer tutucusunu `<html data-theme>` ile değiştirir. Renkler `light-dark()` ile tek yerde.
- Tasarım belirteçleri `src/lib/stiller/tasarim.css`: Türkçe adlı CSS değişkenleri (`--zemin`, `--yuzey`, `--metin`, `--vurgu`, `--tur-eser`…), aralık ölçeği `--a-1…--a-8`, ortak sınıflar `.kap`, `.kart`, `.dugme`, `.rozet`, `.alan`, `.bildirim`.

## Alınan kararlar (varsayılanlar)

- **Adlandırma:** Alan adları ve tanımlayıcılar Türkçe ama ASCII (`dugum`, `baglar`, `kullaniciAdi`). Tablolar Türkçe (`kullanicilar`, `dugumler`…). npm betik adları alışılmış İngilizce (`db:migrate`, `db:seed`).
- **Gizlilik varsayılanı `ozel`.** `grup` düzeyi, gruplar gelene kadar (Aşama 3) yalnızca sahibine açık.
- **Görünmeyen düğüm = 404** (403 değil): başkasının özel düğümünün varlığı belli olmasın. Geçersiz UUID de 404.
- **Bağlar yalnızca kişinin kendi düğümleri arasında** kurulur (Aşama 1). Bağ, iki ucu da izleyene görünürse görünür.
- **Oturum:** 32 bayt rastgele jeton çerezde; veritabanında SHA-256 özeti. 30 gün; son 15 güne girince kendiliğinden uzar. Çerez `HttpOnly`, `SameSite=Lax`, üretimde `Secure`. Çıkış yalnızca POST.
- **Şifre:** en az 10, en çok 200 karakter; Argon2id (19 MiB, 2 tur). Kırpılmaz. Olmayan kullanıcıyla girişte de sahte doğrulama yapılır (zamanlama eşitleme).
- **Kullanıcı adı:** `[a-z0-9_.]{3,30}`, Türkçe karakter yok (adres/etiket olarak kullanılacak). Görünen ad serbest. E-posta ve kullanıcı adı **Türkçe olmayan** küçültmeyle (`toLowerCase()`; "I" → "i").
- **Kayıtta** "bu e-posta zaten kayıtlı" denir (kullanılabilirlik ↔ hesap sayımı ödünleşimi; hız sınırı var).
- **Hız sınırı bellek içi** (tek süreç): giriş IP+e-posta başına 15 dk'da 5, IP başına 15 dk'da 30; kayıt IP başına saatte 10. Çok sunuculu yayında PostgreSQL/Redis'e taşınacak.
- **Tarih:** `date` + `tarih_hassasiyeti` (gun/ay/yil). Girdi: `1998`, `1998-05`, `05.1998`, `1998-05-12`, `12.05.1998`.
- **Konum:** şimdilik `enlem`/`boylam` (double) + `yer_adi`; Aşama 5'te PostGIS.
- **Eser arama** sunucuda yapılır (TMDB anahtarı tarayıcıya gitmez), 10 dk bellek içi önbellek, 8 sn zaman aşımı. Arama sonucundan gelen alanlar istemciden geldiği için sunucuda yeniden doğrulanır (dış kimlik deseni, görsel adresi beyaz listesi). Aynı dış eser bir kullanıcıda bir kez (kısmi tekil dizin).
- **CSP:** satır içi betik yok; görseller yalnızca `covers.openlibrary.org`, `archive.org` (Open Library kapakları oraya yönlenir) ve `image.tmdb.org`'dan. Dış görsellerde `referrerpolicy="no-referrer"`.
- **Veritabanı** `iz_dev`, sahibi `iz` rolü, ICU `tr-TR` sıralaması ([db/kurulum.sql](db/kurulum.sql)).
- Prettier/ESLint henüz eklenmedi (gerekirse sonraki aşamada).

## Komutlar

`npm run dev` · `npm run check` · `npm test` · `npm run build` · `npm run db:generate` · `npm run db:migrate` · `npm run db:seed`

Git Bash'te Node PATH'te olmayabilir: `export PATH="/c/Program Files/nodejs:$PATH"`.
