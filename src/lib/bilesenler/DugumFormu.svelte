<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Snippet } from 'svelte';
	import {
		DUGUM_TURLERI,
		DUGUM_TURU_ETIKETI,
		ESER_TURLERI,
		ESER_TURU_ETIKETI,
		GIZLILIK_ACIKLAMASI,
		GIZLILIK_DUZEYLERI,
		GIZLILIK_ETIKETI
	} from '#lib/sabitler.ts';
	import Alan from './Alan.svelte';

	type Props = {
		degerler?: Record<string, string>;
		hatalar?: Record<string, string>;
		gonderMetni: string;
		/** Form eylemi, ör. "?/kaydet"; boşsa varsayılan eylem */
		eylem?: string;
		ek?: Snippet;
	};
	let { degerler = {}, hatalar = {}, gonderMetni, eylem, ek }: Props = $props();
	let gonderiliyor = $state(false);

	const d = (ad: string) => degerler[ad] ?? '';
</script>

<form
	method="POST"
	action={eylem}
	class="yigin dugum-formu"
	novalidate
	use:enhance={() => {
		gonderiliyor = true;
		return async ({ update }) => {
			await update({ reset: false });
			gonderiliyor = false;
		};
	}}
>
	{#if hatalar.genel}<p class="bildirim bildirim-hata" role="alert">{hatalar.genel}</p>{/if}

	<fieldset class="alan">
		<legend class="etiket">Tür</legend>
		<div class="secenekler">
			{#each DUGUM_TURLERI as tur (tur)}
				<label class="secenek" data-tur={tur}>
					<input type="radio" name="tur" value={tur} checked={(d('tur') || 'eser') === tur} />
					<span>{DUGUM_TURU_ETIKETI[tur]}</span>
				</label>
			{/each}
		</div>
		{#if hatalar.tur}<span class="hata-metni">{hatalar.tur}</span>{/if}
	</fieldset>

	<div class="eser-alani">
		<Alan id="eserTuru" etiket="Eser türü" hata={hatalar.eserTuru}>
			<select id="eserTuru" name="eserTuru" aria-invalid={!!hatalar.eserTuru}>
				{#each ESER_TURLERI as et (et)}
					<option value={et} selected={(d('eserTuru') || 'kitap') === et}>{ESER_TURU_ETIKETI[et]}</option>
				{/each}
			</select>
		</Alan>
	</div>

	<Alan id="baslik" etiket="Başlık" hata={hatalar.baslik}>
		<input id="baslik" name="baslik" value={d('baslik')} maxlength="200" required aria-invalid={!!hatalar.baslik} />
	</Alan>

	<Alan
		id="altBaslik"
		etiket="Kısa bilgi"
		hata={hatalar.altBaslik}
		ipucu="Eser için yazar/yönetmen/sanatçı; kişi için kim olduğu (ör. “lise öğretmenim”)."
	>
		<input id="altBaslik" name="altBaslik" value={d('altBaslik')} maxlength="200" />
	</Alan>

	<div class="iki">
		<Alan id="tarih" etiket="Ne zaman?" hata={hatalar.tarih} ipucu="Yıl, ay ya da gün: 1998 · 1998-05 · 12.05.1998">
			<input id="tarih" name="tarih" value={d('tarih')} inputmode="numeric" placeholder="ör. 2019" aria-invalid={!!hatalar.tarih} />
		</Alan>
		<div class="eser-alani">
			<Alan id="yil" etiket="Yayın yılı" hata={hatalar.yil}>
				<input id="yil" name="yil" value={d('yil')} inputmode="numeric" maxlength="4" aria-invalid={!!hatalar.yil} />
			</Alan>
		</div>
	</div>

	<Alan id="aciklama" etiket="Açıklama" hata={hatalar.aciklama}>
		<textarea id="aciklama" name="aciklama" maxlength="5000" rows="4">{d('aciklama')}</textarea>
	</Alan>

	<details class="konum" open={!!(d('enlem') || d('yerAdi') || hatalar.enlem || hatalar.boylam)}>
		<summary>Konum (isteğe bağlı)</summary>
		<div class="yigin">
			<Alan id="yerAdi" etiket="Yer adı" hata={hatalar.yerAdi}>
				<input id="yerAdi" name="yerAdi" value={d('yerAdi')} maxlength="200" placeholder="ör. Kadıköy, İstanbul" />
			</Alan>
			<div class="iki">
				<Alan id="enlem" etiket="Enlem" hata={hatalar.enlem}>
					<input id="enlem" name="enlem" value={d('enlem')} inputmode="decimal" placeholder="40.9909" aria-invalid={!!hatalar.enlem} />
				</Alan>
				<Alan id="boylam" etiket="Boylam" hata={hatalar.boylam}>
					<input id="boylam" name="boylam" value={d('boylam')} inputmode="decimal" placeholder="29.0303" aria-invalid={!!hatalar.boylam} />
				</Alan>
			</div>
			<p class="kucuk soluk">Harita görünümü geldiğinde konumu haritadan seçebileceksin.</p>
		</div>
	</details>

	<fieldset class="alan">
		<legend class="etiket">Kim görebilir?</legend>
		<div class="gizlilik-secenekleri">
			{#each GIZLILIK_DUZEYLERI as g (g)}
				<label class="gizlilik-secenek">
					<input type="radio" name="gizlilik" value={g} checked={(d('gizlilik') || 'ozel') === g} />
					<span><strong>{GIZLILIK_ETIKETI[g]}</strong><small>{GIZLILIK_ACIKLAMASI[g]}</small></span>
				</label>
			{/each}
		</div>
		{#if hatalar.gizlilik}<span class="hata-metni">{hatalar.gizlilik}</span>{/if}
	</fieldset>

	{@render ek?.()}

	<div class="satir">
		<button class="dugme dugme-birincil" disabled={gonderiliyor}>
			{gonderiliyor ? 'Kaydediliyor…' : gonderMetni}
		</button>
	</div>
</form>

<style>
	.etiket {
		font-weight: 550;
		font-size: var(--boyut-sm);
		margin-bottom: var(--a-2);
	}
	.secenekler {
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-2);
	}
	.secenek {
		position: relative;
		cursor: pointer;
	}
	.secenek input {
		position: absolute;
		opacity: 0;
		inset: 0;
		margin: 0;
		cursor: pointer;
	}
	.secenek span {
		display: inline-flex;
		align-items: center;
		min-height: 2.5rem;
		padding: 0 var(--a-4);
		border-radius: var(--yaricap-tam);
		border: 1px solid var(--cizgi-guclu);
		background: var(--yuzey);
		font-weight: 550;
		font-size: var(--boyut-sm);
	}
	.secenek input:checked + span {
		background: var(--renk-zemin);
		border-color: var(--renk);
		color: var(--renk);
	}
	.secenek input:focus-visible + span {
		outline: 2px solid var(--vurgu);
		outline-offset: 2px;
	}
	.secenek[data-tur='eser'] {
		--renk: var(--tur-eser);
		--renk-zemin: var(--tur-eser-zemin);
	}
	.secenek[data-tur='kisi'] {
		--renk: var(--tur-kisi);
		--renk-zemin: var(--tur-kisi-zemin);
	}
	.secenek[data-tur='yer'] {
		--renk: var(--tur-yer);
		--renk-zemin: var(--tur-yer-zemin);
	}
	.secenek[data-tur='karar'] {
		--renk: var(--tur-karar);
		--renk-zemin: var(--tur-karar-zemin);
	}
	.secenek[data-tur='ani'] {
		--renk: var(--tur-ani);
		--renk-zemin: var(--tur-ani-zemin);
	}

	/* Eser alanları yalnızca "Eser" seçiliyken görünür (JavaScript gerekmez) */
	.eser-alani {
		display: none;
	}
	.dugum-formu:has(input[name='tur'][value='eser']:checked) .eser-alani {
		display: block;
	}

	.iki {
		display: grid;
		gap: var(--a-4);
	}
	@media (min-width: 36rem) {
		.iki {
			grid-template-columns: 1fr 1fr;
		}
	}

	.konum {
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap);
		padding: var(--a-3) var(--a-4);
		background: var(--yuzey-2);
	}
	.konum summary {
		cursor: pointer;
		font-weight: 550;
		font-size: var(--boyut-sm);
	}
	.konum[open] summary {
		margin-bottom: var(--a-3);
	}
	.konum p {
		margin: 0;
	}

	.gizlilik-secenekleri {
		display: grid;
		gap: var(--a-2);
	}
	.gizlilik-secenek {
		display: flex;
		gap: var(--a-3);
		align-items: flex-start;
		padding: var(--a-3);
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap);
		background: var(--yuzey);
		cursor: pointer;
	}
	.gizlilik-secenek:has(input:checked) {
		border-color: var(--vurgu);
		background: var(--vurgu-zemin);
	}
	.gizlilik-secenek input {
		margin-top: 0.3rem;
		accent-color: var(--vurgu);
	}
	.gizlilik-secenek span {
		display: flex;
		flex-direction: column;
	}
	.gizlilik-secenek small {
		color: var(--metin-soluk);
		font-size: var(--boyut-xs);
	}
	@media (min-width: 40rem) {
		.gizlilik-secenekleri {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
