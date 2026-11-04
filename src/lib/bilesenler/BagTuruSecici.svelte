<script lang="ts">
	// Bağın anlamı: isteğe bağlı. Seçilmezse "belirtilmemiş" kalır.
	import { BAG_TURLERI, BAG_TURU_ACIKLAMASI, BAG_TURU_ETIKETI } from '#lib/sabitler.ts';

	let { id, secili = '' }: { id: string; secili?: string | null } = $props();
</script>

<div class="alan">
	<label for={id}>Nasıl bir bağ?</label>
	<select {id} name="tur">
		<option value="" selected={!secili}>Belirtilmemiş</option>
		{#each BAG_TURLERI as t (t)}
			<option value={t} selected={secili === t} title={BAG_TURU_ACIKLAMASI[t]}
				>{BAG_TURU_ETIKETI[t]} · {BAG_TURU_ACIKLAMASI[t]}</option
			>
		{/each}
	</select>
</div>
