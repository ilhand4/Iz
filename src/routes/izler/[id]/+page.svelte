<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import GizlilikRozeti from '#lib/bilesenler/GizlilikRozeti.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import TurRozeti from '#lib/bilesenler/TurRozeti.svelte';
	import { tarihYaz } from '#lib/tarih.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	type Durak = (typeof data.duraklar)[number];
	type GorunurDurak = Extract<Durak, { dugum: unknown }>;

	const iz = $derived(data.iz);
	const gorunurDuraklar = $derived(data.duraklar.filter((d): d is GorunurDurak => !('gizli' in d)));
	const yillar = $derived(
		gorunurDuraklar
			.map((d) => d.dugum.tarih?.slice(0, 4))
			.filter((y): y is string => !!y)
			.sort()
	);
	const aralik = $derived(
		yillar.length
			? yillar[0] === yillar.at(-1)
				? yillar[0]
				: `${yillar[0]} → ${yillar.at(-1)}`
			: null
	);

	let kopyalandi = $state(false);
	async function baglantiyiKopyala() {
		try {
			await navigator.clipboard.writeText(location.href);
			kopyalandi = true;
			setTimeout(() => (kopyalandi = false), 2500);
		} catch {
			// Pano erişimi reddedildiyse sessizce geç
		}
	}
</script>

