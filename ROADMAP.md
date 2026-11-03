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

## ⏳ Aşama 2 — Ağ & zaman çizgisi görünümleri, iz oluşturma (ilk kullanılabilir ürün)

- [ ] Ağ görünümü (Cytoscape.js ya da Sigma.js; karar bu aşamada): yakınlaştırma, türe göre renk, düğüme tıklayınca ayrıntı
- [ ] Zaman çizgisi görünümü: tarih hassasiyetini (gün/ay/yıl) doğru gösteren eksen
- [ ] İz oluşturma: düğümleri sıraya dizme, her adıma anlatı notu, sürükle-bırak sıralama
- [ ] İz okuma sayfası (hikâye gibi adım adım)
- [ ] Bağ kurarken aranabilir hedef seçici (çok düğümde `<select>` yetmez)
- [ ] Düğüm/bağ düzenlemede bağ notunu ve tarihini düzenleme
- [ ] Veritabanına bağlı entegrasyon testleri (ayrı test veritabanı)

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
- [ ] Yayına alma: barındırma seçimi, yedekleme, izleme; hız sınırını PostgreSQL/Redis'e taşıma
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
