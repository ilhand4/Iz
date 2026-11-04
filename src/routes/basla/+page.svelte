<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import Alan from '#lib/bilesenler/Alan.svelte';
	import Logo from '#lib/bilesenler/Logo.svelte';
	import TurSekli from '#lib/bilesenler/TurSekli.svelte';
	import {
		DUGUM_TURLERI,
		DUGUM_TURU_ETIKETI,
		ESER_TURLERI,
		ESER_TURU_ETIKETI,
		type DugumTuru
	} from '#lib/sabitler.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const h = $derived((form?.hatalar ?? {}) as Record<string, string>);
	// Yalnızca ilk değerler: JavaScript'siz gönderim hata verirse alanlar dolu gelsin
	const ilk = untrack(() => (form?.degerler ?? {}) as Record<string, string>);

	// Canlı önizleme için alanlar (JavaScript yokken form yine çalışır)
	let eserBaslik = $state(ilk.eserBaslik ?? '');
	let getirenBaslik = $state(ilk.getirenBaslik ?? '');
	let gidenBaslik = $state(ilk.gidenBaslik ?? '');
	let getirenTur = $state<DugumTuru>((ilk.getirenTur as DugumTuru) || 'kisi');
	let gidenTur = $state<DugumTuru>((ilk.gidenTur as DugumTuru) || 'eser');
	let gonderiliyor = $state(false);

	const ADIMLAR = [
		{ no: 1, soru: 'Hayatında iz bırakan bir eser', ipucu: 'Bir kitap, film, dizi, şarkı, oyun…' },
		{
			no: 2,
			soru: 'Seni ona ne getirdi?',
			ipucu: 'Bir kişi, bir yer, bir anı ya da başka bir eser'
		},
		{ no: 3, soru: 'O seni nereye götürdü?', ipucu: 'Bir sonraki kitap, bir karar, bir şehir…' }
	];
</script>

<svelte:head><title>İlk izin · İz</title></svelte:head>

