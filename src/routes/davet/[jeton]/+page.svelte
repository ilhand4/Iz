<script lang="ts">
	import { page } from '$app/state';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const donus = $derived(encodeURIComponent(page.url.pathname));
</script>

<svelte:head>
	<title>Grup daveti · İz</title>
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<div class="kap kap-dar">
	<div class="kart davet-karti yigin">
		{#if data.grup}
			<span class="simge" aria-hidden="true"><Simge ad="grup" boyut={28} /></span>
			<h1>“{data.grup.ad}” grubuna davet edildin</h1>
			{#if data.grup.aciklama}<p>{data.grup.aciklama}</p>{/if}
			<p class="kucuk soluk">
				{data.grup.uyeSayisi} üye. Katılınca grup arkadaşların, gizliliği “Gruplarım” olan düğüm ve izlerini
				görür; sen de onlarınkini. Özel içeriğin özel kalır.
			</p>
			{#if data.girisli}
				<form method="POST">
					<button class="dugme dugme-birincil">Gruba katıl</button>
				</form>
			{:else}
				<div class="satir">
					<a class="dugme dugme-birincil" href="/giris?donus={donus}">Giriş yap ve katıl</a>
					<a class="dugme" href="/kayit">Hesap aç</a>
				</div>
			{/if}
		{:else}
			<h1>Bu davet geçersiz</h1>
			<p class="soluk">
				Bağlantının süresi dolmuş ya da grup yöneticisi kapatmış. Yeni bir bağlantı iste.
			</p>
		{/if}
	</div>
</div>

<style>
	.davet-karti {
		max-width: 30rem;
		margin: var(--a-4) auto;
		text-align: center;
		align-items: center;
	}
	h1 {
		font-size: var(--boyut-2xl);
		margin: 0;
	}
	p,
	form {
		margin: 0;
	}
	.simge {
		display: grid;
		place-items: center;
		width: 3.5rem;
		height: 3.5rem;
		border-radius: var(--yaricap-tam);
		background: var(--vurgu-zemin);
		color: var(--vurgu-guclu);
	}
</style>
