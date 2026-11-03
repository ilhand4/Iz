<script lang="ts">
	import {
		DUGUM_TURU_ETIKETI,
		ESER_TURU_ETIKETI,
		type DugumTuru,
		type EserTuru
	} from '#lib/sabitler.ts';

	let { tur, eserTuru = null }: { tur: DugumTuru; eserTuru?: EserTuru | null } = $props();
</script>

<span class="rozet" data-tur={tur}>
	{eserTuru ? ESER_TURU_ETIKETI[eserTuru] : DUGUM_TURU_ETIKETI[tur]}
</span>
