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

Şema değiştirme akışı: `src/lib/server/db/schema.ts` dosyasını düzenle → `npm run db:generate` → üretilen SQL'i gözden geçir → `npm run db:migrate`.

Testler ayrı bir veritabanı sunucusu gerektirmez: entegrasyon testleri, gerçek migration dosyalarıyla kurulan bellek içi bir PostgreSQL'de (PGlite) çalışır.

> `npm start` kökeni `https://` varsayar (adapter-node); yerelde düz http ile denerken formlar CSRF korumasına takılır. Yerel deneme için `npm run preview` kullanın.

## Neler var?

- **Düğümler:** eser (kitap, film, dizi, müzik, oyun, podcast), kişi, yer, karar, anı; gün/ay/yıl hassasiyetli tarih, isteğe bağlı konum, düğüm başına gizlilik.
- **Bağlar:** "bu beni şuna götürdü" ya da "beni buraya getirdi"; notlu ve tarihli, yerinde düzenlenebilir. "Geldiğin yol" bağları geriye doğru izler.
- **Görünümler:** Liste, **Ağ** (Cytoscape.js; türe göre renk ve şekil, arama, süzgeç, odaklanma) ve **Zaman çizgisi** (yıl/ay grupları, yoğunluk şeridi).
- **İzler:** düğümlerden sıralı, anlatılabilir yollar; sürükle-bırak sıralama, durak notları, bağlardan durak önerileri, hikâye gibi okuma sayfası, herkese açık paylaşım.
- **Eser arama:** Open Library (kitap) ve TMDB (film/dizi).

## Klasör yapısı

```
src/
  env.ts                    Ortam değişkenleri tanımı ($app/env/private)
  hooks.server.ts           CSRF, oturum, tema, güvenlik başlıkları
  lib/
    sabitler.ts, tarih.ts   Ortak sabitler, Türkçe etiketler, tarih çözme/yazma
    metin.ts, zaman.ts      Türkçe arama sadeleştirme, zaman çizgisi gruplama
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
      test/pglite.ts        Entegrasyon testleri için bellek içi PostgreSQL
  routes/                   /, /kayit, /giris, /pano, /dugumler (+ /ag, /zaman), /izler, /ara
drizzle/                    Migration dosyaları
scripts/seed.ts             Örnek veri
db/kurulum.sql              Rol ve veritabanı oluşturma
```