{#snippet turSecici(ad: string, secili: DugumTuru, degistir: (t: DugumTuru) => void)}
	<div class="cipler" role="radiogroup" aria-label="Tür">
		{#each DUGUM_TURLERI as tur (tur)}
			<label class="cip" data-tur={tur}>
				<input
					type="radio"
					name={ad}
					value={tur}
					checked={secili === tur}
					onchange={() => degistir(tur)}
				/>
				<span><TurSekli {tur} boyut={11} /> {DUGUM_TURU_ETIKETI[tur]}</span>
			</label>
		{/each}
	</div>
{/snippet}

<div class="kap sihirbaz">
	<header class="giris">
		<Logo boyut={36} />
		<p class="ust">{data.hosgeldin ? 'Hoş geldin!' : 'Üç soruda'}</p>
		<h1>İlk izini birlikte çizelim</h1>
		<p class="aciklama">
			İz, neyin seni neye götürdüğünü kaydeder. Üç soruyu cevapla; haritanın ilk üç düğümü,
			aralarındaki bağlar ve ilk izin hazır olsun.
		</p>
	</header>

	<!-- Yazdıkça güncellenen önizleme -->
	<figure class="onizleme" aria-label="İzinin önizlemesi">
		<div class="durak" class:bos={!getirenBaslik} data-tur={getirenTur}>
			<TurSekli tur={getirenTur} boyut={22} />
			<span>{getirenBaslik || 'Seni ne getirdi?'}</span>
		</div>
		<span class="ok" aria-hidden="true"></span>
		<div class="durak merkez" class:bos={!eserBaslik} data-tur="eser">
			<TurSekli tur="eser" boyut={26} />
			<span>{eserBaslik || 'Eserin'}</span>
		</div>
		<span class="ok" aria-hidden="true"></span>
		<div class="durak" class:bos={!gidenBaslik} data-tur={gidenTur}>
			<TurSekli tur={gidenTur} boyut={22} />
			<span>{gidenBaslik || 'Nereye götürdü?'}</span>
		</div>
	</figure>

	<form
		method="POST"
		class="adimlar"
		novalidate
		use:enhance={() => {
			gonderiliyor = true;
			return async ({ update }) => {
				await update({ reset: false });
				gonderiliyor = false;
			};
		}}
	>
		<section class="adim kart">
			<span class="no" aria-hidden="true">{ADIMLAR[0].no}</span>
			<div class="adim-govde yigin">
				<h2>{ADIMLAR[0].soru}</h2>
				<p class="ipucu">{ADIMLAR[0].ipucu}</p>
				<div class="cipler" role="radiogroup" aria-label="Eser türü">
					{#each ESER_TURLERI as et (et)}
						<label class="cip" data-tur="eser">
							<input
								type="radio"
								name="eserTuru"
								value={et}
								checked={(ilk.eserTuru || 'kitap') === et}
							/>
							<span>{ESER_TURU_ETIKETI[et]}</span>
						</label>
					{/each}
				</div>
				<div class="iki">
					<Alan id="eserBaslik" etiket="Adı" hata={h.eserBaslik ?? h.eserTuru}>
						<input
							id="eserBaslik"
							name="eserBaslik"
							bind:value={eserBaslik}
							maxlength="200"
							placeholder="ör. Kürk Mantolu Madonna"
							aria-invalid={!!h.eserBaslik}
						/>
					</Alan>
					<Alan id="eserAlt" etiket="Kimin?" hata={h.eserAlt} ipucu="İsteğe bağlı">
						<input
							id="eserAlt"
							name="eserAlt"
							value={ilk.eserAlt ?? ''}
							maxlength="200"
							placeholder="ör. Sabahattin Ali"
						/>
					</Alan>
				</div>
			</div>
		</section>

		<section class="adim kart">
			<span class="no" aria-hidden="true">{ADIMLAR[1].no}</span>
			<div class="adim-govde yigin">
				<h2>{ADIMLAR[1].soru}</h2>
				<p class="ipucu">{ADIMLAR[1].ipucu}</p>
				{@render turSecici('getirenTur', getirenTur, (t) => (getirenTur = t))}
				<div class="eser-turu-sec">
					<label class="gorunmez" for="getirenEserTuru">Eserin türü</label>
					<select id="getirenEserTuru" name="getirenEserTuru">
						{#each ESER_TURLERI as et (et)}
							<option value={et}>{ESER_TURU_ETIKETI[et]}</option>
						{/each}
					</select>
				</div>
				<div class="iki">
					<Alan id="getirenBaslik" etiket="Adı" hata={h.getirenBaslik}>
						<input
							id="getirenBaslik"
							name="getirenBaslik"
							bind:value={getirenBaslik}
							maxlength="200"
							placeholder="ör. Babaannemin kitaplığı"
							aria-invalid={!!h.getirenBaslik}
						/>
					</Alan>
					<Alan id="getirenNot" etiket="Nasıl?" ipucu="İsteğe bağlı" hata={h.getirenNot}>
						<input
							id="getirenNot"
							name="getirenNot"
							value={ilk.getirenNot ?? ''}
							maxlength="1000"
							placeholder="ör. rafta buldum"
						/>
					</Alan>
				</div>
			</div>
		</section>

		<section class="adim kart">
			<span class="no" aria-hidden="true">{ADIMLAR[2].no}</span>
			<div class="adim-govde yigin">
				<h2>{ADIMLAR[2].soru}</h2>
				<p class="ipucu">{ADIMLAR[2].ipucu}</p>
				{@render turSecici('gidenTur', gidenTur, (t) => (gidenTur = t))}
				<div class="eser-turu-sec">
					<label class="gorunmez" for="gidenEserTuru">Eserin türü</label>
					<select id="gidenEserTuru" name="gidenEserTuru">
						{#each ESER_TURLERI as et (et)}
							<option value={et}>{ESER_TURU_ETIKETI[et]}</option>
						{/each}
					</select>
				</div>
				<div class="iki">
					<Alan id="gidenBaslik" etiket="Adı" hata={h.gidenBaslik}>
						<input
							id="gidenBaslik"
							name="gidenBaslik"
							bind:value={gidenBaslik}
							maxlength="200"
							placeholder="ör. Berlin"
							aria-invalid={!!h.gidenBaslik}
						/>
					</Alan>
					<Alan id="gidenNot" etiket="Nasıl?" ipucu="İsteğe bağlı" hata={h.gidenNot}>
						<input
							id="gidenNot"
							name="gidenNot"
							value={ilk.gidenNot ?? ''}
							maxlength="1000"
							placeholder="ör. hikâye orada geçiyordu"
						/>
					</Alan>
				</div>
			</div>
		</section>

		<div class="bitir kart">
			<Alan id="izBaslik" etiket="İzine bir ad ver" ipucu="İsteğe bağlı" hata={h.izBaslik}>
				<input
					id="izBaslik"
					name="izBaslik"
					value={ilk.izBaslik ?? ''}
					maxlength="120"
					placeholder="İlk izim"
				/>
			</Alan>
			<p class="kucuk soluk">
				Hepsi özel olarak kaydedilir; kimin görebileceğini sonra sen seçersin.
			</p>
			<div class="satir">
				<button class="dugme dugme-birincil" disabled={gonderiliyor}>
					{gonderiliyor ? 'İzin çiziliyor…' : 'İzimi oluştur'}
				</button>
				<a class="dugme dugme-hayalet" href="/pano">Şimdilik geç</a>
			</div>
		</div>
	</form>
</div>

<style>
	.sihirbaz {
		max-width: 46rem;
		display: flex;
		flex-direction: column;
		gap: var(--a-5);
	}
	.giris {
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--a-2);
	}
	.ust {
		margin: var(--a-2) 0 0;
		font-size: var(--boyut-xs);
		font-weight: 650;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--vurgu);
	}
	h1 {
		margin: 0;
		font-size: clamp(1.8rem, 5vw, 2.6rem);
	}
	.aciklama {
		max-width: 34rem;
		margin: 0;
		color: var(--metin-soluk);
	}

	/* ——— Önizleme ——— */
	.onizleme {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--a-2);
		margin: 0;
		padding: var(--a-4);
		border-radius: var(--yaricap-lg);
		background: var(--yuzey);
		border: 1px solid var(--cizgi);
		background-image: radial-gradient(
			color-mix(in srgb, var(--metin) 10%, transparent) 1px,
			transparent 1.2px
		);
		background-size: 18px 18px;
	}
	.durak {
		flex: 1 1 0;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--a-1);
		text-align: center;
		font-size: var(--boyut-sm);
		font-weight: 600;
		transition: opacity var(--gecis);
	}
	.durak span {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: 2px var(--a-2);
		border-radius: var(--yaricap-sm);
		background: var(--yuzey);
	}
	/* Henüz doldurulmamış durak: şekil soluk, yazı okunur kalır (kontrast) */
	.durak.bos :global(svg) {
		opacity: 0.4;
	}
	.durak.bos span {
		font-weight: 500;
		font-style: italic;
		color: var(--metin-soluk);
	}
	.durak.merkez {
		flex-grow: 1.3;
	}
	.ok {
		flex: 0 1 3rem;
		height: 0;
		border-top: 2px dotted var(--vurgu);
		position: relative;
		margin-bottom: 1.4rem;
	}
	.ok::after {
		content: '';
		position: absolute;
		right: -2px;
		top: -5px;
		border-left: 7px solid var(--vurgu);
		border-top: 4px solid transparent;
		border-bottom: 4px solid transparent;
	}

	/* ——— Adımlar ——— */
	.adimlar {
		display: flex;
		flex-direction: column;
		gap: var(--a-3);
		position: relative;
	}
	.adim {
		display: grid;
		grid-template-columns: 2.25rem 1fr;
		gap: var(--a-3);
	}
	.no {
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 50%;
		background: var(--vurgu);
		color: var(--vurgu-uzeri);
		font-family: var(--yazi-baslik);
		font-weight: 700;
	}
	.adim-govde {
		gap: var(--a-3);
		min-width: 0;
	}
	.adim h2 {
		margin: 0.3rem 0 0;
		font-size: var(--boyut-xl);
	}
	.ipucu {
		margin: -0.5rem 0 0;
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
	}
	.cipler {
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-2);
	}
	.cip {
		position: relative;
		cursor: pointer;
	}
	.cip input {
		position: absolute;
		opacity: 0;
		inset: 0;
		margin: 0;
		cursor: pointer;
	}
	.cip span {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 2.25rem;
		padding: 0 var(--a-3);
		border: 1px solid var(--cizgi-guclu);
		border-radius: var(--yaricap-tam);
		background: var(--yuzey);
		font-size: var(--boyut-sm);
		font-weight: 550;
	}
	.cip input:checked + span {
		border-color: var(--vurgu);
		background: var(--vurgu-zemin);
		color: var(--vurgu);
	}
	.cip input:focus-visible + span {
		outline: 2px solid var(--vurgu);
		outline-offset: 2px;
	}
	.eser-turu-sec {
		display: none;
		max-width: 14rem;
	}
	/* Eser seçilince alt tür seçimi görünür (JavaScript gerekmez) */
	.adim:has(input[name='getirenTur'][value='eser']:checked) .eser-turu-sec,
	.adim:has(input[name='gidenTur'][value='eser']:checked) .eser-turu-sec {
		display: block;
	}
	.iki {
		display: grid;
		gap: var(--a-3);
	}
	.bitir {
		display: flex;
		flex-direction: column;
		gap: var(--a-3);
	}
	.bitir p {
		margin: 0;
	}
	@media (min-width: 36rem) {
		.iki {
			grid-template-columns: 1.4fr 1fr;
		}
	}
	@media (max-width: 30rem) {
		.onizleme {
			flex-direction: column;
		}
		.ok {
			flex-basis: 1.5rem;
			width: 0;
			height: 1.5rem;
			border-top: 0;
			border-left: 2px dotted var(--vurgu);
			margin: 0;
		}
		.ok::after {
			right: auto;
			top: auto;
			left: -5px;
			bottom: -2px;
			border-left: 4px solid transparent;
			border-right: 4px solid transparent;
			border-top: 7px solid var(--vurgu);
			border-bottom: 0;
		}
	}
</style>
