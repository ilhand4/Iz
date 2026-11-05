<script lang="ts">
	import { enhance } from '$app/forms';
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import TurSekli from '#lib/bilesenler/TurSekli.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const s = $derived(data.soru);
</script>

<svelte:head><title>Bağ avı · İz</title></svelte:head>

<div class="kap kap-orta yigin">
	<SayfaBasligi
		ust="Haritan"
		baslik="Bağ avı"
		aciklama="Her seferinde tek soru: bu ikisi arasında bir yol var mı? “Evet” dersen bağ kurulur; “Hayır” dersen bir daha sorulmaz."
	/>

	{#if data.aktarma}
		<p class="bildirim bildirim-basari" role="status">
			Getirildi: {data.aktarma.eklenen} yeni eser{data.aktarma.birlesen
				? `, ${data.aktarma.birlesen} tanesi zaten haritandaydı`
				: ''}{data.aktarma.alinti ? `, ${data.aktarma.alinti} alıntı` : ''}. Şimdi aralarındaki
			yolları bulalım.
		</p>
	{/if}

	{#if s}
		<section class="kart soru" aria-labelledby="soru-baslik">
			<p class="gerekce kucuk soluk">
				{s.gerekce === 'ayni-yapimci' ? 'Aynı yazar ya da sanatçı' : 'Hemen öncesinde'}
			</p>
			<h2 id="soru-baslik">
				<a href="/dugumler/{s.hedef.id}">“{s.hedef.baslik}”</a>
				düğümüne
				<a href="/dugumler/{s.kaynak.id}">“{s.kaynak.baslik}”</a>
				düğümünden mi geldin?
			</h2>
			<div class="ikili" aria-hidden="true">
				<span><TurSekli tur={s.kaynak.tur} boyut={14} /> {s.kaynak.baslik}</span>
				<span class="ok">→</span>
				<span><TurSekli tur={s.hedef.tur} boyut={14} /> {s.hedef.baslik}</span>
			</div>
			<form method="POST" class="yigin" use:enhance>
				<input type="hidden" name="kaynakId" value={s.kaynak.id} />
				<input type="hidden" name="hedefId" value={s.hedef.id} />
				<label class="gorunmez" for="not">Nasıl? (isteğe bağlı)</label>
				<input id="not" name="not" maxlength="1000" placeholder="Nasıl? (isteğe bağlı)" />
				<div class="satir">
					<button class="dugme dugme-birincil" name="cevap" value="evet">Evet, oradan geldim</button
					>
					<button class="dugme" name="cevap" value="hayir">Hayır</button>
				</div>
			</form>
		</section>
	{:else}
		<BosDurum
			baslik="Şimdilik soracak bir şey kalmadı"
			aciklama="Yeni düğümler ekledikçe ya da başka yerden getirdikçe bağ avı yeniden başlar."
		>
			{#snippet eylemler()}
				<a class="dugme dugme-birincil" href="/dugumler/ag">Ağına bak</a>
				<a class="dugme" href="/ice-aktar">Başka yerden getir</a>
			{/snippet}
		</BosDurum>
	{/if}
</div>

<style>
	.soru {
		display: flex;
		flex-direction: column;
		gap: var(--a-4);
	}
	.soru h2 {
		margin: 0;
		font-size: var(--boyut-2xl);
		line-height: 1.3;
	}
	.soru h2 a {
		color: var(--metin);
		text-decoration-color: var(--vurgu);
	}
	.gerekce {
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-weight: 700;
	}
	.ikili {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--a-2) var(--a-3);
		font-weight: 600;
	}
	.ikili span {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
	}
	.ok {
		color: var(--vurgu);
		font-size: var(--boyut-xl);
	}
</style>
