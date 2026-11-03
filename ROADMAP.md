# İz — Yol Haritası

> İnsanlar ne yaşadığını kaydeder; İz neyin seni neye götürdüğünü kaydeder.

Durum işaretleri: ✅ tamamlandı · 🚧 sürüyor · ⏳ sırada

---

## ✅ Aşama 1 — İskelet, hesap, düğüm/bağ modeli, eser arama

- [x] Git deposu, README, ROADMAP, CLAUDE.md, .gitignore
- [x] SvelteKit 3 + Svelte 5 + TypeScript iskeleti (sürümler sabit, adapter-node)
- [x] Tasarım sistemi: CSS değişkenleri, `light-dark()` ile açık/koyu tema (çerezde saklanır, sayfa yanlış temada parlamaz), mobil öncelikli yerleşim, mobil alt menü, Inter + Fraunces yazı tipleri (npm'den, Türkçe karakterli)
- [x] PostgreSQL + Drizzle: `kullanicilar`, `oturumlar`, `dugumler`, `baglar`, `izler`, `iz_adimlari`; enum'lar, CHECK kısıtları, migration ve örnek veri
- [x] Hesap: kayıt / giriş / çıkış, Argon2id şifre özeti, httpOnly + SameSite çerezli oturum (veritabanında jetonun SHA-256 özeti), kendiliğinden uzayan 30 günlük oturum
- [x] Güvenlik: tüm POST'larda Origin denetimi (CSRF), giriş/kayıt hız sınırı, CSP, güvenlik başlıkları, açık yönlendirme koruması, zamanlamayla hesap varlığı sızdırmayan giriş
- [x] Düğüm CRUD (listeleme, türe göre süzme, arama, ekleme, düzenleme, silme) ve "bu beni şuna götürdü" bağları (notlu, tarihli)
- [x] Yetki: başkasının özel düğümü 404; herkese açık düğüm salt okunur; yazma işlemleri yalnızca sahibine
- [x] "Geldiğin yol": bağları geriye doğru izleyen özyinelemeli sorgu (döngüye dayanıklı)
- [x] Eser arama: Open Library (kitap), TMDB (film/dizi; anahtar yoksa nazikçe kapalı), sonuçtan tek tıkla düğüm + isteğe bağlı bağ
- [x] Ana sayfa (tanıtım, slogan) ve pano (sayılar, son düğümler, son bağlar)
- [x] Vitest birim testleri (32 test), `npm run check` ve `npm run build` hatasız
- [x] Tarayıcıda uçtan uca deneme, XSS ve yetkisiz erişim denemeleri; açık/koyu tema, masaüstü/mobil ekran görüntüleri

## ✅ Aşama 2 — Ağ & zaman çizgisi görünümleri, iz oluşturma (ilk kullanılabilir ürün)

- [x] Ağ görünümü — **Cytoscape.js** (+ fcose yerleşimi) seçildi: yakınlaştırma/kaydırma, türe göre renk **ve şekil**, bağ sayısına göre boyut, düğüme dokununca komşuluğu vurgulayan yan panel, ağda arama, tür süzgeci, klavye kısayolları, tema değişince yeniden boyama, `?odak=` ile düğüme odaklanma, mobilde alttan açılan panel
- [x] Zaman çizgisi: gün/ay/yıl hassasiyetine göre gruplanan dikey eksen, yapışkan yıl başlıkları, yıllara göre yoğunluk şeridi (boş yıllar dahil), eskiden yeniye / yeniden eskiye sıralama, tarihsiz düğümler için ayrı bölüm
- [x] İz oluşturma ve düzenleme: aranabilir seçiciyle durak ekleme, son duraktan giden bağlara göre durak önerileri, dokunmatik uyumlu sürükle-bırak sıralama + klavye/JavaScript'siz ok düğmeleri, her durağa anlatı notu, iz silme
- [x] İz okuma sayfası: numaralı duraklar, anlatı notları, duraklar arasındaki bağ notu ("nasıl götürdü"), eksik bağı tek tıkla kurma, herkese açık izde özel durakların "gizli durak" olarak gösterilmesi, bağlantıyı kopyalama
- [x] Aranabilir düğüm seçici (ARIA combobox, Türkçe karakterlere duyarsız arama; JavaScript yoksa `<select>`)
- [x] Bağ notunu ve tarihini yerinde düzenleme; düğüm sayfasından iki yönde bağ kurma ("götürdü" / "getirdi")
- [x] Düğüm sayfası: "Ağda göster", "Buradan iz başlat", geçtiği izler ve "İze ekle"
- [x] Tasarım sistemi genişletildi: tür şekilleri (eser ◼, kişi ●, yer ▲, karar ◆, anı ⬟), ortak sayfa başlığı, görünüm seçici, boş durum çizimleri, mobilde 5 sekmeli alt menü ve ortada "Ekle" düğmesi, pano görünüm kartları ve iz önizlemeleri
- [x] Entegrasyon testleri: **PGlite** (bellek içi PostgreSQL) üzerinde gerçek migration'larla 16 test; toplam 66 test
- [x] Zengin örnek veri: 1998–2023'e yayılmış 19 düğüm, 18 bağ, notlu 2 iz

## ⏳ Aşama 3 — Paylaşılan izler, profil, keşif yolu önerileri

- [ ] Aile / grup kavramı (gruplar, üyelik, davet); "grup" gizlilik düzeyinin gerçekten çalışması
- [ ] Herkese açık profil sayfası (`/@kullanici`)
- [ ] Paylaşılabilir iz bağlantıları, sosyal medya önizlemesi
- [ ] Keşif yolu önerileri: puan değil, başkalarının gerçek yolları ("X'ten Y'ye gidenler Z'ye de gitti")
- [ ] pg_trgm ile bulanık arama (Türkçe büyük/küçük harf duyarlılığıyla)

## ⏳ Aşama 4 — Karar Defteri

- [ ] Karar düğümüne gerekçe, beklenti, % güven alanları
- [ ] "Sonucu ne zaman soralım?" tarihi; zamanı gelince hatırlatma ve sonuç kaydı
- [ ] Kalibrasyon grafiği (söylenen güven ↔ gerçekleşen oran)

## ⏳ Aşama 5 — Harita + Bir Zamanlar Burası

- [ ] MapLibre + OpenStreetMap harita görünümü; konumu haritadan seçme
- [ ] PostGIS'e geçiş (konum sütunları → geography)
- [ ] Eski/yeni fotoğraf yükleme, kaydırmalı önce/sonra karşılaştırması

## ⏳ Aşama 6 — Aile Hafızası

- [ ] Sesli anı kaydı ve Türkçe yazıya dökme
- [ ] Claude ile kişi / yer / yıl varlık çıkarma → düğüm önerileri
- [ ] Yalnızca aileye açık arşiv; basılı kitap (PDF) çıktısı

## ⏳ Aşama 7 — Çeviri Masası

- [ ] Aynı paragrafın farklı Türkçe çevirileri yan yana
- [ ] Oylama, yorum; çeviriyi eser düğümüne bağlama

## ⏳ Aşama 8 — PWA, İngilizce, yayına alma

- [ ] PWA (çevrimdışı okuma, ana ekrana ekleme)
- [ ] İngilizce arayüz (i18n)
- [ ] Yayına alma: barındırma seçimi, HTTPS arkasında `adapter-node` (gerekirse `paths.origin`), yedekleme, izleme; hız sınırını PostgreSQL/Redis'e taşıma
- [ ] Gelir getiren bir yayına geçilirse TMDB'den ticari kullanım lisansı alma (şu anki anahtar yalnızca kişisel kullanım içindir)
- [ ] Hesap silme, veri dışa aktarma (KVKK)

---

## Yeni fikirler

- Müzik için MusicBrainz, oyun için IGDB/RAWG, podcast için iTunes Search araması
- Kitap için Türkçe kaynak (ör. ISBN üzerinden) — Open Library'de Türkçe baskı bilgisi zayıf
- Bağ türleri ("önerdi", "alıntıladı", "aynı yerde geçiyor") — şimdilik serbest not
- "Bu yıl beni en çok nereye götüren şey?" türünden yıllık özet
- Düğüm birleştirme (aynı kişiyi iki kez eklediysen)
- Bağ eklerken Claude'dan "nasıl götürdü?" notu için öneri
- E-posta doğrulama ve şifre sıfırlama (e-posta gönderimi gerektiriyor)
- "Geldiğin yol"dan tek tıkla iz oluşturma
- Ağda düğüm konumlarını kaydetme (her açılışta aynı yerleşim) ve "ağaç" yerleşimi seçeneği
- Çok büyük ağlar (binlerce düğüm) için Sigma.js/WebGL'e geçiş eşiği
- Zaman çizgisinde yakınlaştırılabilir yatay eksen (masaüstü için ikinci düzen)
- Herkese açık izler için sosyal önizleme görseli (Open Graph)
