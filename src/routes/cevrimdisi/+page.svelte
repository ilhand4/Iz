<script lang="ts">
	import Logo from '#lib/bilesenler/Logo.svelte';
</script>

<svelte:head><title>Çevrimdışı · İz</title></svelte:head>

<div class="kap kap-dar cevrimdisi">
	<Logo boyut={40} />
	<h1>Şu an çevrimdışısın.</h1>
	<p>
		Bu sayfa daha önce açılmadığı için cihazında kopyası yok. Daha önce baktığın düğüm ve izler
		bağlantı yokken de açılır; bağlantı gelince her şey kaldığı yerden devam eder.
	</p>
	<button class="dugme dugme-birincil" onclick={() => location.reload()}>Yeniden dene</button>
</div>

<style>
	.cevrimdisi {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--a-4);
		padding-block: var(--a-8);
	}
	h1 {
		margin: 0;
		font-size: clamp(1.8rem, 4vw, 2.4rem);
		font-weight: 500;
	}
	p {
		margin: 0;
		color: var(--metin-soluk);
		line-height: 1.6;
	}
</style>
