<script lang="ts">
	import { GIZLILIK_ACIKLAMASI, GIZLILIK_ETIKETI, type Gizlilik } from '#lib/sabitler.ts';
	import Simge from './Simge.svelte';

	let { gizlilik }: { gizlilik: Gizlilik } = $props();
	const SIMGE = { ozel: 'kilit', grup: 'grup', golge: 'baglanti', herkes: 'dunya' } as const;
</script>

<span class="rozet" title={GIZLILIK_ACIKLAMASI[gizlilik]}>
	<Simge ad={SIMGE[gizlilik]} boyut={12} />
	{GIZLILIK_ETIKETI[gizlilik]}
</span>
