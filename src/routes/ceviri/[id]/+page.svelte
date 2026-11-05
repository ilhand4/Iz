<script lang="ts">
	import { enhance } from '$app/forms';
	import Alan from '#lib/bilesenler/Alan.svelte';
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import MasaFormu from '#lib/bilesenler/MasaFormu.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import {
		CEVIRI_EN_UZUN,
		DAYANAK_ETIKETI,
		DAYANAKLAR,
		sozcukFarki,
		type Dayanak,
		type Parca
	} from '#lib/ceviri.ts';
	import { GIZLILIK_ETIKETI } from '#lib/sabitler.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	type Hata = { hatalar: Record<string, string>; degerler: Record<string, string> };
	const f = $derived(
		form as {
			ayarlar?: Hata;
			paragraf?: Hata;
			ceviri?: Hata & { paragrafId: string };
			yorum?: { ceviriId: string; hata: string };
		} | null
	);
	let farklar = $state(false);
	let uzunluk = $state<Record<string, number>>({});

	/** Bu çeviride, paragraftaki öteki çevirilerin hiçbirinde karşılığı olmayan sözcükler */
	function parcalar(metin: string, digerleri: string[]): Parca[] {
		if (!farklar || !digerleri.length) return [{ metin, farkli: false }];
		const tumu = digerleri.map((d) => sozcukFarki(metin, d));
		return tumu[0].map((p, i) => ({ metin: p.metin, farkli: tumu.every((t) => t[i].farkli) }));
	}
	const kunye = (c: { cevirmen: string; yayinevi: string | null; yil: number | null }) =>
		[c.cevirmen, c.yayinevi, c.yil].filter(Boolean).join(' · ');
</script>

