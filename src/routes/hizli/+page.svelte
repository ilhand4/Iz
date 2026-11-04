<script lang="ts">
	import { enhance } from '$app/forms';
	import Alan from '#lib/bilesenler/Alan.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import TurSekli from '#lib/bilesenler/TurSekli.svelte';
	import {
		DUGUM_TURLERI,
		DUGUM_TURU_ETIKETI,
		ESER_DURUMLARI,
		ESER_TURLERI,
		ESER_TURU_ETIKETI,
		durumEtiketi
	} from '#lib/sabitler.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const d: Record<string, string> = $derived(
		(form?.degerler as Record<string, string> | undefined) ?? data.varsayilan
	);
	const h = $derived((form?.hatalar ?? {}) as Record<string, string>);
	let gonderiliyor = $state(false);

	const KAYNAK_ADI: Record<string, string> = { openlibrary: 'Open Library', tmdb: 'TMDB' };
</script>

<svelte:head><title>Hızlı ekle · İz</title></svelte:head>

<div class="kap kap-dar yigin">
	<SayfaBasligi
		ust="Hızlı ekle"
		baslik="Şunu mu demek istedin?"
		aciklama="Yazdığını parçalara ayırdım. Doğru olanları seç; yanlışsa düzelt."
		geri={{ href: '/pano', etiket: 'Pano' }}
	/>

	<form method="GET" class="metin-duzelt">
		<label class="gorunmez" for="metin">Yazdığın</label>
		<input id="metin" name="metin" value={data.metin} maxlength="300" />
		<button class="dugme dugme-kucuk">Yeniden ayrıştır</button>
	</form>

	<!-- Ayrıştırılan cümlenin önizlemesi -->
	<p class="onizleme" aria-label="Ayrıştırılan anlam">
		{#if data.cozum.getiren}
			<span class="parca">{data.cozum.getiren}</span>
			<span class="ok" aria-hidden="true">→</span>
		{/if}
		<span class="parca ana">{data.cozum.ana || '—'}</span>
		{#if data.cozum.not}<span class="not">“{data.cozum.not}”</span>{/if}
	</p>

	<form
		method="POST"
		class="yigin hizli-form"
		use:enhance={() => {
			gonderiliyor = true;
			return async ({ update }) => {
				await update({ reset: false });
				gonderiliyor = false;
			};
		}}
	>
		<input type="hidden" name="aramaSorgusu" value={data.cozum.ana} />

		<fieldset class="kart bolum">
			<legend>Eklenecek</legend>
			{#if h.ana}<p class="hata-metni" role="alert">{h.ana}</p>{/if}

			{#each data.anaEslesen as e (e.id)}
				<label class="secim">
					<input
						type="radio"
						name="ana"
						value="mevcut:{e.id}"
						checked={d.ana === `mevcut:${e.id}`}
					/>
					<span class="secim-govde">
						<TurSekli tur={e.tur} boyut={14} />
						<span class="metin">
							<strong>{e.baslik}</strong>
							<small>Haritanda zaten var{e.altBaslik ? ` · ${e.altBaslik}` : ''}</small>
						</span>
					</span>
				</label>
			{/each}

			{#each data.adaylar as a (a.kaynak + a.disKimlik)}
				<label class="secim">
					<input
						type="radio"
						name="ana"
						value="dis:{a.kaynak}:{a.disKimlik}"
						checked={d.ana === `dis:${a.kaynak}:${a.disKimlik}`}
					/>
					<span class="secim-govde">
						{#if a.gorselUrl}
							<img src={a.gorselUrl} alt="" loading="lazy" referrerpolicy="no-referrer" />
						{:else}
							<span class="kapak-yok" aria-hidden="true"><TurSekli tur="eser" boyut={14} /></span>
						{/if}
						<span class="metin">
							<strong>{a.baslik}</strong>
							<small>
								{ESER_TURU_ETIKETI[a.eserTuru]}{a.altBaslik ? ` · ${a.altBaslik}` : ''}{a.yil
									? ` · ${a.yil}`
									: ''}
							</small>
						</span>
						<span class="rozet">{KAYNAK_ADI[a.kaynak]}</span>
					</span>
				</label>
			{/each}
			{#if data.aramaHatasi}<p class="kucuk soluk">{data.aramaHatasi}</p>{/if}

			<label class="secim">
				<input type="radio" name="ana" value="yeni" checked={d.ana === 'yeni'} />
				<span class="secim-govde">
					<span class="kapak-yok" aria-hidden="true"><Simge ad="ekle" boyut={16} /></span>
					<span class="metin"><strong>Yeni olarak ekle</strong><small>Türünü sen seç</small></span>
				</span>
			</label>
			<div class="ana-yeni yigin">
				<div class="cipler" role="radiogroup" aria-label="Tür">
					{#each DUGUM_TURLERI as tur (tur)}
						<label class="cip" data-tur={tur}>
							<input type="radio" name="tur" value={tur} checked={(d.tur || 'eser') === tur} />
							<span><TurSekli {tur} boyut={11} /> {DUGUM_TURU_ETIKETI[tur]}</span>
						</label>
					{/each}
				</div>
				<div class="ana-eser-turu">
					<label class="gorunmez" for="eserTuru">Eser türü</label>
					<select id="eserTuru" name="eserTuru">
						{#each ESER_TURLERI as et (et)}
							<option value={et} selected={(d.eserTuru || 'kitap') === et}
								>{ESER_TURU_ETIKETI[et]}</option
							>
						{/each}
					</select>
				</div>
				<Alan id="baslik" etiket="Adı" hata={h.baslik}>
					<input
						id="baslik"
						name="baslik"
						value={d.baslik}
						maxlength="200"
						aria-invalid={!!h.baslik}
					/>
				</Alan>
			</div>
		</fieldset>

		<fieldset class="kart bolum getiren-bolumu">
			<legend>Seni buraya getiren</legend>
			{#each data.getirenEslesen as e (e.id)}
				<label class="secim">
					<input
						type="radio"
						name="getiren"
						value="mevcut:{e.id}"
						checked={d.getiren === `mevcut:${e.id}`}
					/>
					<span class="secim-govde">
						<TurSekli tur={e.tur} boyut={14} />
						<span class="metin">
							<strong>{e.baslik}</strong>
							<small>Haritanda zaten var{e.altBaslik ? ` · ${e.altBaslik}` : ''}</small>
						</span>
					</span>
				</label>
			{/each}
			<label class="secim">
				<input type="radio" name="getiren" value="yeni" checked={d.getiren === 'yeni'} />
				<span class="secim-govde">
					<span class="kapak-yok" aria-hidden="true"><Simge ad="ekle" boyut={16} /></span>
					<span class="metin"><strong>Yeni ekle</strong><small>Haritanda yoksa</small></span>
				</span>
			</label>
			<div class="getiren-yeni yigin">
				<div class="cipler" role="radiogroup" aria-label="Getirenin türü">
					{#each DUGUM_TURLERI as tur (tur)}
						<label class="cip" data-tur={tur}>
							<input
								type="radio"
								name="getirenTur"
								value={tur}
								checked={(d.getirenTur || 'kisi') === tur}
							/>
							<span><TurSekli {tur} boyut={11} /> {DUGUM_TURU_ETIKETI[tur]}</span>
						</label>
					{/each}
				</div>
				<div class="getiren-eser-turu">
					<label class="gorunmez" for="getirenEserTuru">Getiren eserin türü</label>
					<select id="getirenEserTuru" name="getirenEserTuru">
						{#each ESER_TURLERI as et (et)}
							<option value={et}>{ESER_TURU_ETIKETI[et]}</option>
						{/each}
					</select>
				</div>
				<Alan id="getirenBaslik" etiket="Adı" hata={h.getirenBaslik}>
					<input
						id="getirenBaslik"
						name="getirenBaslik"
						value={d.getirenBaslik}
						maxlength="200"
						aria-invalid={!!h.getirenBaslik}
					/>
				</Alan>
			</div>
			<label class="secim">
				<input type="radio" name="getiren" value="yok" checked={d.getiren === 'yok'} />
				<span class="secim-govde">
					<span class="kapak-yok" aria-hidden="true">?</span>
					<span class="metin"
						><strong>Bilmiyorum</strong><small>Sonra da ekleyebilirsin</small></span
					>
				</span>
			</label>
			<Alan id="not" etiket="Nasıl?" hata={h.not} ipucu="İsteğe bağlı kısa not">
				<input id="not" name="not" value={d.not} maxlength="1000" />
			</Alan>
		</fieldset>

		<fieldset class="kart bolum">
			<legend>Durum ve zaman</legend>
			<div class="cipler durumlar" role="radiogroup" aria-label="Durum (eserler için)">
				{#each ESER_DURUMLARI as durum (durum)}
					<label class="cip">
						<input type="radio" name="durum" value={durum} checked={d.durum === durum} />
						<span>{durumEtiketi(durum, null)}</span>
					</label>
				{/each}
			</div>
			<Alan
				id="tarih"
				etiket="Ne zaman?"
				hata={h.tarih}
				ipucu="Boş bırakabilirsin · 2026 · 2026-11"
			>
				<input id="tarih" name="tarih" value={d.tarih} inputmode="numeric" />
			</Alan>
			<p class="kucuk soluk">Hızlı eklenenler özel olarak kaydedilir; sonra düzenleyebilirsin.</p>
		</fieldset>

		<div class="satir">
			<button class="dugme dugme-birincil" disabled={gonderiliyor}>
				<Simge ad="onay" boyut={18} />
				{gonderiliyor ? 'Ekleniyor…' : 'Ekle'}
			</button>
			<a class="dugme dugme-hayalet" href="/dugumler/yeni">Ayrıntılı formu aç</a>
		</div>
	</form>
</div>

<style>
	.metin-duzelt {
		display: flex;
		gap: var(--a-2);
	}
	.onizleme {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--a-2);
		margin: 0;
		padding: var(--a-3) var(--a-4);
		border-radius: var(--yaricap);
		background: var(--yuzey-2);
		font-size: var(--boyut-sm);
	}
	.parca {
		padding: 2px var(--a-2);
		border-radius: var(--yaricap-sm);
		background: var(--yuzey);
		border: 1px solid var(--cizgi);
		font-weight: 600;
	}
	.parca.ana {
		border-color: var(--vurgu);
		color: var(--vurgu);
	}
	.ok {
		color: var(--vurgu);
		font-weight: 700;
	}
	.not {
		font-style: italic;
		color: var(--metin-soluk);
	}
	.bolum {
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
		margin: 0;
	}
	.bolum legend {
		float: left;
		width: 100%;
		margin-bottom: var(--a-2);
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-lg);
		font-weight: 600;
	}
	.secim {
		position: relative;
		display: block;
		cursor: pointer;
	}
	.secim input {
		position: absolute;
		opacity: 0;
		inset: 0;
		margin: 0;
		cursor: pointer;
	}
	.secim-govde {
		display: flex;
		align-items: center;
		gap: var(--a-3);
		padding: var(--a-2) var(--a-3);
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap);
		background: var(--yuzey);
		transition:
			border-color var(--gecis),
			background var(--gecis);
	}
	.secim:hover .secim-govde {
		border-color: var(--cizgi-guclu);
	}
	.secim input:checked + .secim-govde {
		border-color: var(--vurgu);
		background: var(--vurgu-zemin);
		box-shadow: inset 3px 0 0 var(--vurgu);
	}
	.secim input:focus-visible + .secim-govde {
		outline: 2px solid var(--vurgu);
		outline-offset: 2px;
	}
	.secim img,
	.kapak-yok {
		flex: none;
		width: 2.25rem;
		height: 3.2rem;
		border-radius: var(--yaricap-sm);
		object-fit: cover;
		background: var(--yuzey-2);
	}
	.kapak-yok {
		display: grid;
		place-items: center;
		color: var(--metin-soluk);
		font-weight: 700;
	}
	.metin {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		line-height: 1.3;
	}
	.metin small {
		color: var(--metin-soluk);
		font-size: var(--boyut-xs);
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

	/* Koşullu alanlar (JavaScript gerekmez) */
	.ana-yeni,
	.getiren-yeni,
	.ana-eser-turu,
	.getiren-eser-turu {
		display: none;
	}
	.hizli-form:has(input[name='ana'][value='yeni']:checked) .ana-yeni,
	.hizli-form:has(input[name='getiren'][value='yeni']:checked) .getiren-yeni {
		display: flex;
		padding-left: var(--a-4);
		border-left: 2px dotted var(--vurgu);
	}
	.hizli-form:has(input[name='tur'][value='eser']:checked) .ana-eser-turu,
	.hizli-form:has(input[name='getirenTur'][value='eser']:checked) .getiren-eser-turu {
		display: block;
		max-width: 14rem;
	}
	.durumlar {
		margin-bottom: var(--a-2);
	}
</style>
