<script lang="ts">
	import Simge from './Simge.svelte';

	type Tema = 'sistem' | 'acik' | 'koyu';
	let { baslangic }: { baslangic: Tema } = $props();

	// svelte-ignore state_referenced_locally
	let tema = $state<Tema>(baslangic);

	const SIRA: Tema[] = ['sistem', 'acik', 'koyu'];
	const ETIKET: Record<Tema, string> = {
		sistem: 'Tema: sistem ayarı',
		acik: 'Tema: açık',
		koyu: 'Tema: koyu'
	};

	function degistir() {
		tema = SIRA[(SIRA.indexOf(tema) + 1) % SIRA.length];
		const kok = document.documentElement;
		if (tema === 'sistem') {
			kok.removeAttribute('data-theme');
			document.cookie = 'tema=; path=/; max-age=0; samesite=lax';
		} else {
			kok.dataset.theme = tema;
			document.cookie = `tema=${tema}; path=/; max-age=31536000; samesite=lax`;
		}
	}
</script>

<button
	type="button"
	class="dugme dugme-hayalet dugme-kucuk"
	onclick={degistir}
	title={ETIKET[tema]}
	aria-label={ETIKET[tema]}
>
	<Simge ad={tema === 'acik' ? 'gunes' : tema === 'koyu' ? 'ay' : 'otomatik'} />
</button>
