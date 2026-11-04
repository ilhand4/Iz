<script lang="ts">
	import { enhance } from '$app/forms';
	import Alan from '#lib/bilesenler/Alan.svelte';
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const h = $derived((form?.hatalar ?? {}) as Record<string, string>);
	const d = $derived((form?.degerler ?? {}) as Record<string, string>);
</script>

<svelte:head><title>Gruplar · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="Paylaşım"
		baslik="Gruplar"
		aciklama="Ailen, arkadaşların, kitap kulübün. Gizliliği “Gruplarım” olan düğüm ve izlerini grup arkadaşların görür; ortak izlere herkes kendi duraklarını ekler."
	/>

	<div class="duzen">
		<section class="yigin" aria-labelledby="gruplarim-baslik">
			<h2 id="gruplarim-baslik">Gruplarım</h2>
			{#if data.gruplar.length}
				<ul class="liste">
					{#each data.gruplar as g (g.id)}
						<li>
							<a class="kart grup-karti" href="/gruplar/{g.id}">
								<span class="simge" aria-hidden="true"><Simge ad="grup" boyut={20} /></span>
								<span class="metin">
									<strong>{g.ad}</strong>
									<small class="soluk"
										>{g.uyeSayisi} üye{g.rol === 'yonetici' ? ' · yöneticisin' : ''}</small
									>
									{#if g.aciklama}<small>{g.aciklama}</small>{/if}
								</span>
								<Simge ad="ok" boyut={18} />
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<BosDurum
					baslik="Henüz bir grubun yok"
					aciklama="Bir grup kur ve davet bağlantısını paylaş; ya da sana gönderilen bir davet bağlantısını aç."
				/>
			{/if}
		</section>

		<section class="kart yigin" aria-labelledby="yeni-grup-baslik">
			<h2 id="yeni-grup-baslik">Yeni grup</h2>
			<form method="POST" class="yigin" use:enhance>
				<Alan id="ad" etiket="Grubun adı" hata={h.ad} ipucu="ör. “Ailem”, “Perşembe kitap kulübü”">
					<input
						id="ad"
						name="ad"
						maxlength="80"
						required
						value={d.ad ?? ''}
						aria-invalid={!!h.ad}
					/>
				</Alan>
				<Alan id="aciklama" etiket="Kısa açıklama" hata={h.aciklama} ipucu="İsteğe bağlı">
					<textarea id="aciklama" name="aciklama" rows="2" maxlength="300"
						>{d.aciklama ?? ''}</textarea
					>
				</Alan>
				<div class="satir"><button class="dugme dugme-birincil">Grubu kur</button></div>
			</form>
		</section>
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
	.liste {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.grup-karti {
		display: flex;
		align-items: center;
		gap: var(--a-3);
		color: var(--metin);
		text-decoration: none;
	}
	.grup-karti:hover {
		color: var(--metin);
		border-color: var(--vurgu);
	}
	.simge {
		display: grid;
		place-items: center;
		flex: none;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: var(--yaricap-tam);
		background: var(--vurgu-zemin);
		color: var(--vurgu-guclu);
	}
	.metin {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	@media (min-width: 56rem) {
		.duzen {
			grid-template-columns: 1.4fr 1fr;
		}
	}
</style>
