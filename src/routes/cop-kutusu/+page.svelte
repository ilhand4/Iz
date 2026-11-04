<script lang="ts">
	import { enhance } from '$app/forms';
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import TurSekli from '#lib/bilesenler/TurSekli.svelte';
	import { COP_KUTUSU_GUN, DUGUM_TURU_ETIKETI } from '#lib/sabitler.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const toplam = $derived(data.dugumler.length + data.izler.length);

	function kalanMetni(gun: number) {
		if (gun <= 1) return 'Yarın kalıcı olarak silinecek';
		return `${gun} gün sonra kalıcı olarak silinecek`;
	}

	function kaliciOnay(e: SubmitEvent) {
		if (!confirm('Bu öğe kalıcı olarak silinecek ve geri getirilemeyecek. Emin misin?')) {
			e.preventDefault();
		}
	}
</script>

<svelte:head><title>Çöp kutusu · İz</title></svelte:head>

<div class="kap kap-orta yigin">
	<SayfaBasligi
		ust="Haritan"
		baslik="Çöp kutusu"
		aciklama="Sildiğin düğümler ve izler {COP_KUTUSU_GUN} gün burada bekler; bu sürede geri yükleyebilirsin. Geri yüklenen düğüm bağlarıyla ve izlerdeki yeriyle birlikte döner."
		geri={{ href: '/dugumler', etiket: 'Düğümler' }}
	/>

	{#if toplam === 0}
		<BosDurum
			baslik="Çöp kutusu boş"
			aciklama="Sildiğin bir şey olursa burada {COP_KUTUSU_GUN} gün bekler."
		>
			{#snippet eylemler()}
				<a class="dugme" href="/dugumler">Düğümlere dön</a>
			{/snippet}
		</BosDurum>
	{:else}
		{#snippet oge(tur: 'dugum' | 'iz', id: string, baslik: string, gun: number)}
			<div class="eylemler">
				<form method="POST" action="?/geriYukle" use:enhance>
					<input type="hidden" name="tur" value={tur} />
					<input type="hidden" name="id" value={id} />
					<button class="dugme dugme-kucuk" aria-label="Geri yükle: {baslik}">
						<Simge ad="geriAl" boyut={16} /> Geri yükle
					</button>
				</form>
				<form method="POST" action="?/kaliciSil" use:enhance onsubmit={kaliciOnay}>
					<input type="hidden" name="tur" value={tur} />
					<input type="hidden" name="id" value={id} />
					<button class="dugme dugme-kucuk dugme-hayalet tehlike" title="Kalıcı olarak sil">
						<Simge ad="cop" boyut={16} /><span class="gorunmez">Kalıcı olarak sil: {baslik}</span>
					</button>
				</form>
			</div>
			<span class="kalan kucuk" class:yakin={gun <= 3}>{kalanMetni(gun)}</span>
		{/snippet}

		{#if data.dugumler.length}
			<section class="yigin" aria-labelledby="cop-dugumler">
				<h2 id="cop-dugumler">Düğümler <span class="soluk">({data.dugumler.length})</span></h2>
				<ul class="liste">
					{#each data.dugumler as d (d.id)}
						<li class="kart satir-oge">
							<span class="ad">
								<TurSekli tur={d.tur} boyut={14} />
								<span>
									<strong>{d.baslik}</strong>
									<span class="kucuk soluk">{DUGUM_TURU_ETIKETI[d.tur]}</span>
								</span>
							</span>
							{@render oge('dugum', d.id, d.baslik, d.kalanGun)}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.izler.length}
			<section class="yigin" aria-labelledby="cop-izler">
				<h2 id="cop-izler">İzler <span class="soluk">({data.izler.length})</span></h2>
				<ul class="liste">
					{#each data.izler as iz (iz.id)}
						<li class="kart satir-oge">
							<span class="ad">
								<Simge ad="iz" boyut={16} />
								<strong>{iz.baslik}</strong>
							</span>
							{@render oge('iz', iz.id, iz.baslik, iz.kalanGun)}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="kart bosalt" aria-labelledby="bosalt-baslik">
			<h2 id="bosalt-baslik">Çöp kutusunu boşalt</h2>
			<p class="kucuk soluk">
				{toplam} öğe hemen ve kalıcı olarak silinir. Bu işlem geri alınamaz.
			</p>
			<form method="POST" action="?/bosalt" class="satir" use:enhance>
				<label class="onay">
					<input type="checkbox" name="onay" value="evet" required />
					Evet, hepsini kalıcı olarak sil
				</label>
				<button class="dugme dugme-tehlike">Boşalt</button>
			</form>
			{#if form && 'bosaltHatasi' in form}
				<p class="hata-metni kucuk" role="alert">{form.bosaltHatasi}</p>
			{/if}
		</section>
	{/if}
</div>

<style>
	h2 {
		margin: 0;
		font-size: var(--boyut-xl);
	}
	.liste {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.satir-oge {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: var(--a-1) var(--a-3);
		padding: var(--a-3) var(--a-4);
	}
	.ad {
		display: flex;
		align-items: center;
		gap: var(--a-2);
		min-width: 0;
	}
	.ad > span {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.ad strong {
		overflow-wrap: anywhere;
	}
	.eylemler {
		display: flex;
		gap: var(--a-1);
		grid-row: span 2;
	}
	.eylemler form {
		margin: 0;
	}
	.kalan {
		color: var(--metin-soluk);
	}
	.kalan.yakin {
		color: var(--uyari);
		font-weight: 600;
	}
	.tehlike:hover {
		color: var(--hata);
	}
	.bosalt {
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
		border-color: color-mix(in srgb, var(--hata) 30%, var(--cizgi));
	}
	.bosalt p {
		margin: 0;
	}
	.onay {
		display: inline-flex;
		align-items: center;
		gap: var(--a-2);
		font-size: var(--boyut-sm);
	}
</style>
