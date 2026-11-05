<script lang="ts">
	import { enhance } from '$app/forms';
	import Alan from '#lib/bilesenler/Alan.svelte';
	import GecisAnahtari from '#lib/bilesenler/GecisAnahtari.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import { gunYaz } from '#lib/tarih.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const hesap = $derived(data.hesap);

	type FormBolumu = { hatalar: Record<string, string>; degerler?: Record<string, string> };
	const bolum = (ad: string) =>
		((form as Record<string, unknown> | null)?.[ad] ?? null) as FormBolumu | null;
	const profil = $derived(bolum('profil'));
	const eposta = $derived(bolum('eposta'));
	const sifre = $derived(bolum('sifre'));
	const sil = $derived(bolum('sil'));
	const ice = $derived(bolum('ice'));

	const BOLUMLER = [
		['profil', 'Profil'],
		['eposta', 'E-posta'],
		['sifre', 'Şifre'],
		['gecis', 'Geçiş anahtarları'],
		['oturumlar', 'Oturumlar'],
		['veriler', 'Verilerin'],
		['sil', 'Hesabı sil']
	] as const;

	function zamanYaz(t: Date | string) {
		return new Intl.DateTimeFormat('tr-TR', {
			day: 'numeric',
			month: 'long',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'Europe/Istanbul'
		}).format(new Date(t));
	}

	// Hata dönünce form alanları temizlenmesin; başarıda şifre alanları boşalsın
	const koru = () => {
		return async ({
			update,
			result
		}: {
			update: (o?: { reset?: boolean }) => Promise<void>;
			result: { type: string };
		}) => {
			await update({ reset: result.type === 'success' });
		};
	};
</script>

