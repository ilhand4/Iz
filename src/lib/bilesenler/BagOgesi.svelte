<script lang="ts">
	import { enhance } from '$app/forms';
	import type { DugumTuru, EserTuru, TarihHassasiyeti } from '#lib/sabitler.ts';
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
			dugum: { id: string; baslik: string; tur: DugumTuru; eserTuru: EserTuru | null };
		};
		yon: 'giden' | 'gelen';
		duzenlenebilir: boolean;
		/** Bu bağın düzenleme formundan dönen hatalar */
		hatalar?: Record<string, string> | null;
		degerler?: Record<string, string> | null;
	};
	let { bag, yon, duzenlenebilir, hatalar = null, degerler = null }: Props = $props();
	let detay: HTMLDetailsElement | undefined = $state();
</script>

<li class="bag">
	<span class="ok" aria-hidden="true">{yon === 'giden' ? '→' : '←'}</span>
	<div class="govde">
		<div class="baslik-satiri">
			<a href="/dugumler/{bag.dugum.id}">{bag.dugum.baslik}</a>
			<TurRozeti tur={bag.dugum.tur} eserTuru={bag.dugum.eserTuru} />
		</div>
		{#if bag.not}<p class="not">“{bag.not}”</p>{/if}
		{#if bag.tarih}<p class="tarih">{tarihYaz(bag.tarih, bag.tarihHassasiyeti)}</p>{/if}

		{#if duzenlenebilir}
			<details class="duzenle" bind:this={detay} open={!!hatalar}>
				<summary>{bag.not || bag.tarih ? 'Notu düzenle' : 'Not ya da tarih ekle'}</summary>
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
					<div class="satir"><button class="dugme dugme-birincil dugme-kucuk">Kaydet</button></div>
				</form>
			</details>
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
