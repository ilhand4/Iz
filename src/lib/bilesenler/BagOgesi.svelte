<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		BAG_TURU_ACIKLAMASI,
		BAG_TURU_ETIKETI,
		bagTuruMu,
		type DugumTuru,
		type EserTuru,
		type TarihHassasiyeti
	} from '#lib/sabitler.ts';
	import BagTuruSecici from './BagTuruSecici.svelte';
	import { tarihGirdisi, tarihYaz } from '#lib/tarih.ts';
	import Alan from './Alan.svelte';
	import Simge from './Simge.svelte';
	import TurRozeti from './TurRozeti.svelte';

	type Props = {
		bag: {
			id: string;
			not: string | null;
			tarih: string | null;
			tarihHassasiyeti: TarihHassasiyeti | null;
			tur?: string | null;
			alinti?: { id: string | null; metin: string | null; yer: string | null } | null;
			dugum: { id: string; baslik: string; tur: DugumTuru; eserTuru: EserTuru | null };
		};
		yon: 'giden' | 'gelen';
		duzenlenebilir: boolean;
		/** Giden bağlarda: bu düğümün alıntıları (bağı bir alıntıya iliştirmek için) */
		alintiSecenekleri?: { id: string; metin: string }[];
		/** Bu bağın düzenleme formundan dönen hatalar */
		hatalar?: Record<string, string> | null;
		degerler?: Record<string, string> | null;
	};
	let {
		bag,
		yon,
		duzenlenebilir,
		alintiSecenekleri = [],
		hatalar = null,
		degerler = null
	}: Props = $props();
	let detay: HTMLDetailsElement | undefined = $state();
</script>

