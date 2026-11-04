<script lang="ts">
	import { enhance } from '$app/forms';
	import { DONEM_RENGI_ADI, DONEM_RENGI_DEGISKENI, DONEM_RENKLERI } from '#lib/sabitler.ts';
	import Alan from './Alan.svelte';

	type Props = {
		eylem: string;
		onek: string;
		degerler?: Record<string, string>;
		hatalar?: Record<string, string>;
		gonderMetni: string;
		id?: string;
	};
	let { eylem, onek, degerler = {}, hatalar = {}, gonderMetni, id }: Props = $props();
</script>

<form method="POST" action={eylem} class="yigin" use:enhance>
	{#if id}<input type="hidden" name="id" value={id} />{/if}
	<Alan id="{onek}-ad" etiket="Dönemin adı" hata={hatalar.ad} ipucu="ör. “Kadıköy yılları”">
		<input id="{onek}-ad" name="ad" maxlength="80" required value={degerler.ad ?? ''} />
	</Alan>
	<div class="iki">
		<Alan id="{onek}-bas" etiket="Başlangıç" hata={hatalar.baslangic} ipucu="2004 · 2004-09">
			<input
				id="{onek}-bas"
				name="baslangic"
				inputmode="numeric"
				required
				value={degerler.baslangic ?? ''}
			/>
		</Alan>
		<Alan id="{onek}-bit" etiket="Bitiş" hata={hatalar.bitis} ipucu="Boşsa: sürüyor">
			<input id="{onek}-bit" name="bitis" inputmode="numeric" value={degerler.bitis ?? ''} />
		</Alan>
	</div>
	<fieldset class="renkler">
		<legend>Renk</legend>
		{#each DONEM_RENKLERI as r (r)}
			<label class="renk" style:--renk="var({DONEM_RENGI_DEGISKENI[r]})">
				<input type="radio" name="renk" value={r} checked={(degerler.renk || 'kiremit') === r} />
				<span class="ornek" aria-hidden="true"></span>
				{DONEM_RENGI_ADI[r]}
			</label>
		{/each}
	</fieldset>
	<div class="satir"><button class="dugme dugme-birincil">{gonderMetni}</button></div>
</form>

<style>
	.iki {
		display: grid;
		gap: var(--a-3);
		grid-template-columns: 1fr 1fr;
	}
	.renkler {
		border: 0;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-2);
	}
	.renkler legend {
		font-weight: 550;
		font-size: var(--boyut-sm);
		margin-bottom: var(--a-2);
	}
	.renk {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
		padding: var(--a-1) var(--a-2);
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap-tam);
		font-size: var(--boyut-sm);
		cursor: pointer;
	}
	.renk:has(input:checked) {
		border-color: var(--renk);
		box-shadow: inset 0 0 0 1px var(--renk);
	}
	.renk input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.renk:has(input:focus-visible) {
		outline: 2px solid var(--vurgu);
		outline-offset: 2px;
	}
	.ornek {
		width: 0.9rem;
		height: 0.9rem;
		border-radius: var(--yaricap-tam);
		background: var(--renk);
	}
</style>
