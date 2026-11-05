# İz — hayatının bağlantılı haritası

> İnsanlar ne yaşadığını kaydeder; İz neyin seni neye götürdüğünü kaydeder.

İz; eserler, kişiler, yerler, kararlar ve anılar (**düğümler**) arasındaki "bu beni şuna götürdü" **bağlarını** ve bunlardan oluşan anlatılabilir **izleri** kaydeder. Yol haritası için [ROADMAP.md](ROADMAP.md), mimari ve kararlar için [CLAUDE.md](CLAUDE.md).

## Gereksinimler

- **Node.js 22.12 veya üstü** (geliştirmede Node 26 LTS kullanılıyor). Kurulum: `winget install OpenJS.NodeJS.LTS` ya da [nodejs.org](https://nodejs.org)
- **PostgreSQL 16 veya üstü** (geliştirmede 18)

## Kurulum

1. Bağımlılıkları kurun:

   ```bash
   npm install
   ```

2. Veritabanını oluşturun: pgAdmin'de `postgres` kullanıcısıyla Query Tool açıp [db/kurulum.sql](db/kurulum.sql) dosyasını çalıştırın (içindeki şifreyi değiştirin). Bu, `iz` rolünü ve `iz_dev` veritabanını oluşturur.

3. Ortam dosyasını hazırlayın: `.env.example` dosyasını `.env` adıyla kopyalayın ve `DATABASE_URL` içindeki `SIFRE_BURAYA` yerine 2. adımdaki şifreyi yazın.

4. Tabloları oluşturup örnek veriyi yükleyin:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   Örnek veri iki hesap oluşturur: `demo@iz.test` ve `ayse@iz.test` (şifre: `.env` içindeki `SEED_SIFRE`).

5. Geliştirme sunucusunu başlatın ve <http://localhost:5173> adresini açın:

   ```bash
   npm run dev
   ```

### Film ve dizi araması (isteğe bağlı)

Kitap araması (Open Library) anahtarsız çalışır. Film/dizi için ücretsiz bir TMDB anahtarı alın ([themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)), `.env` dosyasındaki `TMDB_ANAHTARI` satırına yazın ve sunucuyu yeniden başlatın. "API Key" (v3) ya da "Read Access Token" (v4) ikisi de olur. Anahtar yoksa film/dizi sekmesi açıklamalı bir uyarı gösterir.

## Komutlar

| Komut                 | Ne yapar                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `npm run dev`         | Geliştirme sunucusu (http://localhost:5173)                                              |
| `npm run check`       | Svelte + TypeScript tip denetimi                                                         |
| `npm test`            | Vitest: birim + PGlite üzerinde entegrasyon testleri                                     |
| `npm run build`       | Üretim derlemesi (`build/` klasörü, Node sunucusu)                                       |
| `npm run preview`     | Üretim derlemesini yerelde dener (http://localhost:4173)                                 |
| `npm start`           | Derlenmiş uygulamayı `.env` ile çalıştırır (port 3000; HTTPS vekil arkasında yayın için) |
| `npm run db:generate` | Şema değişikliğinden yeni migration üretir (`drizzle/`)                                  |
| `npm run db:migrate`  | Bekleyen migration'ları uygular                                                          |
| `npm run db:seed`     | Demo hesaplarını ve örnek veriyi (yeniden) yükler                                        |
| `npm run db:studio`   | Drizzle Studio ile veritabanını tarayıcıda gezme                                         |
| `npm run db:yedek`    | `pg_dump` ile `yedekler/` klasörüne yedek alır (en yeni 10 yedek tutulur)                |
| `npm run lint`        | Prettier biçim denetimi + ESLint                                                         |
| `npm run format`      | Tüm dosyaları Prettier ile biçimlendirir                                                 |
| `npm run test:e2e`    | Playwright uçtan uca testleri (derler, `preview` ile açar, gerçek veritabanını kullanır) |

Şema değiştirme akışı: `src/lib/server/db/schema.ts` dosyasını düzenle → `npm run db:generate` → üretilen SQL'i gözden geçir → `npm run db:migrate`.

Testler ayrı bir veritabanı sunucusu gerektirmez: entegrasyon testleri, gerçek migration dosyalarıyla kurulan bellek içi bir PostgreSQL'de (PGlite) çalışır.

### Uçtan uca testler

`npm run test:e2e` üretim derlemesini 4180 portunda açar, her çalıştırmada `e2e-…@iz.test` adlı yeni bir deneme hesabı kurar ve testler bitince bu hesapları (verileriyle birlikte) siler. Yerelde kurulu **Microsoft Edge** kullanılır (tarayıcı indirmeye gerek yok); CI'da Playwright'ın Chromium'u. Erişilebilirlik testleri axe-core ile açık/koyu temada, masaüstü ve mobilde çalışır.

### Yedek ve geri yükleme

`npm run db:yedek` bağlantı bilgisini `.env`'deki `DATABASE_URL`'den alır ve şifreyi komut satırına yazmadan `pg_dump`'a verir. `pg_dump` bulunamazsa PostgreSQL'in `bin` klasörünü `PG_BIN` ortam değişkeniyle belirtin. Geri yüklemek için:

```bash
pg_restore --clean --if-exists --no-owner -h localhost -U iz -d iz_dev yedekler/<dosya>.dump
```

### Sürekli denetim

`.github/workflows/denetim.yml` her gönderimde lint, tip denetimi, testler ve derlemeyi çalıştırır; ardından PostgreSQL 18 servisiyle uçtan uca testleri koşar.

> Üretimde JSON içe aktarma (en çok 5 MB) ve fotoğraf yükleme (en çok 15 MB) için `.env`'e `BODY_SIZE_LIMIT=30M` ekleyin (sesli yanıtlar 25 MB'a kadar) (adapter-node varsayılanı 512K). Yüklenen fotoğraf ve sesler varsayılan olarak `~/.iz/yuklemeler/` altındadır (`YUKLEME_KLASORU` ile değişir); veritabanı yedeğine girmez, ayrıca yedekleyin.
> Sesleri yazıya dökmek için (isteğe bağlı): [whisper.cpp](https://github.com/ggml-org/whisper.cpp/releases) `whisper-bin-x64.zip` → `~/.iz/araclar/whisper/`, model `ggml-large-v3-turbo-q5_0.bin` → `~/.iz/araclar/`, ve `winget install Gyan.FFmpeg`. Araçlar yoksa sesler saklanır, metin elle yazılır.
> PostGIS gerekir: Stack Builder → Spatial Extensions → PostGIS Bundle, ardından `postgres` kullanıcısıyla `CREATE EXTENSION postgis;` (bkz. `db/kurulum.sql`).

> `npm start` kökeni `https://` varsayar (adapter-node); yerelde düz http ile denerken formlar CSRF korumasına takılır. Yerel deneme için `npm run preview` kullanın.

## Neler var?

- **Düğümler:** eser (kitap, film, dizi, müzik, oyun, podcast), kişi, yer, karar, anı; gün/ay/yıl hassasiyetli tarih, isteğe bağlı konum, düğüm başına gizlilik.
- **Bağlar:** "bu beni şuna götürdü" ya da "beni buraya getirdi"; notlu ve tarihli, yerinde düzenlenebilir. "Geldiğin yol" bağları geriye doğru izler.
- **Görünümler:** Liste, **Ağ** (Cytoscape.js; türe göre renk ve şekil, arama, süzgeç, odaklanma) ve **Zaman çizgisi** (yıl/ay grupları, yoğunluk şeridi).
- **İzler:** düğümlerden sıralı, anlatılabilir yollar; sürükle-bırak sıralama, durak notları, bağlardan durak önerileri, hikâye gibi okuma sayfası, herkese açık paylaşım.
- **Eser arama:** Open Library (kitap) ve TMDB (film/dizi).
- **"Seni buraya ne getirdi?":** düğüm eklerken ilk soru; düğüm ve onu getiren (haritadan ya da yeni) tek adımda kaydedilir.
- **Hızlı ekle:** tek satır ("Selin Hoca önerdi → Aylak Adam") çözülür, haritadaki eşleşmeler ve dış kaynak adayları onaya sunulur.
- **İlk iz sihirbazı:** kayıttan hemen sonra üç soruyla ilk iz (eser → onu getiren → götürdüğü yer).
- **Merak listesi:** eser durumu (merak ediyorum / sürüyor / bitti / yarım bıraktım), kimin önerdiğiyle birlikte; "bitti" denince tarih bu ay olarak yazılır.
- **Haritanın karakterleri:** panoda kökler, kapı açanlar, kavşaklar ve bağsız düğümler; düğüm sayfasında "Açtığı kapılar".
- **Kalıcı ağ yerleşimi:** sürüklenen düğümlerin yeri kaydedilir, yeni düğümler komşularının yanına konur.
- **Profil ve paylaşım:** `/@kullanici` herkese açık düğüm ve izleri gösterir; özel içerik (başlıkları dahil) hiç gönderilmez. Herkese açık sayfalar varsayılan olarak arama motorlarına kapalıdır.
- **Hesap kurtarma:** şifre sıfırlama ve e-posta doğrulama bağlantıları (e-posta servisi seçilene kadar geliştirmede terminale yazılır).
- **Arama ve sayfalama:** Türkçe karakterlerden bağımsız, yazım hatasına dayanıklı arama (pg_trgm); uzun listelerde "Daha fazla göster".
- **Paylaşma:** herkese açık izler başka sitelere gömülebilir; profilin RSS akışı var.
- **Ayarlar:** görünen ad ve tanıtım, e-posta ve şifre değiştirme, açık oturumları görme/kapatma, verileri JSON/Markdown olarak indirme ve JSON'dan içe aktarma, hesabı silme.
- **Gruplar ve ortak izler:** davet bağlantısıyla aile/kulüp grupları; `grup` gizliliği; grup üyelerinin birlikte durak eklediği izler.
- **Gölge düğümler ve dolaylı bağlar:** "bağlantı görünsün, içerik gizli"; başkasına gizli ara düğümler tek bir kesikli bağ olarak görünür.
- **Keşif:** aynı eseri ekleyenlerin herkese açık yolları ("buradan sonra nereye gittiler"); "Senin izin beni buraya götürdü" bildirimi (beğeni, takipçi, akış yok).
- **Passkey:** şifresiz giriş; izler için otomatik Open Graph görseli.
- **Düşünce araçları:** bağ türleri (besler / çelişir / çağrıştırır / sentezler), dönemler, etki ölçeği, alıntılar, iz çatallanması, hat haritası (metro görünümü), ağda zaman sürgüsü, klavyeyle gezinme, sürükleyerek bağ kurma, komut paleti (Ctrl+K), açıklamada `[[…]]` ile satır içi bağ.
- **Geri getirenler:** Goodreads, Letterboxd, Spotify ve Kindle'dan içe aktarma; bağ avı soruları; günün sorusu; bugün geçmişte; yazarı kişi olarak ekleme ve Wikidata zenginleştirmesi; İz Yıllığı ve paylaşılabilir kartı.
- **Harita:** konumlu düğümler OpenStreetMap üzerinde (MapLibre); konumu haritaya tıklayarak seçme; PostGIS ile "Yakınındakiler".
- **Bir zamanlar burası:** yer ve anı düğümlerine eski ve yeni fotoğraf; kaydırmalı önce/sonra karşılaştırması; hak beyanı; konum ve cihaz bilgileri (EXIF) yüklenirken silinir.
- **Aile hafızası:** sesli anı kaydı ve bu bilgisayarda Türkçe yazıya dökme (whisper.cpp); anlatılandan kişi/yer/yıl önerileri; yakınlara hesapsız yanıtlanan sorular (yazılı ya da sesli, WhatsApp ile gönderilir); aile arşivi ve yazdırılabilir A5 kitap; zaman kapsülü; dijital vasiyet.
- **Karar defteri:** karar düğümüne gerekçe, beklenti ve % güven; zamanı gelince sonucu sorar; kalibrasyon grafiği ve Brier puanı (`/kararlar`, yalnızca sana açık).
- **Bildirimler ve "Geri al":** bağ kaldırma, durak çıkarma, silme ve yeniden yerleştirme geri alınabilir; silinenler 30 gün çöp kutusunda bekler.

## Klasör yapısı

```
src/
  env.ts                    Ortam değişkenleri tanımı ($app/env/private)
  hooks.server.ts           CSRF, oturum, tema, güvenlik başlıkları
  lib/
    sabitler.ts, tarih.ts   Ortak sabitler, Türkçe etiketler, tarih çözme/yazma
    metin.ts, zaman.ts      Türkçe arama sadeleştirme, zaman çizgisi gruplama
    analiz.ts               Haritanın karakterleri (kökler, kapı açanlar, kavşaklar)
    hizliEkle.ts            Tek satırlık girdiyi çözen Türkçe ayrıştırıcı
    yerlesim.ts             Ağda yeni düğümleri kayıtlı komşularının yanına yerleştirme
    bildirim.svelte.ts      Bildirim baloncukları ve "Geri al"
    bilesenler/             Svelte bileşenleri (AgGorunumu, DugumSecici, SayfaBasligi, TurSekli…)
    stiller/tasarim.css     Tasarım sistemi (renk, yazı, aralık değişkenleri)
    server/                 Yalnızca sunucuda çalışan kod
      db/                   Drizzle bağlantısı ve şema
      oturum.ts, sifre.ts   Oturum ve Argon2
      hizSiniri.ts          Bellek içi hız sınırlayıcı
      dogrulama.ts          Form doğrulama (Türkçe mesajlar)
      dugumler.ts           Düğüm/bağ veri erişimi ve yetki kuralları
      izler.ts              İz ve durak veri erişimi (sıralama, gizli duraklar)
      eserArama.ts          Open Library ve TMDB
      copKutusu.ts          Çöp kutusu (30 gün), geri yükleme
      test/pglite.ts        Entegrasyon testleri için bellek içi PostgreSQL
  routes/                   /, /kayit, /giris, /basla, /pano, /hizli, /dugumler (+ /ag, /zaman),
                            /izler, /ara, /cop-kutusu, /api/ag/konumlar
e2e/                        Playwright uçtan uca ve erişilebilirlik testleri
drizzle/                    Migration dosyaları
scripts/seed.ts             Örnek veri
scripts/yedek.ts            pg_dump yedeği
db/kurulum.sql              Rol ve veritabanı oluşturma
```
