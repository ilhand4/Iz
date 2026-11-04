<script lang="ts">
	// "Daha fazla göster": JavaScript varken sonraki sayfa listeye eklenir (sayfa kaydırması korunur);
	// yokken düz bir bağlantıdır ve sonraki sayfa ayrı açılır ("Baştan göster" ile dönülür).
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	type Props = {
		sonraki: string | null;
		/** Bu sayfa bir devam sayfası mı (adreste ?sonra= var mı) */
		devam: boolean;
		/** Önceki sayfalar bu görünümde birikmiş mi */
		birikti: boolean;
		/** Sonraki sayfa yüklenmeden hemen önce çağrılır (o anki listeyi saklamak için) */
		ononcesi: () => void;
	};
	let { sonraki, devam, birikti, ononcesi }: Props = $props();
	let yukleniyor = $state(false);

	function adres(imlec: string | null) {
		const u = new URL(page.url.href);
		if (imlec) u.searchParams.set('sonra', imlec);
		else u.searchParams.delete('sonra');
		return u.pathname + u.search;
	}

	async function devamEt(e: MouseEvent) {
		if (!sonraki || e.ctrlKey || e.metaKey || e.shiftKey) return;
		e.preventDefault();
		yukleniyor = true;
		ononcesi();
		await goto(adres(sonraki), { replace: true, reset: false });
		yukleniyor = false;
	}
</script>

{#if sonraki || (devam && !birikti)}
	<nav class="daha-fazla" aria-label="Sayfalar">
		{#if devam && !birikti}
			<a class="dugme dugme-hayalet" href={adres(null)}>Baştan göster</a>
		{/if}
		{#if sonraki}
			<a class="dugme" href={adres(sonraki)} onclick={devamEt} aria-busy={yukleniyor}>
				{yukleniyor ? 'Yükleniyor…' : 'Daha fazla göster'}
			</a>
		{/if}
	</nav>
{/if}

<style>
	.daha-fazla {
		display: flex;
		justify-content: center;
		gap: var(--a-3);
		padding-top: var(--a-2);
	}
</style>