<svelte:head>
	<title>{iz.baslik} · İz</title>
	{#if iz.aciklama}<meta name="description" content={iz.aciklama} />{/if}
</svelte:head>

<div class="kap kap-orta yigin">
	<SayfaBasligi
		ust="İz"
		baslik={iz.baslik}
		aciklama={iz.aciklama}
		geri={data.sahibiMi ? { href: '/izler', etiket: 'İzler' } : undefined}
	>
		<div class="meta">
			<GizlilikRozeti gizlilik={iz.gizlilik} />
			<span>{data.duraklar.length} durak</span>
			{#if aralik}<span>{aralik}</span>{/if}
			{#if !data.sahibiMi}
				<a href="/@{data.sahip.kullaniciAdi}">{data.sahip.ad} (@{data.sahip.kullaniciAdi})</a>
			{/if}
		</div>
		{#snippet eylemler()}
			{#if iz.gizlilik === 'herkes'}
				<button type="button" class="dugme" onclick={baglantiyiKopyala}>
					<Simge ad={kopyalandi ? 'onay' : 'kopyala'} boyut={18} />
					{kopyalandi ? 'Kopyalandı' : 'Bağlantıyı kopyala'}
				</button>
			{/if}
			{#if data.sahibiMi}
				<a class="dugme dugme-birincil" href="/izler/{iz.id}/duzenle">
					<Simge ad="kalem" boyut={18} /> Düzenle
				</a>
			{/if}
		{/snippet}
	</SayfaBasligi>

	{#if iz.gizlilik === 'herkes' && data.sahibiMi}
		<details class="kart gomme-kodu">
			<summary>Sitene göm</summary>
			<p class="kucuk soluk">
				Bu kodu blogunun ya da sitenin HTML'ine yapıştır. Gömülen iz, herkesin gördüğü hâliyle
				görünür; gizli duraklar gizli kalır.
			</p>
			<label class="gorunmez" for="gomme-kodu">Gömme kodu</label>
			<textarea id="gomme-kodu" readonly rows="3" onfocus={(e) => e.currentTarget.select()}
				>{`<iframe src="${page.url.origin}/izler/${iz.id}/gom" title="${iz.baslik} · İz" width="100%" height="480" style="border:0" loading="lazy"></iframe>`}</textarea
			>
		</details>
	{/if}

	{#if data.gorunmeyenDurakSayisi > 0}
		<p class="bildirim bildirim-uyari">
			Bu iz herkese açık ama {data.gorunmeyenDurakSayisi} durağındaki düğüm herkese açık değil. Başkaları
			bu durakları “gizli durak” olarak görür.
		</p>
	{/if}
	{#if data.ilk}
		<section class="ilk-iz" aria-labelledby="ilk-iz-baslik">
			<Simge ad="iz" boyut={28} />
			<div>
				<h2 id="ilk-iz-baslik">İlk izin hazır.</h2>
				<p class="kucuk">
					Bir eserin seni nereden alıp nereye götürdüğünü kaydettin. Şimdi
					<a href="/dugumler/ag">ağında</a> nasıl durduğuna bak, ya da
					<a href="/dugumler/yeni">bir düğüm daha ekle</a>. Düğümler şimdilik yalnızca sana açık;
					istersen
					<a href="/izler/{iz.id}/duzenle">izi paylaşılır yapabilirsin</a>.
				</p>
			</div>
		</section>
	{/if}

	{#if data.duraklar.length === 0}
		<BosDurum
			baslik="Bu izde henüz durak yok"
			aciklama={data.sahibiMi
				? 'Düğümlerinden durak ekleyip sıraya dizerek izini oluştur.'
				: undefined}
		>
			{#snippet eylemler()}
				{#if data.sahibiMi}
					<a class="dugme dugme-birincil" href="/izler/{iz.id}/duzenle">Durak ekle</a>
				{/if}
			{/snippet}
		</BosDurum>
	{:else}
		<ol class="iz-yolu">
			{#each data.duraklar as durak, i (durak.adimId)}
				{@const sonraki = data.duraklar[i + 1]}
				<li class="durak" data-tur={'gizli' in durak ? 'gizli' : durak.dugum.tur}>
					<span class="durak-no" aria-hidden="true">{i + 1}</span>
					{#if 'gizli' in durak}
						<div class="kart gizli-durak">
							<Simge ad="kilit" boyut={18} />
							<span>Bu durak yalnızca izin sahibine açık.</span>
						</div>
					{:else}
						<article class="kart durak-karti" aria-label="{i + 1}. durak: {durak.dugum.baslik}">
							{#if durak.dugum.gorselUrl}
								<img
									src={durak.dugum.gorselUrl}
									alt=""
									loading="lazy"
									referrerpolicy="no-referrer"
								/>
							{/if}
							<div class="durak-govde">
								<div class="satir">
									<TurRozeti tur={durak.dugum.tur} eserTuru={durak.dugum.eserTuru} />
									{#if durak.dugum.tarih}
										<span class="kucuk soluk"
											>{tarihYaz(durak.dugum.tarih, durak.dugum.tarihHassasiyeti)}</span
										>
									{/if}
								</div>
								<h2><a href="/dugumler/{durak.dugum.id}">{durak.dugum.baslik}</a></h2>
								{#if durak.dugum.altBaslik}<p class="alt">{durak.dugum.altBaslik}</p>{/if}
								{#if durak.not}<blockquote class="anlati">{durak.not}</blockquote>{/if}
							</div>
						</article>
					{/if}

					{#if sonraki}
						<div class="gecis">
							{#if !('gizli' in durak) && durak.sonrakineBag}
								<span class="gecis-notu">
									<Simge ad="asagi" boyut={14} />
									{durak.sonrakineBag.not ?? 'buraya götürdü'}
								</span>
							{:else if data.sahibiMi && !('gizli' in durak) && !('gizli' in sonraki)}
								<form method="POST" action="?/bagKur" use:enhance class="bagla">
									<input type="hidden" name="kaynakId" value={durak.dugum.id} />
									<input type="hidden" name="hedefId" value={sonraki.dugum.id} />
									<span class="kucuk soluk">Bu iki durak arasında bağ yok.</span>
									<button class="dugme dugme-hayalet dugme-kucuk">
										<Simge ad="baglanti" boyut={14} /> Bağla
									</button>
								</form>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
			<li class="son" aria-label="İzin sonu">
				<span class="durak-no"><Simge ad="bayrak" boyut={14} /></span>
				<span class="kucuk soluk">Şimdilik burada bitiyor.</span>
			</li>
		</ol>
	{/if}
</div>

<style>
	.gomme-kodu summary {
		cursor: pointer;
		font-weight: 600;
	}
	.gomme-kodu[open] summary {
		margin-bottom: var(--a-2);
	}
	.gomme-kodu p {
		margin: 0 0 var(--a-2);
	}
	.gomme-kodu textarea {
		width: 100%;
		font-family: var(--yazi-kod);
		font-size: var(--boyut-xs);
	}
	.ilk-iz {
		display: flex;
		gap: var(--a-4);
		align-items: flex-start;
		padding: var(--a-4) var(--a-5);
		border-radius: var(--yaricap-lg);
		border: 1px solid color-mix(in srgb, var(--vurgu) 35%, var(--cizgi));
		background: var(--vurgu-zemin);
		color: var(--vurgu-guclu);
	}
	.ilk-iz h2 {
		margin: 0 0 var(--a-1);
		color: var(--metin);
	}
	.ilk-iz p {
		margin: 0;
		color: var(--metin);
	}
	.kap-orta {
		max-width: 52rem;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--a-2) var(--a-3);
		margin-top: var(--a-3);
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
	}
	.meta > span:not(:first-child)::before {
		content: '·';
		margin-right: var(--a-3);
		color: var(--metin-silik);
	}

	/* ——— Yol ——— */
	.iz-yolu {
		--no: 2.25rem;
		position: relative;
		list-style: none;
		margin: var(--a-3) 0 0;
		padding: 0;
	}
	/* Durakları birleştiren noktalı çizgi */
	.iz-yolu::before {
		content: '';
		position: absolute;
		top: 1rem;
		bottom: 1.25rem;
		left: calc(var(--no) / 2 - 1px);
		border-left: 2px dotted var(--vurgu);
	}
	.durak,
	.son {
		position: relative;
		display: grid;
		grid-template-columns: var(--no) 1fr;
		column-gap: var(--a-3);
	}
	.durak-no {
		position: relative;
		display: grid;
		place-items: center;
		width: var(--no);
		height: var(--no);
		border-radius: 50%;
		background: var(--renk, var(--metin-soluk));
		color: var(--yuzey);
		font-family: var(--yazi-baslik);
		font-weight: 700;
		box-shadow: 0 0 0 5px var(--zemin);
	}
	.durak[data-tur='eser'] {
		--renk: var(--tur-eser);
	}
	.durak[data-tur='kisi'] {
		--renk: var(--tur-kisi);
	}
	.durak[data-tur='yer'] {
		--renk: var(--tur-yer);
	}
	.durak[data-tur='karar'] {
		--renk: var(--tur-karar);
	}
	.durak[data-tur='ani'] {
		--renk: var(--tur-ani);
	}
	.durak[data-tur='gizli'] {
		--renk: var(--metin-silik);
	}
	.durak-karti {
		display: flex;
		gap: var(--a-4);
		min-width: 0;
	}
	.durak-karti img {
		flex: none;
		width: 4.5rem;
		height: 6.5rem;
		object-fit: cover;
		border-radius: var(--yaricap-sm);
		box-shadow: var(--golge-1);
	}
	.durak-govde {
		display: flex;
		flex-direction: column;
		gap: var(--a-1);
		min-width: 0;
	}
	.durak-govde h2 {
		margin: var(--a-1) 0 0;
		font-size: var(--boyut-xl);
	}
	.durak-govde h2 a {
		color: var(--metin);
		text-decoration: none;
	}
	.durak-govde h2 a:hover {
		color: var(--vurgu);
	}
	.alt {
		margin: 0;
		color: var(--metin-soluk);
		font-size: var(--boyut-sm);
	}
	.anlati {
		margin: var(--a-2) 0 0;
		padding-left: var(--a-3);
		border-left: 3px solid var(--renk, var(--cizgi));
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-lg);
		font-style: italic;
		line-height: 1.5;
		white-space: pre-line;
	}
	.gizli-durak {
		display: flex;
		align-items: center;
		gap: var(--a-2);
		color: var(--metin-soluk);
		font-size: var(--boyut-sm);
		background: var(--yuzey-2);
		box-shadow: none;
	}
	.gecis {
		grid-column: 2;
		min-height: var(--a-5);
		display: flex;
		align-items: center;
		padding: var(--a-2) 0;
	}
	.gecis-notu {
		display: inline-flex;
		align-items: center;
		gap: var(--a-2);
		font-style: italic;
		color: var(--metin-soluk);
		font-size: var(--boyut-sm);
	}
	.gecis-notu :global(svg) {
		color: var(--vurgu);
	}
	.bagla {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--a-2);
	}
	.son {
		align-items: center;
		margin-top: var(--a-2);
	}
	.son .durak-no {
		background: var(--yuzey-2);
		color: var(--metin-soluk);
		border: 2px dotted var(--vurgu);
	}

	@media (max-width: 30rem) {
		.durak-karti img {
			display: none;
		}
	}
</style>
