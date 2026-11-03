<script lang="ts">
	import DugumFormu from '#lib/bilesenler/DugumFormu.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Düzenle: {data.baslik} · İz</title></svelte:head>

<div class="kap kap-dar yigin">
	<div>
		<a href="/dugumler/{data.id}" class="kucuk">← {data.baslik}</a>
		<h1>Düğümü düzenle</h1>
	</div>

	<div class="kart">
		<DugumFormu
			degerler={(form?.degerler as Record<string, string> | undefined) ?? data.degerler}
			hatalar={form?.hatalar as Record<string, string> | undefined}
			gonderMetni="Değişiklikleri kaydet"
			eylem="?/kaydet"
		/>
	</div>

	<section class="kart tehlike">
		<h2>Düğümü sil</h2>
		<p class="soluk kucuk">Düğümle birlikte ona bağlı tüm bağlar ve izlerdeki adımları da silinir. Bu geri alınamaz.</p>
		<form method="POST" action="?/sil" class="satir">
			<label class="satir kucuk">
				<input type="checkbox" name="onay" value="evet" required />
				Evet, silmek istiyorum
			</label>
			<button class="dugme dugme-tehlike">
				<Simge ad="cop" boyut={16} /> Kalıcı olarak sil
			</button>
		</form>
	</section>
</div>

<style>
	h1 {
		font-size: var(--boyut-2xl);
		margin-top: var(--a-2);
	}
	.tehlike {
		border-color: color-mix(in srgb, var(--hata) 35%, var(--cizgi));
	}
	.tehlike h2 {
		font-size: var(--boyut-lg);
	}
	.tehlike form {
		justify-content: space-between;
	}
</style>
