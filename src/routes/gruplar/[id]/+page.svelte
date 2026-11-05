<script lang="ts">
	import { enhance } from '$app/forms';
	import Alan from '#lib/bilesenler/Alan.svelte';
	import IzKarti from '#lib/bilesenler/IzKarti.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import { gunYaz } from '#lib/tarih.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const g = $derived(data.grup);
	const yonetici = $derived(data.rolum === 'yonetici');
	const duzenleHata = $derived(
		((form as { duzenle?: { hatalar: Record<string, string> } } | null)?.duzenle?.hatalar ??
			{}) as Record<string, string>
	);
	const davet = $derived((form as { davetBaglantisi?: string } | null)?.davetBaglantisi ?? null);

	let kopyalandi = $state(false);
	async function kopyala() {
		if (!davet) return;
		try {
			await navigator.clipboard.writeText(davet);
			kopyalandi = true;
			setTimeout(() => (kopyalandi = false), 2500);
		} catch {
			// Pano izni yoksa kullanıcı kutudan kendisi kopyalar
		}
	}
</script>

<svelte:head><title>{g.ad} · Gruplar · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="Grup"
		baslik={g.ad}
		aciklama={g.aciklama}
		geri={{ href: '/gruplar', etiket: 'Gruplar' }}
	>
		{#snippet eylemler()}
			<a class="dugme" href="/gruplar/{g.id}/arsiv"
				><Simge ad="takvim" boyut={18} /> Arşiv ve kitap</a
			>
			<a class="dugme dugme-birincil" href="/izler/yeni"
				><Simge ad="iz" boyut={18} /> Ortak iz başlat</a
			>
		{/snippet}
	</SayfaBasligi>

	{#if data.yeni}
		<p class="bildirim bildirim-basari" role="status">
			Grup kuruldu. Şimdi bir davet bağlantısı oluşturup paylaş.
		</p>
	{/if}

	<div class="duzen">
		<div class="yigin">
			<section class="yigin" aria-labelledby="ortak-baslik">
				<h2 id="ortak-baslik">Ortak izler</h2>
				{#if data.izler.length}
					<div class="izgara">
						{#each data.izler as iz (iz.id)}
							<IzKarti {iz} />
						{/each}
					</div>
				{:else}
					<p class="kucuk soluk">
						Henüz ortak iz yok. Bir iz oluştururken “Ortak iz” bölümünden bu grubu seç; üyeler kendi
						duraklarını ekleyebilsin.
					</p>
				{/if}
			</section>

			<section class="yigin" aria-labelledby="uyeler-baslik">
				<h2 id="uyeler-baslik">Üyeler <span class="soluk">({data.uyeler.length})</span></h2>
				<ul class="uyeler">
					{#each data.uyeler as u (u.id)}
						<li>
							<span class="uye">
								<span class="avatar" aria-hidden="true"
									>{u.ad.slice(0, 1).toLocaleUpperCase('tr')}</span
								>
								<span class="metin">
									<a href="/@{u.kullaniciAdi}"><strong>{u.ad}</strong></a>
									<small class="soluk"
										>@{u.kullaniciAdi}{u.rol === 'yonetici' ? ' · yönetici' : ''}{u.ben
											? ' · sen'
											: ''} · {gunYaz(u.katilma)} katıldı</small
									>
								</span>
							</span>
							{#if yonetici && !u.ben}
								<span class="satir uye-eylemleri">
									{#if u.rol !== 'yonetici'}
										<form method="POST" action="?/yoneticiYap" use:enhance>
											<input type="hidden" name="uyeId" value={u.id} />
											<button class="dugme dugme-kucuk dugme-hayalet">Yönetici yap</button>
										</form>
									{/if}
									<form method="POST" action="?/uyeCikar" use:enhance>
										<input type="hidden" name="uyeId" value={u.id} />
										<button
											class="dugme dugme-kucuk dugme-hayalet"
											aria-label="{u.ad} adlı üyeyi çıkar">Çıkar</button
										>
									</form>
								</span>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		</div>

		<aside class="yigin">
			{#if yonetici}
				<section class="kart yigin" aria-labelledby="davet-baslik">
					<h2 id="davet-baslik">Davet bağlantısı</h2>
					{#if davet}
						<p class="kucuk">
							Bu bağlantıyı yalnızca davet etmek istediklerinle paylaş. 7 gün geçerli; yeniden
							oluşturunca eskisi çalışmaz.
						</p>
						<label class="gorunmez" for="davet">Davet bağlantısı</label>
						<input id="davet" readonly value={davet} onfocus={(e) => e.currentTarget.select()} />
						<button type="button" class="dugme dugme-kucuk" onclick={kopyala}>
							<Simge ad={kopyalandi ? 'onay' : 'kopyala'} boyut={16} />
							{kopyalandi ? 'Kopyalandı' : 'Bağlantıyı kopyala'}
						</button>
					{:else if g.davetAcik}
						<p class="kucuk soluk">
							Bir davet bağlantısı açık. Güvenlik için bağlantı yalnızca oluşturulduğunda
							gösterilir; yeniden göstermek için yenisini oluştur.
						</p>
					{:else}
						<p class="kucuk soluk">Açık bir davet bağlantısı yok.</p>
					{/if}
					<div class="satir">
						<form method="POST" action="?/davetYenile" use:enhance>
							<button class="dugme dugme-kucuk dugme-birincil">
								{g.davetAcik || davet ? 'Yeni bağlantı oluştur' : 'Davet bağlantısı oluştur'}
							</button>
						</form>
						{#if g.davetAcik || davet}
							<form method="POST" action="?/davetKapat" use:enhance>
								<button class="dugme dugme-kucuk dugme-hayalet">Bağlantıyı kapat</button>
							</form>
						{/if}
					</div>
				</section>

				<section class="kart yigin" aria-labelledby="grup-bilgi-baslik">
					<h2 id="grup-bilgi-baslik">Grup bilgileri</h2>
					<form method="POST" action="?/duzenle" class="yigin" use:enhance>
						<Alan id="ad" etiket="Ad" hata={duzenleHata.ad}>
							<input id="ad" name="ad" maxlength="80" required value={g.ad} />
						</Alan>
						<Alan id="aciklama" etiket="Açıklama" hata={duzenleHata.aciklama}>
							<textarea id="aciklama" name="aciklama" rows="2" maxlength="300"
								>{g.aciklama ?? ''}</textarea
							>
						</Alan>
						<div class="satir"><button class="dugme">Kaydet</button></div>
					</form>
				</section>
			{/if}

			<section class="kart yigin tehlike" aria-labelledby="ayril-baslik">
				<h2 id="ayril-baslik">{yonetici ? 'Ayrıl ya da sil' : 'Gruptan ayrıl'}</h2>
				<p class="kucuk soluk">
					Ayrılınca grup arkadaşlarının “Gruplarım” içeriğini artık göremezsin. Ortak izlerdeki
					durakların yerinde kalır.
				</p>
				<form method="POST" action="?/ayril" use:enhance>
					<button class="dugme dugme-kucuk">Gruptan ayrıl</button>
				</form>
				{#if yonetici}
					<form method="POST" action="?/sil" class="yigin">
						<label class="satir kucuk">
							<input type="checkbox" name="onay" value="evet" required />
							Grubu herkes için sil (ortak izler sahiplerinde kalır)
						</label>
						<div class="satir">
							<button class="dugme dugme-kucuk dugme-tehlike">Grubu sil</button>
						</div>
					</form>
					{#if form && 'silHatasi' in form}<p class="hata-metni kucuk" role="alert">
							{form.silHatasi}
						</p>{/if}
				{/if}
			</section>
		</aside>
	</div>
</div>

<style>
	h2 {
		margin: 0;
		font-size: var(--boyut-xl);
	}
	.duzen {
		display: grid;
		gap: var(--a-6);
		align-items: start;
	}
	.izgara {
		display: grid;
		gap: var(--a-3);
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
	}
	.uyeler {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap-lg);
		background: var(--yuzey);
	}
	.uyeler li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--a-2) var(--a-3);
		padding: var(--a-3) var(--a-4);
	}
	.uyeler li + li {
		border-top: 1px solid var(--cizgi);
	}
	.uye {
		display: flex;
		align-items: center;
		gap: var(--a-3);
		min-width: 0;
	}
	.avatar {
		display: grid;
		place-items: center;
		flex: none;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: var(--yaricap-tam);
		background: var(--vurgu-zemin);
		color: var(--vurgu-guclu);
		font-weight: 700;
	}
	.metin {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.metin a {
		color: var(--metin);
		text-decoration: none;
	}
	.uye-eylemleri form,
	aside form {
		margin: 0;
	}
	.kart p {
		margin: 0;
	}
	#davet {
		font-family: var(--yazi-kod);
		font-size: var(--boyut-xs);
	}
	.tehlike {
		border-color: color-mix(in srgb, var(--hata) 30%, var(--cizgi));
	}
	@media (min-width: 56rem) {
		.duzen {
			grid-template-columns: 1.5fr 1fr;
		}
	}
</style>
