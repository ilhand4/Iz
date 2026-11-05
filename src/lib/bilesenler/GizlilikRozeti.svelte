<script lang="ts">
	import { GIZLILIK_ACIKLAMASI, GIZLILIK_ETIKETI, type Gizlilik } from '#lib/sabitler.ts';
	import Simge from './Simge.svelte';
	import { ceviri } from '#lib/dilDurumu.svelte.ts';

	let { gizlilik }: { gizlilik: Gizlilik } = $props();
	const SIMGE = { ozel: 'kilit', grup: 'grup', golge: 'baglanti', herkes: 'dunya' } as const;
</script>

<span class="rozet" title={GIZLILIK_ACIKLAMASI[gizlilik]}>
	<Simge ad={SIMGE[gizlilik]} boyut={12} />
	{ceviri.dil === 'en' ? ceviri.t(`gizlilik.${gizlilik}`) : GIZLILIK_ETIKETI[gizlilik]}
</span>