<svelte:head><title>Ayarlar · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="Hesap"
		baslik="Ayarlar"
		aciklama="Profilin, giriş bilgilerin, açık oturumların ve verilerin."
	/>

	<div class="duzen">
		<nav class="icindekiler" aria-label="Ayar bölümleri">
			<ul>
				{#each BOLUMLER as [id, ad] (id)}
					<li><a href="#{id}">{ad}</a></li>
				{/each}
			</ul>
		</nav>

		<div class="bolumler">
			<section id="profil" class="kart bolum" aria-labelledby="profil-baslik">
				<h2 id="profil-baslik">Profil</h2>
				<p class="kucuk soluk">
					Herkese açık profilin:
					<a href="/@{hesap.kullaniciAdi}">@{hesap.kullaniciAdi}</a>. Profilde yalnızca “herkese
					açık” düğüm ve izlerin görünür.
				</p>
				<form method="POST" action="?/profil" class="yigin" use:enhance={koru}>
					<Alan id="ad" etiket="Görünen ad" hata={profil?.hatalar.ad}>
						<input
							id="ad"
							name="ad"
							maxlength="80"
							required
							autocomplete="name"
							value={profil?.degerler?.ad ?? hesap.ad}
							aria-invalid={!!profil?.hatalar.ad}
						/>
					</Alan>
					<Alan
						id="hakkinda"
						etiket="Kısa tanıtım"
						hata={profil?.hatalar.hakkinda}
						ipucu="İsteğe bağlı, en fazla 300 karakter. Profilinde görünür."
					>
						<textarea id="hakkinda" name="hakkinda" maxlength="300" rows="3"
							>{profil?.degerler?.hakkinda ?? hesap.hakkinda ?? ''}</textarea
						>
					</Alan>
					<label class="onay-kutusu">
						<input
							type="checkbox"
							name="aramaMotorlari"
							value="evet"
							checked={hesap.aramaMotorlari}
						/>
						<span>
							<strong>Herkese açık sayfalarım arama motorlarında çıkabilir</strong>
							<small class="soluk"
								>Kapalıyken profilin ve açık izlerin bağlantıyla paylaşılabilir ama Google gibi
								motorlara “dizine ekleme” denir.</small
							>
						</span>
					</label>
					<div class="satir"><button class="dugme dugme-birincil">Kaydet</button></div>
				</form>
			</section>

			<section id="eposta" class="kart bolum" aria-labelledby="eposta-baslik">
				<h2 id="eposta-baslik">E-posta</h2>
				<div class="eposta-durumu">
					<p class="kucuk">
						Şu anki adresin: <strong>{hesap.eposta}</strong>
						{#if hesap.epostaDogrulandi}
							<span class="rozet dogrulandi"><Simge ad="onay" boyut={12} /> Doğrulandı</span>
						{:else}
							<span class="rozet dogrulanmadi">Doğrulanmadı</span>
						{/if}
					</p>
					{#if !hesap.epostaDogrulandi}
						<form method="POST" action="?/dogrulamaGonder" use:enhance>
							<button class="dugme dugme-kucuk">Doğrulama bağlantısı gönder</button>
						</form>
					{/if}
				</div>
				<form method="POST" action="?/eposta" class="yigin" use:enhance={koru}>
					<Alan id="yeniEposta" etiket="Yeni e-posta" hata={eposta?.hatalar.yeniEposta}>
						<input
							id="yeniEposta"
							name="yeniEposta"
							type="email"
							autocomplete="email"
							required
							value={eposta?.degerler?.yeniEposta ?? ''}
							aria-invalid={!!eposta?.hatalar.yeniEposta}
						/>
					</Alan>
					<Alan id="epostaSifre" etiket="Şifren" hata={eposta?.hatalar.sifre}>
						<input
							id="epostaSifre"
							name="sifre"
							type="password"
							autocomplete="current-password"
							required
							aria-invalid={!!eposta?.hatalar.sifre}
						/>
					</Alan>
					<div class="satir"><button class="dugme">E-postayı değiştir</button></div>
				</form>
			</section>

			<section id="sifre" class="kart bolum" aria-labelledby="sifre-baslik">
				<h2 id="sifre-baslik">Şifre</h2>
				<p class="kucuk soluk">Şifreni değiştirince diğer cihazlardaki oturumların kapanır.</p>
				<form method="POST" action="?/sifre" class="yigin" use:enhance={koru}>
					<!-- Parola yöneticileri için kullanıcı adı ipucu -->
					<input
						type="text"
						name="kullaniciAdi"
						autocomplete="username"
						value={hesap.eposta}
						hidden
						readonly
					/>
					<Alan id="mevcutSifre" etiket="Mevcut şifre" hata={sifre?.hatalar.mevcutSifre}>
						<input
							id="mevcutSifre"
							name="mevcutSifre"
							type="password"
							autocomplete="current-password"
							required
							aria-invalid={!!sifre?.hatalar.mevcutSifre}
						/>
					</Alan>
					<div class="iki">
						<Alan
							id="yeniSifre"
							etiket="Yeni şifre"
							hata={sifre?.hatalar.yeniSifre}
							ipucu="En az 10 karakter."
						>
							<input
								id="yeniSifre"
								name="yeniSifre"
								type="password"
								autocomplete="new-password"
								minlength="10"
								required
								aria-invalid={!!sifre?.hatalar.yeniSifre}
							/>
						</Alan>
						<Alan
							id="yeniSifreTekrar"
							etiket="Yeni şifre (tekrar)"
							hata={sifre?.hatalar.yeniSifreTekrar}
						>
							<input
								id="yeniSifreTekrar"
								name="yeniSifreTekrar"
								type="password"
								autocomplete="new-password"
								required
								aria-invalid={!!sifre?.hatalar.yeniSifreTekrar}
							/>
						</Alan>
					</div>
					<div class="satir"><button class="dugme">Şifreyi değiştir</button></div>
				</form>
			</section>

			<section id="gecis" class="kart bolum" aria-labelledby="gecis-baslik">
				<h2 id="gecis-baslik">Geçiş anahtarları</h2>
				<p class="kucuk soluk">
					Şifre yerine cihazının kilidiyle (parmak izi, yüz, PIN) giriş yap. Anahtar cihazında
					kalır; İz yalnızca açık anahtarı saklar.
				</p>
				{#if data.anahtarlar.length}
					<ul class="oturum-listesi">
						{#each data.anahtarlar as a (a.id)}
							<li>
								<span class="oturum-bilgi">
									<strong>{a.ad}</strong>
									<small class="soluk">
										Eklendi {gunYaz(a.olusturma)}{a.sonKullanim
											? ` · son kullanım ${zamanYaz(a.sonKullanim)}`
											: ''}
									</small>
								</span>
								<form method="POST" action="?/gecisSil" use:enhance>
									<input type="hidden" name="id" value={a.id} />
									<button class="dugme dugme-kucuk" aria-label="{a.ad} geçiş anahtarını kaldır"
										>Kaldır</button
									>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
				<GecisAnahtari kip="kayit" />
			</section>

			<section id="oturumlar" class="kart bolum" aria-labelledby="oturumlar-baslik">
				<h2 id="oturumlar-baslik">Açık oturumlar</h2>
				<p class="kucuk soluk">
					Tanımadığın bir cihaz görürsen kapat ve şifreni değiştir. Oturumlar 30 gün kullanılmazsa
					kendiliğinden kapanır.
				</p>
				<ul class="oturum-listesi">
					{#each data.oturumlar as o (o.id)}
						<li>
							<span class="oturum-bilgi">
								<strong>{o.cihaz ?? 'Bilinmeyen cihaz'}</strong>
								{#if o.mevcut}<span class="rozet bu-cihaz">Bu cihaz</span>{/if}
								<small class="soluk">
									Son kullanım {zamanYaz(o.sonKullanim)} · açılış {gunYaz(o.olusturma)}
								</small>
							</span>
							{#if !o.mevcut}
								<form method="POST" action="?/oturumKapat" use:enhance>
									<input type="hidden" name="oturum" value={o.id} />
									<button
										class="dugme dugme-kucuk"
										aria-label="{o.cihaz ?? 'Bilinmeyen cihaz'} oturumunu kapat">Kapat</button
									>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
				{#if data.oturumlar.length > 1}
					<form method="POST" action="?/digerleriniKapat" use:enhance>
						<button class="dugme dugme-kucuk">
							<Simge ad="cikis" boyut={16} /> Diğer tüm oturumları kapat
						</button>
					</form>
				{/if}
			</section>

			<section id="veriler" class="kart bolum" aria-labelledby="veriler-baslik">
				<h2 id="veriler-baslik">Verilerin</h2>
				<p class="kucuk soluk">
					Haritan senindir. Düğüm, bağ ve izlerini; alıntılarını, dönemlerini ve karar defterini
					istediğin zaman indirebilir, başka bir İz hesabına taşıyabilirsin. Çöp kutusundakiler
					indirilmez.
				</p>
				<div class="satir">
					<a class="dugme" href="/ayarlar/disa-aktar?bicim=json" download>
						<Simge ad="asagi" boyut={16} /> JSON olarak indir
					</a>
					<a class="dugme" href="/ayarlar/disa-aktar?bicim=md" download>
						<Simge ad="asagi" boyut={16} /> Markdown olarak indir
					</a>
				</div>
				<form
					method="POST"
					action="?/iceAktar"
					enctype="multipart/form-data"
					class="yigin ice-aktar"
					use:enhance={koru}
				>
					<Alan
						id="dosya"
						etiket="JSON dosyasından içe aktar"
						hata={ice?.hatalar.dosya}
						ipucu="İz'den indirdiğin bir JSON dosyası (en fazla 5 MB). Mevcut verine eklenir; hiçbir şey silinmez. Aynı dış eser varsa yenisi açılmaz."
					>
						<input id="dosya" name="dosya" type="file" accept="application/json,.json" required />
					</Alan>
					<div class="satir"><button class="dugme">İçe aktar</button></div>
				</form>
			</section>

			<section id="sil" class="kart bolum tehlike" aria-labelledby="sil-baslik">
				<h2 id="sil-baslik">Hesabı sil</h2>
				<p class="kucuk">
					Hesabın ve <strong>tüm</strong> düğüm, bağ ve izlerin hemen ve kalıcı olarak silinir. Bu işlem
					geri alınamaz; önce verilerini indirmen önerilir.
				</p>
				<form method="POST" action="?/hesabiSil" class="yigin" use:enhance={koru}>
					<div class="iki">
						<Alan
							id="onayKullaniciAdi"
							etiket="Onay için kullanıcı adın: {hesap.kullaniciAdi}"
							hata={sil?.hatalar.onayKullaniciAdi}
						>
							<input
								id="onayKullaniciAdi"
								name="onayKullaniciAdi"
								autocomplete="off"
								autocapitalize="none"
								spellcheck="false"
								required
								value={sil?.degerler?.onayKullaniciAdi ?? ''}
								aria-invalid={!!sil?.hatalar.onayKullaniciAdi}
							/>
						</Alan>
						<Alan id="silSifre" etiket="Şifren" hata={sil?.hatalar.sifre}>
							<input
								id="silSifre"
								name="sifre"
								type="password"
								autocomplete="current-password"
								required
								aria-invalid={!!sil?.hatalar.sifre}
							/>
						</Alan>
					</div>
					<div class="satir">
						<button class="dugme dugme-tehlike">Hesabımı kalıcı olarak sil</button>
					</div>
				</form>
			</section>
		</div>
	</div>
</div>

<style>
	.duzen {
		display: grid;
		gap: var(--a-5);
		align-items: start;
	}
	.icindekiler ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		gap: var(--a-2);
		overflow-x: auto;
		scrollbar-width: none;
	}
	.icindekiler a {
		display: block;
		flex: none;
		padding: var(--a-1) var(--a-3);
		border-radius: var(--yaricap-tam);
		border: 1px solid var(--cizgi-guclu);
		color: var(--metin-soluk);
		text-decoration: none;
		font-size: var(--boyut-sm);
		font-weight: 550;
		white-space: nowrap;
	}
	.icindekiler a:hover {
		color: var(--metin);
		background: var(--yuzey-2);
	}
	.bolumler {
		display: flex;
		flex-direction: column;
		gap: var(--a-5);
		min-width: 0;
	}
	.bolum {
		display: flex;
		flex-direction: column;
		gap: var(--a-3);
		scroll-margin-top: calc(var(--ust-yukseklik) + var(--a-4));
	}
	.bolum h2 {
		margin: 0;
		font-size: var(--boyut-xl);
	}
	.bolum > p {
		margin: 0;
	}
	.iki {
		display: grid;
		gap: var(--a-3);
	}
	.onay-kutusu {
		display: flex;
		gap: var(--a-3);
		align-items: flex-start;
		cursor: pointer;
	}
	.onay-kutusu input {
		margin-top: 0.25rem;
		flex: none;
	}
	.onay-kutusu span {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.oturum-listesi {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap);
	}
	.oturum-listesi li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--a-3);
		padding: var(--a-3) var(--a-4);
	}
	.oturum-listesi li + li {
		border-top: 1px solid var(--cizgi);
	}
	.oturum-listesi form {
		margin: 0;
	}
	.oturum-bilgi {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--a-1) var(--a-2);
		min-width: 0;
	}
	.oturum-bilgi small {
		flex-basis: 100%;
	}
	.bu-cihaz {
		background: var(--basari-zemin);
		color: var(--metin);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--basari) 45%, transparent);
	}
	.eposta-durumu {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--a-2) var(--a-3);
	}
	.eposta-durumu p,
	.eposta-durumu form {
		margin: 0;
	}
	.dogrulandi {
		background: var(--basari-zemin);
		color: var(--metin);
	}
	.dogrulanmadi {
		background: var(--uyari-zemin);
		color: var(--metin);
	}
	.ice-aktar {
		padding-top: var(--a-3);
		border-top: 1px solid var(--cizgi);
	}
	.tehlike {
		border-color: color-mix(in srgb, var(--hata) 40%, var(--cizgi));
	}
	.tehlike h2 {
		color: var(--hata);
	}
	@media (min-width: 40rem) {
		.iki {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (min-width: 56rem) {
		.duzen {
			grid-template-columns: 12rem 1fr;
		}
		.icindekiler {
			position: sticky;
			top: calc(var(--ust-yukseklik) + var(--a-4));
		}
		.icindekiler ul {
			flex-direction: column;
		}
		.icindekiler a {
			border: 0;
			border-left: 2px solid var(--cizgi);
			border-radius: 0;
		}
		.icindekiler a:hover {
			border-left-color: var(--vurgu);
			background: none;
		}
	}
</style>
