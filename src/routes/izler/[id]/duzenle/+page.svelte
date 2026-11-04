<script lang="ts">
	import { tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { enhance } from '$app/forms';
	import DugumSecici from '#lib/bilesenler/DugumSecici.svelte';
	import IzFormu from '#lib/bilesenler/IzFormu.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import TurRozeti from '#lib/bilesenler/TurRozeti.svelte';
	import TurSekli from '#lib/bilesenler/TurSekli.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Sunucudan gelen sıra; sürüklerken yerel olarak değişir, kaydedilince yeniden yüklenir
	let duraklar = $derived(data.duraklar);
	let suruklenen = $state<string | null>(null);
	let liste: HTMLOListElement | undefined = $state();
	let siralamaFormu: HTMLFormElement | undefined = $state();

	const azHareket = () =>
		typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	function surukle(e: PointerEvent, adimId: string) {
		if (e.button !== 0 || !liste) return;
		e.preventDefault();
		const tutamak = e.currentTarget as HTMLElement;
		tutamak.setPointerCapture(e.pointerId);
		suruklenen = adimId;
		const baslangic = duraklar.map((d) => d.adimId).join();

		const hareket = (ev: PointerEvent) => {
			const ogeler = [...liste!.querySelectorAll<HTMLElement>('[data-adim]')];
			const i = duraklar.findIndex((d) => d.adimId === suruklenen);
			for (const [j, oge] of ogeler.entries()) {
				if (j === i) continue;
				const kutu = oge.getBoundingClientRect();
				const orta = kutu.top + kutu.height / 2;
				if ((j < i && ev.clientY < orta) || (j > i && ev.clientY > orta)) {
					const yeni = [...duraklar];
					const [tasinan] = yeni.splice(i, 1);
					yeni.splice(j, 0, tasinan);
					duraklar = yeni;
					break;
				}
			}
		};
		const birak = async () => {
			tutamak.removeEventListener('pointermove', hareket);
			tutamak.removeEventListener('pointerup', birak);
			tutamak.removeEventListener('pointercancel', birak);
			suruklenen = null;
			if (duraklar.map((d) => d.adimId).join() !== baslangic) {
				await tick();
				siralamaFormu?.requestSubmit();
			}
		};
		tutamak.addEventListener('pointermove', hareket);
		tutamak.addEventListener('pointerup', birak);
		tutamak.addEventListener('pointercancel', birak);
	}

	const bilgiHatalari = $derived((form?.bilgi?.hatalar ?? {}) as Record<string, string>);
	const bilgiDegerleri = $derived(
		(form?.bilgi?.degerler as Record<string, string> | undefined) ?? {
			baslik: data.iz.baslik,
			aciklama: data.iz.aciklama ?? '',
			gizlilik: data.iz.gizlilik
		}
	);
</script>

<svelte:head><title>Düzenle: {data.iz.baslik} · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="İzi düzenle"
		baslik={data.iz.baslik}
		geri={{ href: `/izler/${data.iz.id}`, etiket: 'İze dön' }}
	>
		{#snippet eylemler()}
			<a class="dugme" href="/izler/{data.iz.id}"><Simge ad="iz" boyut={18} /> Okuma görünümü</a>
		{/snippet}
	</SayfaBasligi>

	<div aria-live="polite" class="bildirimler">
		{#if data.yeni && !form}
			<p class="bildirim bildirim-basari">İz oluşturuldu. Şimdi duraklarını ekle ve sırala.</p>
		{/if}
		{#if form?.bilgiKaydedildi}<p class="bildirim bildirim-basari">İz bilgileri kaydedildi.</p>{/if}
		{#if form?.durakEklendi}<p class="bildirim bildirim-basari">Durak eklendi.</p>{/if}
		{#if form?.durakCikarildi}<p class="bildirim bildirim-basari">Durak çıkarıldı.</p>{/if}
		{#if form?.siralandi}<p class="bildirim bildirim-basari">Sıra kaydedildi.</p>{/if}
		{#if form?.notKaydedildi}<p class="bildirim bildirim-basari">Not kaydedildi.</p>{/if}
		{#if form?.durakHatasi}<p class="bildirim bildirim-hata">{form.durakHatasi}</p>{/if}
	</div>

	<div class="duzen">
		<section class="yigin" aria-labelledby="duraklar-baslik">
			<div class="bolum-ust">
				<h2 id="duraklar-baslik">Duraklar <span class="soluk">({duraklar.length})</span></h2>
				{#if duraklar.length > 1}
					<p class="kucuk soluk">Sırayı tutamaktan sürükleyerek ya da oklarla değiştir.</p>
				{/if}
			</div>

			{#if duraklar.length}
				<ol class="duraklar" bind:this={liste}>
					{#each duraklar as durak, i (durak.adimId)}
						<li
							class="durak"
							class:suruklenen={suruklenen === durak.adimId}
							data-adim={durak.adimId}
							data-tur={durak.dugum.tur}
							animate:flip={{ duration: azHareket() ? 0 : 160 }}
						>
							<button
								type="button"
								class="tutamak"
								aria-label="“{durak.dugum.baslik}” durağını sürükleyerek taşı"
								title="Sürükleyerek taşı"
								onpointerdown={(e) => surukle(e, durak.adimId)}
							>
								<Simge ad="tutamak" boyut={18} />
							</button>
							<span class="no" aria-hidden="true">{i + 1}</span>
							<div class="govde">
								<div class="baslik-satiri">
									<a href="/dugumler/{durak.dugum.id}">{durak.dugum.baslik}</a>
									<TurRozeti tur={durak.dugum.tur} eserTuru={durak.dugum.eserTuru} />
								</div>
								{#if durak.not}<p class="not-onizleme">{durak.not}</p>{/if}
								<details class="not-duzenle" open={form?.notHatasi?.adimId === durak.adimId}>
									<summary>{durak.not ? 'Anlatı notunu düzenle' : 'Anlatı notu ekle'}</summary>
									<form
										method="POST"
										action="?/notKaydet"
										class="yigin"
										use:enhance={() =>
											async ({ update }) =>
												update({ reset: false })}
									>
										<input type="hidden" name="adimId" value={durak.adimId} />
										<label class="gorunmez" for="not-{durak.adimId}">{i + 1}. durağın notu</label>
										<textarea
											id="not-{durak.adimId}"
											name="not"
											rows="3"
											maxlength="2000"
											placeholder="Bu durakta ne oldu? Seni bir sonrakine ne götürdü?"
											>{durak.not ?? ''}</textarea
										>
										{#if form?.notHatasi?.adimId === durak.adimId}
											<span class="hata-metni">{form.notHatasi.hata}</span>
										{/if}
										<div class="satir">
											<button class="dugme dugme-kucuk dugme-birincil">Notu kaydet</button>
										</div>
									</form>
								</details>
							</div>
							<div class="eylemler">
								<form method="POST" action="?/tasi" use:enhance>
									<input type="hidden" name="adimId" value={durak.adimId} />
									<input type="hidden" name="yon" value="yukari" />
									<button
										class="dugme dugme-hayalet dugme-kucuk"
										disabled={i === 0}
										aria-label="Yukarı taşı"
										title="Yukarı taşı"
									>
										<Simge ad="yukari" boyut={16} />
									</button>
								</form>
								<form method="POST" action="?/tasi" use:enhance>
									<input type="hidden" name="adimId" value={durak.adimId} />
									<input type="hidden" name="yon" value="asagi" />
									<button
										class="dugme dugme-hayalet dugme-kucuk"
										disabled={i === duraklar.length - 1}
										aria-label="Aşağı taşı"
										title="Aşağı taşı"
									>
										<Simge ad="asagi" boyut={16} />
									</button>
								</form>
								<form method="POST" action="?/durakCikar" use:enhance>
									<input type="hidden" name="adimId" value={durak.adimId} />
									<button
										class="dugme dugme-hayalet dugme-kucuk cikar"
										aria-label="“{durak.dugum.baslik}” durağını izden çıkar"
										title="İzden çıkar (düğüm silinmez)"
									>
										<Simge ad="kapat" boyut={16} />
									</button>
								</form>
							</div>
						</li>
					{/each}
				</ol>

				<!-- Sürükle-bırak sonrası sıranın tamamı bu formla gönderilir -->
				<form method="POST" action="?/sirala" bind:this={siralamaFormu} use:enhance hidden>
					{#each duraklar as durak (durak.adimId)}
						<input type="hidden" name="adim" value={durak.adimId} />
					{/each}
				</form>
			{:else}
				<p class="bos-not">Henüz durak yok. Aşağıdan ilk durağını ekle.</p>
			{/if}

			<div class="kart ekle">
				<h3>Durak ekle</h3>
				{#if data.eklenebilir.length}
					<form method="POST" action="?/durakEkle" class="ekle-formu" use:enhance>
						<label class="gorunmez" for="yeniDurak">Eklenecek düğüm</label>
						<div class="secici-alani">
							<DugumSecici
								id="yeniDurak"
								ad="dugumId"
								secenekler={data.eklenebilir}
								yerTutucu="Düğüm adını yaz…"
							/>
						</div>
						<button class="dugme dugme-birincil"><Simge ad="ekle" boyut={16} /> Ekle</button>
					</form>
				{:else}
					<p class="kucuk soluk">
						Tüm düğümlerin zaten bu izde. <a href="/dugumler/yeni">Yeni düğüm ekle</a>.
					</p>
				{/if}

				{#if data.oneriler.length}
					<div class="oneriler">
						<p class="kucuk soluk">
							<Simge ad="baglanti" boyut={14} /> Son duraktan giden bağlara göre öneriler:
						</p>
						<ul>
							{#each data.oneriler as o (o.id)}
								<li>
									<form method="POST" action="?/durakEkle" use:enhance>
										<input type="hidden" name="dugumId" value={o.id} />
										<button class="oneri" title={o.not ? `“${o.not}”` : undefined}>
											<TurSekli tur={o.tur} boyut={11} />
											{o.baslik}
											<Simge ad="ekle" boyut={14} />
										</button>
									</form>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</section>

		<aside class="yan yigin">
			<section class="kart" aria-labelledby="bilgi-baslik">
				<h2 id="bilgi-baslik">İz bilgileri</h2>
				<IzFormu
					degerler={bilgiDegerleri}
					hatalar={bilgiHatalari}
					gonderMetni="Bilgileri kaydet"
					eylem="?/bilgi"
				/>
			</section>

			<section class="kart tehlike" aria-labelledby="sil-baslik">
				<h2 id="sil-baslik">İzi sil</h2>
				<p class="soluk kucuk">
					Yalnızca iz silinir; duraklardaki düğümler ve bağlar yerinde kalır.
				</p>
				<form method="POST" action="?/sil" class="satir">
					<label class="satir kucuk">
						<input type="checkbox" name="onay" value="evet" required />
						Evet, bu izi silmek istiyorum
					</label>
					<button class="dugme dugme-tehlike"><Simge ad="cop" boyut={16} /> Sil</button>
				</form>
				{#if form?.silHatasi}<p class="hata-metni kucuk" role="alert">{form.silHatasi}</p>{/if}
			</section>
		</aside>
	</div>
</div>

<style>
	.bildirimler:empty {
		display: none;
	}
	.bildirimler p {
		margin: 0;
	}
	.duzen {
		display: grid;
		gap: var(--a-6);
		align-items: start;
	}
	.bolum-ust h2 {
		margin: 0;
	}
	.bolum-ust p {
		margin: var(--a-1) 0 0;
	}
	h2 {
		font-size: var(--boyut-xl);
	}

	/* ——— Durak listesi ——— */
	.duraklar {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.durak {
		display: grid;
		grid-template-columns: auto auto 1fr;
		grid-template-areas:
			'tutamak no govde'
			'eylemler eylemler eylemler';
		align-items: start;
		gap: var(--a-2) var(--a-3);
		padding: var(--a-3);
		background: var(--yuzey);
		border: 1px solid var(--cizgi);
		border-left: 3px solid var(--renk, var(--cizgi));
		border-radius: var(--yaricap);
		transition:
			box-shadow var(--gecis),
			transform var(--gecis);
	}
	.durak[data-tur='eser'] {
		--renk: var(--tur-eser);
	}
	.durak[data-tur='kisi'] {
		--renk: var(--tur-kisi);
	}
	.durak[data-tur='yer'] {
		--renk: var(--tur-yer);
	}
	.durak[data-tur='karar'] {
		--renk: var(--tur-karar);
	}
	.durak[data-tur='ani'] {
		--renk: var(--tur-ani);
	}
	.durak.suruklenen {
		position: relative;
		z-index: 2;
		box-shadow: var(--golge-2);
		transform: scale(1.015);
		border-color: var(--vurgu);
	}
	.tutamak {
		grid-area: tutamak;
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2.25rem;
		margin: -0.25rem 0 0 -0.25rem;
		border: 0;
		border-radius: var(--yaricap-sm);
		background: transparent;
		color: var(--metin-silik);
		cursor: grab;
		touch-action: none;
	}
	.tutamak:hover {
		background: var(--yuzey-2);
		color: var(--metin);
	}
	.suruklenen .tutamak {
		cursor: grabbing;
		color: var(--vurgu);
	}
	.no {
		grid-area: no;
		display: grid;
		place-items: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		background: var(--renk, var(--metin-soluk));
		color: var(--yuzey);
		font-family: var(--yazi-baslik);
		font-weight: 700;
		font-size: var(--boyut-sm);
	}
	.govde {
		grid-area: govde;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-1);
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
	.not-onizleme {
		margin: 0;
		font-family: var(--yazi-baslik);
		font-style: italic;
		color: var(--metin-soluk);
		white-space: pre-line;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.not-duzenle summary {
		width: fit-content;
		font-size: var(--boyut-xs);
		font-weight: 550;
		color: var(--metin-soluk);
		cursor: pointer;
	}
	.not-duzenle summary:hover {
		color: var(--vurgu);
	}
	.not-duzenle[open] summary {
		margin-bottom: var(--a-2);
	}
	.eylemler {
		grid-area: eylemler;
		display: flex;
		justify-content: flex-end;
		gap: 2px;
		margin-top: calc(-1 * var(--a-1));
	}
	.eylemler .dugme:disabled {
		opacity: 0.3;
	}
	.cikar:hover {
		color: var(--hata);
		background: var(--hata-zemin);
	}
	.bos-not {
		margin: 0;
		padding: var(--a-4);
		border: 1px dashed var(--cizgi-guclu);
		border-radius: var(--yaricap);
		color: var(--metin-soluk);
		text-align: center;
	}

	/* ——— Durak ekleme ——— */
	.ekle h3 {
		margin-bottom: var(--a-3);
	}
	.ekle-formu {
		display: flex;
		gap: var(--a-2);
		align-items: flex-start;
	}
	.secici-alani {
		flex: 1;
		min-width: 0;
	}
	.oneriler {
		margin-top: var(--a-4);
		padding-top: var(--a-3);
		border-top: 1px solid var(--cizgi);
	}
	.oneriler p {
		display: flex;
		align-items: center;
		gap: var(--a-1);
		margin: 0 0 var(--a-2);
	}
	.oneriler ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-2);
	}
	.oneri {
		display: inline-flex;
		align-items: center;
		gap: var(--a-2);
		min-height: 2.25rem;
		padding: 0 var(--a-3);
		border: 1px dashed var(--vurgu);
		border-radius: var(--yaricap-tam);
		background: var(--vurgu-zemin);
		color: var(--metin);
		font: inherit;
		font-size: var(--boyut-sm);
		font-weight: 550;
		cursor: pointer;
	}
	.oneri:hover {
		border-style: solid;
	}

	/* ——— Yan sütun ——— */
	.yan h2 {
		font-size: var(--boyut-lg);
	}
	.tehlike {
		border-color: color-mix(in srgb, var(--hata) 35%, var(--cizgi));
	}
	.tehlike form {
		justify-content: space-between;
	}
	.tehlike p {
		margin-bottom: var(--a-3);
	}

	@media (min-width: 40rem) {
		.durak {
			grid-template-columns: auto auto 1fr auto;
			grid-template-areas: 'tutamak no govde eylemler';
		}
		.eylemler {
			margin-top: -0.25rem;
		}
	}
	@media (min-width: 64rem) {
		.duzen {
			grid-template-columns: minmax(0, 1.6fr) minmax(18rem, 1fr);
		}
		.yan {
			position: sticky;
			top: calc(var(--ust-yukseklik) + var(--a-4));
		}
	}
</style>
