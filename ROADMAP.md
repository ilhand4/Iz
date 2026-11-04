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

## ✅ Aşama 2.5 — Çekirdek deneyim

> Amaç: tek bir kullanıcının İz'i gerçekten sevmesi. Bu tür ürünler genellikle üç sebeple ölür:
> kaydetmek zahmetlidir, ilk gün harita boştur, geri gelmek için neden yoktur. Bu aşama üçünü de hedefler.

- [x] **Kalıcı ağ konumları:** ilk açılışta yerleşim hesaplanıp kaydedilir; sonra harita her açılışta aynı kalır. Sürüklenen düğümün yeri kaydedilir, yeni düğümler kayıtlı komşularının yanına konur. "Yeniden yerleştir" geri alınabilir (`ag_konumlari` tablosu, `PUT /api/ag/konumlar`)
- [x] **"Seni buraya ne getirdi?"** düğüm ekleme formunun ilk sorusu (haritadan seç, yeni ekle ya da "bilmiyorum"); düğüm ve gelen bağ tek işlemde. Yeni eklenen düğümde gelen bağ yoksa soru kartı öne çıkar
- [x] **Hızlı ekle:** panoda ve ekleme sayfasında tek satır ("Selin Hoca önerdi → Aylak Adam", "Babylon Berlin'i izlerken Berlin Alexanderplatz'ı merak ettim") → Türkçe ayrıştırıcı, haritadaki eşleşmeler, Open Library/TMDB adayları, onay ekranı
- [x] **İlk iz sihirbazı** (`/basla`, kayıttan sonra): eser → onu getiren → götürdüğü yer; canlı önizleme; ilk iz sayfasında karşılama kartı
- [x] **Açtığı kapılar:** "Geldiğin yol"un ileri yönlüsü; düğüm başlığında "N şeyden geliniyor · N şeye kapı açtı"
- [x] **Haritanın karakterleri:** panoda kökler, kapı açanlar, kavşaklar (arasındalık) ve bağsız düğümler ("Seni buraya ne getirdi?" bağlantısıyla)
- [x] **Merak listesi:** eser durumu (merak ediyorum / sürüyor / bitti / yarım bıraktım; esere göre "Okudum", "İzledim"…), düğüm sayfasında tek tıkla değişir, "bitti"de tarih bu ay olur; panoda kimin önerdiğiyle birlikte, listede süzgeç, kartta ve ağda kesik kenar
- [x] **Geri bildirim:** bildirim baloncukları ve "Geri al" (bağ kaldırma, durak çıkarma, silme, yeniden yerleştirme); 30 günlük çöp kutusu (`/cop-kutusu`: geri yükle, kalıcı sil, boşalt)
- [x] Kişi düğümü herkese açık yapılırken üçüncü kişi mahremiyeti uyarısı (JavaScript'siz, CSS `:has()`)
- [x] GitHub Actions: lint + check + test + build; ardından PostgreSQL 18 servisiyle uçtan uca testler
- [x] Yedek betiği: `npm run db:yedek` (pg_dump, son 10 yedek; şifre komut satırına yazılmaz)
- [x] Playwright ile uçtan uca testler (sihirbaz, hızlı ekle, durum, çöp kutusu ve geri al, bağ geri alma, ağ konumları, pano) ve axe erişilebilirlik testleri (açık/koyu, masaüstü/mobil); Prettier ve ESLint
- [x] Testler: 109 birim/entegrasyon testi (PGlite), 37 uçtan uca test (tamamı geçiyor); erişilebilirlik testleri kontrast sorunlarını yakaladı (`--metin-silik`, `--tur-eser` AA düzeyine çekildi)

> Aşama 3, kullanıcının paylaştığı mimari değerlendirmeyle ve sonraki ürün önerileriyle (Kasım 2026) genişletildi; 3a, 3b ve 3c olarak bölündü.
> Değerlendirmedeki örnek kodlar **olduğu gibi kullanılmayacak**: bizim şemada kimlikler `uuid`,
> herkese açık düzeyin adı `herkes`; `baglar` ve `izler` tablolarını yeniden tanımlamak mevcut verileri
> siler. Hepsi mevcut tablolara **ek sütun/tablo** olarak, veri kaybı olmadan uyarlanacak.

## ⏳ Aşama 3a — Paylaşım, hesap ve keşif

- [ ] Herkese açık profil sayfası (`/@kullanici`): açık düğümler, izler ve açık ağ
- [ ] Aile / grup kavramı (gruplar, üyelik, davet); "grup" gizlilik düzeyinin gerçekten çalışması
- [ ] **Dolaylı bağlar ve gölge düğümler:** önerilen yol, gizli düğümü hiç göstermeden iki açık düğüm arasına tek bir kesikli "dolaylı bağ" çizmek (gizli düğümün türü ve sayısı da sızmaz). Gölge düğüm ise yeni, isteğe bağlı bir gizlilik düzeyi "Bağlantı görünsün, içerik gizli". Varsayılan değil (varsayılan `ozel` hiç görünmez kalır). Başkasının gördüğü ağda başlık/metin yerine yalnızca tür şekli; gerçek kimlik yerine istek başına anonim kimlik. Buzlu cam / kesikli kontur görünümü
- [ ] **Kanonik eser çekirdeği:** kişisel düğümlerden bağımsız `kanonik_eserler` tablosu; önce Wikidata kimliği (kitap, film, kişi ve yer için ortak, ücretsiz omurga) ve dış kimlikler (Open Library / TMDB), yoksa `metin.ts` normalleştirmesiyle başlık + yapımcı + türden deterministik parmak izi. `dugumler.kanonik_eser_id` bağlantısı. Seçilen eserlerin verisi burada saklanır (dış bağlantı kırılırsa yedek)
- [ ] **Kör kesişim:** aynı eseri ekleyen başkalarının yalnızca herkese açık izleri düğüm sayfasında önerilir; özel notlar hiç kullanılmaz
- [ ] Keşif yolu önerileri: puan değil, başkalarının gerçek yolları ("X'ten Y'ye gidenler Z'ye de gitti")
- [ ] Paylaşılabilir iz bağlantıları ve tür şekilleriyle otomatik Open Graph görseli (PNG)
- [ ] Hesap ayarları: görünen ad, şifre değiştirme, e-posta değiştirme, hesap silme
- [ ] Şifre sıfırlama ve e-posta doğrulama — **e-posta servisini kullanıcı seçecek**; seçilene kadar geliştirmede bağlantı terminale yazılır
- [ ] Veri dışa aktarma (JSON + Markdown) ve JSON'dan içe aktarma (KVKK için de gerekli)
- [ ] pg_trgm ile yazım hatasına dayanıklı arama (düğümler, izler; Türkçe sadeleştirmeyle birlikte)
- [ ] İmleç tabanlı sayfalama: `/dugumler` (şu an 200'de kesiliyor) ve `/izler` (100)
- [ ] Eser araması için veritabanında önbellek (UNLOGGED tablo, ~24 saat) — dış servis kotasını korur
- [ ] Düğüm sayfasındaki "Geçtiği izler" listesi `IzKarti` önizlemesine dönüşecek (bölümün kendisi zaten var)
- [ ] **"Senin izin beni buraya götürdü":** başkasının açık düğümünden kendi düğümüne bağ; sahibine bildirim gider. Beğeni ve takipçi sayısı yok, sonsuz akış yok
- [ ] Ortak izler (çiftler, aileler, kitap kulüpleri; öğretmenler için okuma izleri)
- [ ] İz gömme (blog) ve herkese açık profil için RSS
- [ ] Oturum yönetimi (açık oturumları gör / kapat) ve passkey ile şifresiz giriş
- [ ] Herkese açık sayfalar varsayılan olarak arama motorlarına kapalı (noindex); isteyen açar

## ⏳ Aşama 3b — Düşünce araçları

- [ ] Bağ katmanı `baglar.ts` olarak ayrılacak (bugün `dugumler.ts` içinde)
- [ ] **Bağ türü (anlamsal gerilim):** besler / çelişir / çağrıştırır / sentezler; isteğe bağlı, varsayılan "belirtilmemiş" (mevcut bağlar yanlış etiketlenmesin). Ağda renk ve çizgi biçemiyle gösterilir, fcose yay uzunluğu ve esnekliği türe göre değişir; lejant
- [ ] **Zaman sürgüsü (ağın zamanla büyümesi):** düğümün yaşandığı tarihe göre (isteğe bağlı: İz'e eklenme tarihi). Ağ bir kez yerleşir, düğümler sırayla belirir (her sürgü hareketinde yeniden yerleşim titreme yaratacağı için yapılmaz); oynat/duraklat; tarihsiz düğümler başta
- [ ] **İz çatallanması:** `izler.ata_iz_id` + ayrılma durağı; okuma sayfasında o duraktan ayrılan alternatif izler. Önce kendi izlerinden; başkasının izinden çatallanma kanonik eser çekirdeğinden sonra (başkasının düğümleri senin ağında yok)
- [ ] JSON uç noktaları (`+server.ts`): düğüm formunda yazarken eser araması, komut paleti araması, ağda bağ kurma
- [ ] Ağda iki düğümü sürükleyerek bağ kurma
- [ ] Ağda klavyeyle gezinme: yön tuşlarıyla komşu düğümlere geçiş
- [ ] Ağ görünümünün adrese yazılması: görünüm, tür süzgeçleri, odak (paylaşılabilir bağlantı)
- [ ] Aşamalı ağ sorgusu: düğüm sayısı eşiği (ör. 500) aşılınca odak çevresi özyinelemeli sorguyla, belirli derinlikte yüklenir; altında tüm ağ
- [ ] Komut paleti (Ctrl+K): her sayfadan kendi düğüm ve izlerinde arama, hızlı eylemler
- [ ] Satır içi bağ: açıklamada `[[` yazınca düğüm seçici açılır; kaydetmeden önce kurulacak bağlar önizlenir
- [ ] Kalıcı hız sınırı: PostgreSQL UNLOGGED tablo (Redis gerekmez)
- [ ] `.vscode/settings.json`: Python ayarı yerine Svelte/TypeScript çalışma alanı ayarları
- [ ] Bağ türü süzgeci ("yalnızca çelişkileri göster"); renk ve çizgi biçemi asıl, fizik ayarı ikincil
- [ ] **Hat haritası (metro görünümü):** izler hat, düğümler durak, birden fazla izin geçtiği düğümler aktarma istasyonu; yatay eksen zaman. Zaman sürgüsüyle birlikte ürünün vitrini
- [ ] **Dönemler (hayat bölümleri):** ad + başlangıç/bitiş ("Kadıköy yılları 2004–2011"); zaman çizgisinde renkli bantlar, ağda kümeler
- [ ] **Etki ölçeği (puan değil):** "beni değiştirdi / iz bıraktı / geçti gitti"; ağda düğüm büyüklüğü etkiye göre gösterilebilir
- [ ] **Alıntılar:** eserlere alıntı ekleme; bağ notu bir alıntıya işaret edebilir

## ⏳ Aşama 3c — İçe aktarma ve geri getirenler

- [ ] İçe aktarma: Goodreads ve Letterboxd dışa aktarma dosyaları, Spotify dinleme geçmişi, Kindle alıntıları
- [ ] **Bağ avı:** içe aktarılan düğümler için çift çift sorular ("Kuyucaklı Yusuf'a Kürk Mantolu Madonna'dan mı geldin?")
- [ ] Otomatik zenginleştirme: kitap eklenince yazarını kişi düğümü olarak önerme; Wikidata ile kişi ve yer bilgisi
- [ ] **Günün sorusu:** haftada birkaç kez tek soru ("Bunu nereden duymuştun?"); haritayı geriye doğru büyütür
- [ ] Bugün geçmişte: günü bilinen düğümlerin yıldönümleri
- [ ] **İz Yıllığı:** yıl sonu özeti (seni en çok nereye götüren şey, en uzun zincir, yeni kümeler) ve paylaşılabilir kart

## ⏳ Aşama 4 — Karar Defteri

- [ ] Karar düğümüne gerekçe, beklenti, % güven alanları
- [ ] "Sonucu ne zaman soralım?" tarihi; zamanı gelince hatırlatma ve sonuç kaydı
- [ ] Kalibrasyon grafiği (söylenen güven ↔ gerçekleşen oran)

## ⏳ Aşama 5 — Harita + Bir Zamanlar Burası

- [ ] MapLibre + OpenStreetMap harita görünümü; konumu haritadan seçme
- [ ] PostGIS'e geçiş (konum sütunları → geography)
- [ ] Eski/yeni fotoğraf yükleme, kaydırmalı önce/sonra karşılaştırması
- [ ] Yüklenen eski fotoğraflar için hak beyanı

## ⏳ Aşama 6 — Aile Hafızası

- [ ] Sesli anı kaydı ve Türkçe yazıya dökme
- [ ] Claude ile kişi / yer / yıl varlık çıkarma → düğüm önerileri
- [ ] Yalnızca aileye açık arşiv; basılı kitap (PDF) çıktısı
- [ ] StoryWorth modeli: yakınlara haftada bir soru; yanıt uygulama hesabı olmadan, sesli mesajla da verilebilir; yıl sonunda kitap
- [ ] KVKK'nın "özel nitelikli" saydığı bilgiler (sağlık, din vb.) için tasarım; ses tanıma bileşeni seçimi (maliyet ve gizlilik kararı)
- [ ] Zaman kapsülü ("2035'te aç") ve dijital vasiyet (arşivi bir yakına devretme)

## ⏳ Aşama 7 — Çeviri Masası

- [ ] Aynı paragrafın farklı Türkçe çevirileri yan yana
- [ ] Oylama, yorum; çeviriyi eser düğümüne bağlama
- [ ] **Telif riski:** telifli çevirilerden sistemli paragraf karşılaştırması FSEK'teki alıntı serbestisinin sınırlarını aşabilir; kısa alıntı, telif süresi dolmuş eserler ya da yayınevi izniyle sınırlandırılmalı

## ⏳ Aşama 8 — PWA, İngilizce, yayına alma

- [ ] PWA (çevrimdışı okuma, ana ekrana ekleme)
- [ ] Telefonun paylaş menüsünden İz'e ekleme (PWA paylaşım hedefi; Android'de çalışır, iPhone desteği sınırlı)
- [ ] İngilizce arayüz (i18n)
- [ ] Yayına alma: barındırma seçimi, HTTPS arkasında `adapter-node` (gerekirse `paths.origin`), yedekleme, izleme
- [ ] Gelir getiren bir yayına geçilirse TMDB'den ticari kullanım lisansı alma (şu anki anahtar yalnızca kişisel kullanım içindir)
- [ ] KVKK metinleri (aydınlatma, çerez); hesap silme ve dışa aktarma Aşama 3a'da

---

## İlkeler (yapmayacaklarımız)

- Seri (streak) baskısı, puan ve rozet koleksiyonu yok: düşünmeye dayalı bir ürüne ters
- Beğeni ve takipçi sayısı, sonsuz akış yok
- Kişisel metinler yalnızca açık onayla yapay zekâya gönderilir; Claude özellikleri açılıp kapatılabilir
- Varsayılan her zaman en gizli seçenektir
- Beş modül beş ayrı ürün riski taşır: çekirdek (Kültür İzi + İzler) gerçekten sevilmeden yeni modüle geçilmez

## Yeni fikirler

- Müzik için MusicBrainz, oyun için IGDB/RAWG, podcast için iTunes Search araması
- Kitap için Türkçe kaynak (ör. ISBN üzerinden) — Open Library'de Türkçe baskı bilgisi zayıf
- "Bu yıl beni en çok nereye götüren şey?" türünden yıllık özet
- Düğüm birleştirme (aynı kişiyi iki kez eklediysen)
- Bağ eklerken Claude'dan "nasıl götürdü?" notu için öneri
- "Geldiğin yol"dan tek tıkla iz oluşturma
- Ağda düğüm konumlarını kaydetme (her açılışta aynı yerleşim) ve "ağaç" yerleşimi seçeneği
- Çok büyük ağlar (binlerce düğüm) için Sigma.js/WebGL'e geçiş eşiği
- Zaman çizgisinde yakınlaştırılabilir yatay eksen (masaüstü için ikinci düzen)
- Bağ gücü / ağırlığı (bağ türünden sonra, gerçekten gerekirse)
