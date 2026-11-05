<script lang="ts">
	import { enhance } from '$app/forms';
	import Alan from '#lib/bilesenler/Alan.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let gonderiliyor = $state(false);

	const KAYNAKLAR = [
		{
			id: 'goodreads',
			ad: 'Goodreads',
			ipucu:
				'Goodreads → My Books → Import and export → Export Library (CSV). Okuduğun, okumakta olduğun ve okumak istediğin kitaplar.'
		},
		{
			id: 'letterboxd',
			ad: 'Letterboxd',
			ipucu:
				'Letterboxd → Settings → Import & Export → Export your data. Zip içindeki diary.csv ya da watched.csv (watchlist.csv merak listesine).'
		},
		{
			id: 'spotify',
			ad: 'Spotify',
			ipucu:
				'Spotify → Hesap → Gizlilik → Verilerini indir. StreamingHistory0.json dosyası. En çok dinlediğin parçalar eklenir.'
		},
		{
			id: 'kindle',
			ad: 'Kindle alıntıları',
			ipucu:
				'Kindle’ı bilgisayara bağla: documents/My Clippings.txt. Vurguladığın satırlar kitaplarına alıntı olarak eklenir.'
		}
	] as const;
</script>

<svelte:head><title>Başka yerden getir · İz</title></svelte:head>

<div class="kap kap-orta yigin">
	<SayfaBasligi
		ust="Haritan"
		baslik="Başka yerden getir"
		aciklama="Okuduklarını, izlediklerini ve dinlediklerini getir. Her şey özel olarak eklenir; aynı eser zaten haritandaysa yenisi açılmaz. Sonra bağ avıyla neyin seni neye götürdüğünü birlikte buluruz."
	/>

	<form
		method="POST"
		enctype="multipart/form-data"
		class="kart yigin"
		use:enhance={() => {
			gonderiliyor = true;
			return async ({ update }) => {
				await update({ reset: false });
				gonderiliyor = false;
			};
		}}
	>
		{#if form?.hata}<p class="bildirim bildirim-hata" role="alert">{form.hata}</p>{/if}
		<fieldset class="kaynaklar">
			<legend>Kaynak</legend>
			{#each KAYNAKLAR as k (k.id)}
				<label class="kaynak">
					<input
						type="radio"
						name="kaynak"
						value={k.id}
						checked={(form?.kaynak ?? 'goodreads') === k.id}
					/>
					<span>
						<strong>{k.ad}</strong>
						<small class="soluk">{k.ipucu}</small>
					</span>
				</label>
			{/each}
		</fieldset>
		<Alan
			id="dosya"
			etiket="Dosya"
			ipucu="En fazla 5 MB. Dosya sunucuda saklanmaz; yalnızca okunur."
		>
			<input
				id="dosya"
				name="dosya"
				type="file"
				accept=".csv,.json,.txt,text/csv,application/json,text/plain"
				required
			/>
		</Alan>
		<div class="satir">
			<button class="dugme dugme-birincil" disabled={gonderiliyor}>
				{gonderiliyor ? 'Getiriliyor…' : 'Getir'}
			</button>
		</div>
	</form>
</div>

<style>
	.kaynaklar {
		border: 0;
		margin: 0;
		padding: 0;
		display: grid;
		gap: var(--a-2);
	}
	.kaynaklar legend {
		font-weight: 550;
		font-size: var(--boyut-sm);
		margin-bottom: var(--a-2);
	}
	.kaynak {
		display: flex;
		gap: var(--a-3);
		align-items: flex-start;
		padding: var(--a-3);
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap);
		cursor: pointer;
	}
	.kaynak:has(input:checked) {
		border-color: var(--vurgu);
		background: var(--vurgu-zemin);
	}
	.kaynak input {
		margin-top: 0.25rem;
	}
	.kaynak span {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
</style>
