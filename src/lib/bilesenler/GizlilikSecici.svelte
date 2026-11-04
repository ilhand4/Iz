<script lang="ts">
	import {
		GIZLILIK_ACIKLAMASI,
		GIZLILIK_DUZEYLERI,
		GIZLILIK_ETIKETI,
		type Gizlilik
	} from '#lib/sabitler.ts';
	import Simge from './Simge.svelte';

	type Props = {
		secili?: string;
		hata?: string | null;
		baslik?: string;
		/** Sunulacak düzeyler (izlerde "gölge" yok) */
		duzeyler?: readonly Gizlilik[];
	};
	let {
		secili = 'ozel',
		hata = null,
		baslik = 'Kim görebilir?',
		duzeyler = GIZLILIK_DUZEYLERI
	}: Props = $props();
	const SIMGE: Record<Gizlilik, 'kilit' | 'grup' | 'baglanti' | 'dunya'> = {
		ozel: 'kilit',
		grup: 'grup',
		golge: 'baglanti',
		herkes: 'dunya'
	};
</script>

<fieldset class="alan">
	<legend class="etiket">{baslik}</legend>
	<div class="secenekler">
		{#each duzeyler as g (g)}
			<label class="secenek">
				<input type="radio" name="gizlilik" value={g} checked={(secili || 'ozel') === g} />
				<span class="simge"><Simge ad={SIMGE[g]} boyut={18} /></span>
				<span class="metin">
					<strong>{GIZLILIK_ETIKETI[g]}</strong>
					<small>{GIZLILIK_ACIKLAMASI[g]}</small>
				</span>
			</label>
		{/each}
	</div>
	{#if hata}<span class="hata-metni">{hata}</span>{/if}
</fieldset>

<style>
	.etiket {
		font-weight: 550;
		font-size: var(--boyut-sm);
		margin-bottom: var(--a-2);
	}
	.secenekler {
		display: grid;
		gap: var(--a-2);
	}
	.secenek {
		position: relative;
		display: flex;
		gap: var(--a-3);
		align-items: flex-start;
		padding: var(--a-3);
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap);
		background: var(--yuzey);
		cursor: pointer;
		transition:
			border-color var(--gecis),
			background var(--gecis);
	}
	.secenek:hover {
		border-color: var(--cizgi-guclu);
	}
	.secenek:has(input:checked) {
		border-color: var(--vurgu);
		background: var(--vurgu-zemin);
	}
	.secenek:has(input:focus-visible) {
		outline: 2px solid var(--vurgu);
		outline-offset: 2px;
	}
	input {
		position: absolute;
		opacity: 0;
		inset: 0;
		margin: 0;
		cursor: pointer;
	}
	.simge {
		display: grid;
		place-items: center;
		flex: none;
		width: 2rem;
		height: 2rem;
		border-radius: var(--yaricap-tam);
		background: var(--yuzey-2);
		color: var(--metin-soluk);
	}
	.secenek:has(input:checked) .simge {
		background: var(--vurgu);
		color: var(--vurgu-uzeri);
	}
	.metin {
		display: flex;
		flex-direction: column;
	}
	small {
		color: var(--metin-soluk);
		font-size: var(--boyut-xs);
		line-height: 1.4;
	}
	@media (min-width: 40rem) {
		.secenekler {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
