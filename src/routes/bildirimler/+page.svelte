<script lang="ts">
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function zaman(t: Date | string) {
		return new Intl.DateTimeFormat('tr-TR', {
			day: 'numeric',
			month: 'long',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'Europe/Istanbul'
		}).format(new Date(t));
	}
</script>

<svelte:head><title>Bildirimler · İz</title></svelte:head>

<div class="kap kap-orta yigin">
	<SayfaBasligi
		ust="Hesap"
		baslik="Bildirimler"
		aciklama="Yalnızca anlamlı olaylar: biri senin düğümünden kendi haritasına bir yol çizdiğinde ya da grubuna katıldığında. Beğeni, takipçi ya da akış yok."
	/>

	{#if data.kararlar.length}
		<section class="yigin" aria-labelledby="kararlar-baslik">
			<h2 id="kararlar-baslik" class="bolum-basligi">Sonucunu sorma zamanı gelen kararlar</h2>
			<ul class="liste">
				{#each data.kararlar as k (k.dugumId)}
					<li class="yeni">
						<span class="simge" aria-hidden="true"><Simge ad="takvim" boyut={18} /></span>
						<span class="metin">
							<a href="/dugumler/{k.dugumId}">“{k.baslik}”</a>
							{#if k.beklenti}<span class="not">Beklentin: {k.beklenti}</span>{/if}
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.liste.length}
		<ul class="liste">
			{#each data.liste as b (b.id)}
				<li class:yeni={!b.okundu}>
					<span class="simge" aria-hidden="true">
						<Simge ad={b.tur === 'grup_katilim' ? 'grup' : 'iz'} boyut={18} />
					</span>
					<span class="metin">
						{#if b.tur === 'dis_bag'}
							<span>
								<a href="/@{b.aktor?.kullaniciAdi}">{b.aktor?.ad}</a>, senin
								{#if b.kaynak?.id}<a href="/dugumler/{b.kaynak.id}">“{b.kaynak.baslik}”</a
									>{:else}bir{/if}
								düğümünün onu
								{#if b.hedef}<a href="/dugumler/{b.hedef.id}">“{b.hedef.baslik}”</a>{:else}kendi
									haritasında bir yere{/if}
								götürdüğünü söyledi.
							</span>
							{#if b.not}<span class="not">“{b.not}”</span>{/if}
						{:else}
							<span>
								<a href="/@{b.aktor?.kullaniciAdi}">{b.aktor?.ad}</a>
								{#if b.grup?.id}<a href="/gruplar/{b.grup.id}">{b.grup.ad}</a>{:else}bir{/if} grubuna
								katıldı.
							</span>
						{/if}
						<small class="soluk">{zaman(b.olusturma)}{b.okundu ? '' : ' · yeni'}</small>
					</span>
				</li>
			{/each}
		</ul>
	{:else if !data.kararlar.length}
		<BosDurum
			baslik="Henüz bildirim yok"
			aciklama="Herkese açık düğümlerin başkalarını bir yere götürdüğünde burada görürsün."
		/>
	{/if}
</div>

<style>
	.liste {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap-lg);
		background: var(--yuzey);
	}
	.liste li {
		display: flex;
		gap: var(--a-3);
		padding: var(--a-3) var(--a-4);
	}
	.liste li + li {
		border-top: 1px solid var(--cizgi);
	}
	.liste li.yeni {
		background: var(--vurgu-zemin);
	}
	.simge {
		flex: none;
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: var(--yaricap-tam);
		background: var(--yuzey-2);
		color: var(--vurgu-guclu);
	}
	.metin {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.bolum-basligi {
		margin: 0;
		font-size: var(--boyut-lg);
	}
	.not {
		font-style: italic;
		color: var(--metin-soluk);
		font-size: var(--boyut-sm);
	}
</style>