<li class="bag">
	<span class="ok" aria-hidden="true">{yon === 'giden' ? '→' : '←'}</span>
	<div class="govde">
		<div class="baslik-satiri">
			<a href="/dugumler/{bag.dugum.id}">{bag.dugum.baslik}</a>
			<TurRozeti tur={bag.dugum.tur} eserTuru={bag.dugum.eserTuru} />
			{#if bag.tur && bagTuruMu(bag.tur)}
				<span class="rozet bag-turu" data-bag={bag.tur} title={BAG_TURU_ACIKLAMASI[bag.tur]}
					>{BAG_TURU_ETIKETI[bag.tur]}</span
				>
			{/if}
		</div>
		{#if bag.not}<p class="not">“{bag.not}”</p>{/if}
		{#if bag.alinti?.id && bag.alinti.metin}
			<blockquote class="alinti">
				{bag.alinti.metin}
				{#if bag.alinti.yer}<cite>{bag.alinti.yer}</cite>{/if}
			</blockquote>
		{/if}
		{#if bag.tarih}<p class="tarih">{tarihYaz(bag.tarih, bag.tarihHassasiyeti)}</p>{/if}

		{#if duzenlenebilir}
			<details class="duzenle" bind:this={detay} open={!!hatalar}>
				<summary
					>{bag.not || bag.tarih || bag.tur ? 'Bağı düzenle' : 'Not, tarih ya da tür ekle'}</summary
				>
				<form
					method="POST"
					action="?/bagGuncelle"
					class="yigin"
					use:enhance={() =>
						async ({ update, result }) => {
							await update({ reset: false });
							if (result.type === 'success' && detay) detay.open = false;
						}}
				>
					<input type="hidden" name="bagId" value={bag.id} />
					<Alan
						id="not-{bag.id}"
						etiket="Nasıl {yon === 'giden' ? 'götürdü' : 'getirdi'}?"
						hata={hatalar?.not}
					>
						<input
							id="not-{bag.id}"
							name="not"
							maxlength="1000"
							value={degerler?.not ?? bag.not ?? ''}
							aria-invalid={!!hatalar?.not}
						/>
					</Alan>
					<Alan
						id="tarih-{bag.id}"
						etiket="Ne zaman?"
						hata={hatalar?.tarih}
						ipucu="2021 · 2021-03 · 14.03.2021"
					>
						<input
							id="tarih-{bag.id}"
							name="tarih"
							inputmode="numeric"
							value={degerler?.tarih ?? tarihGirdisi(bag.tarih, bag.tarihHassasiyeti)}
							aria-invalid={!!hatalar?.tarih}
						/>
					</Alan>
					<BagTuruSecici id="tur-{bag.id}" secili={degerler?.tur ?? bag.tur} />
					<div class="satir"><button class="dugme dugme-birincil dugme-kucuk">Kaydet</button></div>
				</form>
			</details>
			{#if alintiSecenekleri.length}
				<form method="POST" action="?/bagAlintisi" class="alinti-formu" use:enhance>
					<input type="hidden" name="bagId" value={bag.id} />
					<label class="kucuk soluk" for="alinti-{bag.id}">Alıntıya işaret et</label>
					<select id="alinti-{bag.id}" name="alintiId">
						<option value="">Yok</option>
						{#each alintiSecenekleri as a (a.id)}
							<option value={a.id} selected={bag.alinti?.id === a.id}
								>{a.metin.length > 60 ? a.metin.slice(0, 59) + '…' : a.metin}</option
							>
						{/each}
					</select>
					<button class="dugme dugme-kucuk">İliştir</button>
				</form>
			{/if}
		{/if}
	</div>
	{#if duzenlenebilir}
		<form method="POST" action="?/bagSil" use:enhance>
			<input type="hidden" name="bagId" value={bag.id} />
			<button
				class="dugme dugme-hayalet dugme-kucuk sil"
				aria-label="“{bag.dugum.baslik}” bağını kaldır"
				title="Bağı kaldır"
			>
				<Simge ad="cop" boyut={16} />
			</button>
		</form>
	{/if}
</li>

<style>
	.alinti {
		margin: var(--a-2) 0 0;
		padding: var(--a-1) var(--a-3);
		border-left: 3px solid var(--tur-eser);
		font-family: var(--yazi-baslik);
		font-style: italic;
		font-size: var(--boyut-sm);
	}
	.alinti cite {
		display: block;
		font-family: var(--yazi-govde);
		font-style: normal;
		font-size: var(--boyut-xs);
		color: var(--metin-soluk);
	}
	.alinti-formu {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--a-2);
		margin-top: var(--a-2);
	}
	.alinti-formu select {
		flex: 1 1 10rem;
		min-width: 0;
	}
	.bag-turu {
		background: var(--yuzey-2);
		color: var(--metin);
		box-shadow: inset 3px 0 0 var(--bag-renk, var(--cizgi-guclu));
	}
	.bag-turu[data-bag='besler'] {
		--bag-renk: var(--tur-yer);
	}
	.bag-turu[data-bag='celisir'] {
		--bag-renk: var(--hata);
	}
	.bag-turu[data-bag='cagristirir'] {
		--bag-renk: var(--tur-ani);
	}
	.bag-turu[data-bag='sentezler'] {
		--bag-renk: var(--tur-karar);
	}
	.bag {
		display: flex;
		gap: var(--a-3);
		align-items: flex-start;
		padding: var(--a-3);
		background: var(--yuzey);
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap);
	}
	.ok {
		color: var(--vurgu);
		font-weight: 700;
		line-height: 1.6;
	}
	.govde {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.baslik-satiri {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--a-1) var(--a-2);
	}
	.baslik-satiri a {
		font-weight: 600;
		color: var(--metin);
	}
	.baslik-satiri a:hover {
		color: var(--vurgu);
	}
	p {
		margin: 0;
	}
	.not {
		font-style: italic;
		color: var(--metin-soluk);
		font-size: var(--boyut-sm);
	}
	.tarih {
		font-size: var(--boyut-xs);
		color: var(--metin-silik);
	}
	.duzenle {
		margin-top: var(--a-1);
	}
	.duzenle summary {
		width: fit-content;
		font-size: var(--boyut-xs);
		font-weight: 550;
		color: var(--metin-soluk);
		cursor: pointer;
	}
	.duzenle summary:hover {
		color: var(--vurgu);
	}
	.duzenle[open] summary {
		margin-bottom: var(--a-3);
	}
	.sil {
		color: var(--metin-silik);
	}
	.sil:hover {
		color: var(--hata);
		background: var(--hata-zemin);
	}
</style>
