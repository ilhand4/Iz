<script lang="ts">
	// Silme sonrası yönlendirilen liste sayfasında "Geri al"lı baloncuk gösterir
	// ve adresteki ?silindi= parametresini geçmişi kirletmeden kaldırır.
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { bildirimler } from '#lib/bildirim.svelte.ts';

	let { silinen }: { silinen: { tur: 'dugum' | 'iz'; id: string; baslik: string } | null } =
		$props();

	let gosterilen: string | null = null;
	$effect(() => {
		if (!silinen || gosterilen === silinen.id) return;
		gosterilen = silinen.id;
		bildirimler.goster({
			mesaj: `“${silinen.baslik}” çöp kutusuna taşındı.`,
			geriAl: {
				eylem: '/cop-kutusu?/geriYukle',
				alanlar: { tur: silinen.tur, id: silinen.id }
			},
			baglanti: { href: '/cop-kutusu', metin: 'Çöp kutusu' }
		});
		const adres = new URL(page.url.href);
		adres.searchParams.delete('silindi');
		goto(adres, { replace: true, shallow: true });
	});
</script>

{#if silinen}
	<!-- JavaScript kapalıysa baloncuk yerine düz bir bildirim -->
	<noscript>
		<p class="bildirim bildirim-basari">
			“{silinen.baslik}” çöp kutusuna taşındı. <a href="/cop-kutusu">Çöp kutusundan</a> geri yükleyebilirsin.
		</p>
	</noscript>
{/if}
