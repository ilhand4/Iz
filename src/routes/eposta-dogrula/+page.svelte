<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>E-posta doğrulama · İz</title>
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<div class="kap kap-dar">
	<div class="kart hesap-karti">
		{#if data.eposta}
			<h1>E-postan doğrulandı</h1>
			<p class="soluk"><strong>{data.eposta}</strong> artık hesabına bağlı ve doğrulanmış.</p>
		{:else}
			<h1>Bağlantı geçersiz</h1>
			<p class="soluk">
				Bu doğrulama bağlantısının süresi dolmuş, daha önce kullanılmış ya da adresin bu arada
				değişmiş. Ayarlardan yeni bir bağlantı isteyebilirsin.
			</p>
		{/if}
		<div class="satir">
			{#if data.girisli}
				<a class="dugme dugme-birincil" href="/ayarlar#eposta">Ayarlara git</a>
			{:else}
				<a class="dugme dugme-birincil" href="/giris">Giriş yap</a>
			{/if}
		</div>
	</div>
</div>

<style>
	.hesap-karti {
		max-width: 28rem;
		margin: var(--a-4) auto;
	}
	h1 {
		font-size: var(--boyut-2xl);
	}
</style>
