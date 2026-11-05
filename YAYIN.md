# İz — yayına alma kontrol listesi

Uygulama yayına hazırdır; bu belge, barındırma seçildiğinde izlenecek adımları toplar. Henüz bir
sunucuya kurulmadı (kullanıcı kararı, Kasım 2026). Docker kullanılmıyor; düz Node.js + PostgreSQL.

## Gerekenler

- **Node.js 26 LTS**, **PostgreSQL 18 + PostGIS 3.6** (ICU `tr-TR` sıralaması; bkz. `db/kurulum.sql`)
- HTTPS sonlandıran bir ters vekil (Caddy ya da nginx). `adapter-node` vekil başlığı yoksa protokolü
  `https` varsayar; uygulama doğrudan HTTP ile sunulmamalı.
- İsteğe bağlı: sesleri yazıya dökmek için `whisper-cli` + `ggml-large-v3-turbo-q5_0.bin` + `ffmpeg`
  (README'de). Yoksa sesler saklanır, metin elle yazılır.

## Adımlar

1. Veritabanı: `db/kurulum.sql` (rol, veritabanı, `CREATE EXTENSION postgis` süper kullanıcıyla).
2. `.env` (`.env.example`'dan): `DATABASE_URL`, `BODY_SIZE_LIMIT=30M`, `VERI_SORUMLUSU`,
   `ILETISIM_EPOSTA`, `YUKLEME_KLASORU` (kalıcı disk), gerekiyorsa `TMDB_ANAHTARI`, `IZ_ARACLAR`.
3. `npm ci && npm run build && npm run db:migrate`
4. Çalıştırma: `node build` (systemd hizmeti önerilir; `PORT`, `HOST` ortam değişkenleri).
5. Vekil: alan adı → `localhost:PORT`; `X-Forwarded-Proto` ve `X-Forwarded-For` iletilmeli
   (hız sınırları istemci IP'sine göre).
6. Sağlık denetimi: `GET /saglik` → `{"durum":"iyi"}` (veritabanı yoksa 503).
7. Yedek: `npm run db:yedek` (zamanlanmış görev) **ve** `YUKLEME_KLASORU` klasörünün ayrı yedeği
   (fotoğraf ve sesler veritabanı yedeğine girmez).

## Yayından önce kararlar

- **Barındırma ve alan adı** (kullanıcının kararı).
- **E-posta servisi** (kullanıcının kararı): şifre sıfırlama ve e-posta doğrulama için. Seçilene kadar
  üretimde e-posta gönderilmez (`src/lib/server/posta.ts`).
- **KVKK metni** (`/gizlilik`, `/cerezler`): genel bir taslak. Yayından önce bir hukukçuya gözden
  geçirtilmeli; veri sorumlusu `VERI_SORUMLUSU` ile yazılır.
- **TMDB:** anahtar kişisel kullanım lisanslı; gelir getiren yayında ticari lisans gerekir.
- **Harita karoları:** OpenFreeMap ücretsiz ve anahtarsız; yoğun kullanımda kendi karo sunucusu ya da
  ücretli sağlayıcı düşünülür (`src/lib/haritaYukle.ts → KARO_KOKENI` ve CSP birlikte değişir).

## Yayından sonra denetim

- `/saglik`, giriş/çıkış, fotoğraf ve ses yükleme (gövde sınırı), PWA kurulumu (manifest + service worker
  yalnızca HTTPS'te çalışır), paylaş menüsünden hızlı ekleme (Android).
- Tarayıcı geliştirici araçlarında CSP ihlali olmamalı.
