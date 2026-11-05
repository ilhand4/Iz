<script lang="ts">
	import {
		DUGUM_TURU_ETIKETI,
		ESER_TURU_ETIKETI,
		type DugumTuru,
		type EserTuru
	} from '#lib/sabitler.ts';
	import TurSekli from './TurSekli.svelte';
	import { ceviri } from '#lib/dilDurumu.svelte.ts';
	import { TUR_ETIKETI } from '#lib/dil.ts';

	let { tur, eserTuru = null }: { tur: DugumTuru; eserTuru?: EserTuru | null } = $props();
</script>

<span class="rozet" data-tur={tur}>
	<TurSekli {tur} boyut={10} />
	{eserTuru
		? ceviri.dil === 'en'
			? ceviri.t(`eser.${eserTuru}`)
			: ESER_TURU_ETIKETI[eserTuru]
		: ceviri.dil === 'en'
			? TUR_ETIKETI.en[tur]
			: DUGUM_TURU_ETIKETI[tur]}
</span>