<svelte:head><title>{data.masa.baslik} · Çeviri masası · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="Çeviri masası"
		baslik={data.masa.baslik}
		aciklama={data.masa.aciklama}
		geri={{ href: '/ceviri', etiket: 'Masalar' }}
	/>

	<div class="bilgi satir">
		{#if data.eser}
			<a class="rozet" href="/dugumler/{data.eser.id}">Eser: {data.eser.baslik}</a>
		{/if}
		{#if data.masa.ozgunDil}<span class="rozet">Özgün dil: {data.masa.ozgunDil}</span>{/if}
		<span class="rozet">{GIZLILIK_ETIKETI[data.masa.gizlilik]}</span>
		{#if !data.sahibiMi}<span class="rozet">Masa: {data.sahip.ad}</span>{/if}
		<span class="rozet" title="Telifli çevirilerden alıntı içerebilecek paragraf sayısı">
			Alıntılı paragraf: {data.alintiParagraf}/{data.alintiSiniri}
		</span>
		{#if data.paragraflar.some((p) => p.ceviriler.length > 1)}
			<label class="fark-anahtari">
				<input type="checkbox" bind:checked={farklar} />
				Farkları vurgula
			</label>
		{/if}
	</div>

	{#if !data.paragraflar.length}
		<BosDurum
			baslik="Masa henüz boş"
			aciklama={data.sahibiMi
				? 'Karşılaştırmak istediğin paragrafın yerini (ör. “1. bölüm, ilk paragraf”) ve istersen özgün metnini ekle.'
				: 'Masanın sahibi henüz paragraf eklemedi.'}
		/>
	{/if}

	{#each data.paragraflar as p (p.id)}
		{@const hataBurada = f?.ceviri?.paragrafId === p.id ? f.ceviri : null}
		<section class="paragraf yigin" aria-labelledby="p-{p.id}">
			<div class="paragraf-ust">
				<h2 id="p-{p.id}">{p.yer ?? `${p.sira}. paragraf`}</h2>
				{#if data.sahibiMi}
					<form method="POST" action="?/paragrafSil" use:enhance>
						<input type="hidden" name="paragrafId" value={p.id} />
						<button class="dugme dugme-kucuk dugme-hayalet" aria-label="Paragrafı sil">
							<Simge ad="cop" boyut={14} />
						</button>
					</form>
				{/if}
			</div>
			{#if p.ozgun}
				<blockquote class="ozgun" lang="">{p.ozgun}</blockquote>
			{/if}

			{#if p.ceviriler.length}
				<ul class="ceviriler">
					{#each p.ceviriler as c (c.id)}
						{@const digerleri = p.ceviriler.filter((x) => x.id !== c.id).map((x) => x.metin)}
						<li class="kart ceviri">
							<p class="metin">
								{#each parcalar(c.metin, digerleri) as parca, i (i)}{#if parca.farkli}<mark
											>{parca.metin}</mark
										>{:else}{parca.metin}{/if}{/each}
							</p>
							<p class="kunye">
								<strong>{kunye(c)}</strong>
								<span class="dayanak" data-dayanak={c.dayanak}
									>{DAYANAK_ETIKETI[c.dayanak as Dayanak]}</span
								>
							</p>
							<div class="eylemler satir">
								{#if data.girisli}
									<form method="POST" action="?/oy" use:enhance>
										<input type="hidden" name="ceviriId" value={c.id} />
										<button
											class="dugme dugme-kucuk oy"
											aria-pressed={c.benimOyum}
											aria-label="{c.cevirmen} çevirisini beğen ({c.oy} oy)"
										>
											<Simge ad="yildiz" boyut={14} />
											{c.oy}
										</button>
									</form>
								{:else if c.oy}
									<span class="kucuk soluk"><Simge ad="yildiz" boyut={14} /> {c.oy}</span>
								{/if}
								{#if c.benimMi || data.sahibiMi}
									<form method="POST" action="?/ceviriSil" use:enhance>
										<input type="hidden" name="ceviriId" value={c.id} />
										<button class="dugme dugme-kucuk dugme-hayalet" aria-label="Çeviriyi sil">
											<Simge ad="cop" boyut={14} />
										</button>
									</form>
								{/if}
								<small class="soluk ekleyen">{c.ekleyen} ekledi</small>
							</div>
							{#if c.yorumlar.length || data.girisli}
								<details open={f?.yorum?.ceviriId === c.id}>
									<summary class="kucuk">Yorumlar ({c.yorumlar.length})</summary>
									<ul class="yorumlar">
										{#each c.yorumlar as y (y.id)}
											<li>
												<span><strong>{y.yazar}:</strong> {y.metin}</span>
												{#if y.benimMi || data.sahibiMi}
													<form method="POST" action="?/yorumSil" use:enhance>
														<input type="hidden" name="yorumId" value={y.id} />
														<button class="dugme dugme-kucuk dugme-hayalet" aria-label="Yorumu sil">
															<Simge ad="kapat" boyut={12} />
														</button>
													</form>
												{/if}
											</li>
										{/each}
									</ul>
									{#if data.girisli}
										<form method="POST" action="?/yorum" class="yorum-formu" use:enhance>
											<input type="hidden" name="ceviriId" value={c.id} />
											<label class="gorunmez" for="yorum-{c.id}">Yorumun</label>
											<input
												id="yorum-{c.id}"
												name="metin"
												maxlength="1000"
												placeholder="Bu çeviri hakkında…"
												required
											/>
											<button class="dugme dugme-kucuk">Gönder</button>
										</form>
										{#if f?.yorum?.ceviriId === c.id}
											<p class="hata-metni" role="alert">{f.yorum.hata}</p>
										{/if}
									{/if}
								</details>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p class="soluk kucuk">Bu paragrafın henüz çevirisi yok.</p>
			{/if}

			{#if data.katkiYapabilir}
				<details class="kart ekle" open={!!hataBurada}>
					<summary>Çeviri ekle</summary>
					<form method="POST" action="?/ceviriEkle" class="yigin" use:enhance>
						<input type="hidden" name="paragrafId" value={p.id} />
						<Alan
							id="metin-{p.id}"
							etiket="Çeviri"
							hata={hataBurada?.hatalar.metin}
							ipucu="{uzunluk[p.id] ?? 0}/{CEVIRI_EN_UZUN} karakter: kısa alıntı sınırı"
						>
							<textarea
								id="metin-{p.id}"
								name="metin"
								rows="4"
								maxlength={CEVIRI_EN_UZUN}
								required
								oninput={(e) => (uzunluk[p.id] = e.currentTarget.value.length)}
								>{hataBurada?.degerler.metin ?? ''}</textarea
							>
						</Alan>
						<div class="uclu">
							<Alan id="cevirmen-{p.id}" etiket="Çevirmen" hata={hataBurada?.hatalar.cevirmen}>
								<input
									id="cevirmen-{p.id}"
									name="cevirmen"
									maxlength="120"
									required
									value={hataBurada?.degerler.cevirmen ?? ''}
								/>
							</Alan>
							<Alan id="yayinevi-{p.id}" etiket="Yayınevi" hata={hataBurada?.hatalar.yayinevi}>
								<input
									id="yayinevi-{p.id}"
									name="yayinevi"
									maxlength="120"
									value={hataBurada?.degerler.yayinevi ?? ''}
								/>
							</Alan>
							<Alan id="yil-{p.id}" etiket="Yıl" hata={hataBurada?.hatalar.yil}>
								<input
									id="yil-{p.id}"
									name="yil"
									inputmode="numeric"
									maxlength="4"
									value={hataBurada?.degerler.yil ?? ''}
								/>
							</Alan>
						</div>
						<fieldset class="dayanaklar">
							<legend>Bu metni hangi dayanakla ekliyorsun?</legend>
							{#each DAYANAKLAR as dy (dy)}
								<label>
									<input
										type="radio"
										name="dayanak"
										value={dy}
										required
										checked={hataBurada?.degerler.dayanak === dy}
									/>
									{DAYANAK_ETIKETI[dy]}
								</label>
							{/each}
							{#if hataBurada?.hatalar.dayanak}
								<p class="hata-metni" role="alert">{hataBurada.hatalar.dayanak}</p>
							{/if}
						</fieldset>
						<div class="satir"><button class="dugme dugme-birincil">Ekle</button></div>
					</form>
				</details>
			{/if}
		</section>
	{/each}

	{#if data.sahibiMi}
		<details class="kart" open={!!f?.paragraf}>
			<summary>Paragraf ekle</summary>
			<form method="POST" action="?/paragrafEkle" class="yigin" use:enhance>
				<Alan
					id="yer"
					etiket="Eserdeki yeri"
					hata={f?.paragraf?.hatalar.yer}
					ipucu="Ör. “Birinci bölüm, açılış paragrafı”"
				>
					<input id="yer" name="yer" maxlength="120" value={f?.paragraf?.degerler.yer ?? ''} />
				</Alan>
				<Alan
					id="ozgun"
					etiket="Özgün metin"
					hata={f?.paragraf?.hatalar.ozgun}
					ipucu="İsteğe bağlı; kısa tut"
				>
					<textarea id="ozgun" name="ozgun" rows="3" maxlength="1500"
						>{f?.paragraf?.degerler.ozgun ?? ''}</textarea
					>
				</Alan>
				<div class="satir"><button class="dugme dugme-birincil">Paragrafı ekle</button></div>
			</form>
		</details>

		<details class="kart" open={!!f?.ayarlar}>
			<summary>Masa ayarları</summary>
			<div class="yigin">
				<MasaFormu
					eylem="?/ayarlar"
					onek="ayar"
					degerler={f?.ayarlar?.degerler ?? {
						baslik: data.masa.baslik,
						ozgunDil: data.masa.ozgunDil ?? '',
						aciklama: data.masa.aciklama ?? '',
						gizlilik: data.masa.gizlilik,
						eserId: data.masa.eserId ?? ''
					}}
					hatalar={f?.ayarlar?.hatalar ?? {}}
					eserler={data.eserler}
					gonderMetni="Kaydet"
				/>
				<form method="POST" action="?/sil" use:enhance>
					<button class="dugme dugme-kucuk dugme-tehlike">Masayı sil</button>
				</form>
			</div>
		</details>
	{/if}

	<p class="kucuk soluk telif">
		Çeviriler inceleme ve eleştiri amacıyla, kaynağı gösterilerek alınmış kısa alıntılardır (her
		biri en çok {CEVIRI_EN_UZUN} karakter; telifli çevirilerden masa başına en çok {data.alintiSiniri}
		paragraf). Hak sahibiysen ve bir alıntının kaldırılmasını istiyorsan masanın sahibine ulaş.
	</p>
</div>

<style>
	h2 {
		margin: 0;
		font-size: var(--boyut-lg);
	}
	.bilgi {
		flex-wrap: wrap;
		align-items: center;
		gap: var(--a-2);
	}
	.bilgi a.rozet {
		color: var(--metin);
	}
	.fark-anahtari {
		display: inline-flex;
		align-items: center;
		gap: var(--a-2);
		margin-left: auto;
		font-size: var(--boyut-sm);
		font-weight: 600;
	}
	.fark-anahtari input {
		accent-color: var(--vurgu);
	}
	.paragraf {
		padding-top: var(--a-4);
		border-top: 1px solid var(--cizgi);
	}
	.paragraf-ust {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--a-2);
	}
	.ozgun {
		margin: 0;
		padding: var(--a-2) var(--a-4);
		border-left: 3px solid var(--cizgi-guclu);
		color: var(--metin-soluk);
		font-style: italic;
		white-space: pre-line;
	}
	.ceviriler {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: var(--a-3);
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
		align-items: start;
	}
	.ceviri {
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.metin {
		margin: 0;
		font-family: var(--yazi-baslik);
		font-size: 1.1rem;
		line-height: 1.65;
		white-space: pre-line;
	}
	mark {
		background: var(--uyari-zemin);
		color: var(--metin);
		border-radius: 3px;
		box-shadow: 0 1px 0 var(--uyari);
	}
	.kunye {
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-1) var(--a-2);
		font-size: var(--boyut-sm);
	}
	.dayanak {
		color: var(--metin-soluk);
	}
	.dayanak[data-dayanak='alinti']::before {
		content: '“” ';
	}
	.eylemler {
		align-items: center;
		gap: var(--a-2);
	}
	.ekleyen {
		margin-left: auto;
	}
	.oy[aria-pressed='true'] {
		border-color: var(--vurgu);
		background: var(--vurgu-zemin);
		color: var(--vurgu-guclu);
	}
	.yorumlar {
		list-style: none;
		margin: var(--a-2) 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-1);
		font-size: var(--boyut-sm);
	}
	.yorumlar li {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--a-2);
	}
	.yorum-formu {
		display: flex;
		gap: var(--a-2);
	}
	.yorum-formu input {
		flex: 1;
		min-width: 0;
		min-height: 2.25rem;
		padding: 0 var(--a-2);
		border: 1px solid var(--cizgi-guclu);
		border-radius: var(--yaricap-sm);
		background: var(--yuzey);
		color: var(--metin);
		font: inherit;
		font-size: var(--boyut-sm);
	}
	.uclu {
		display: grid;
		gap: var(--a-3);
		grid-template-columns: 2fr 2fr 1fr;
	}
	@media (max-width: 40rem) {
		.uclu {
			grid-template-columns: 1fr;
		}
	}
	.dayanaklar {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
		font-size: var(--boyut-sm);
	}
	.dayanaklar legend {
		margin-bottom: var(--a-2);
		font-weight: 600;
	}
	.dayanaklar label {
		display: flex;
		align-items: center;
		gap: var(--a-2);
	}
	.dayanaklar input {
		accent-color: var(--vurgu);
	}
	.telif {
		margin: var(--a-4) 0 0;
		max-width: var(--okuma-genislik);
	}
</style>
