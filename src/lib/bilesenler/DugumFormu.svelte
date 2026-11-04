<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		DUGUM_TURLERI,
		DUGUM_TURU_ETIKETI,
		ESER_DURUMLARI,
		ESER_TURLERI,
		ESER_TURU_ETIKETI,
		ETKI_DUZEYLERI,
		ETKI_ETIKETI,
		durumEtiketi,
		eserTuruMu
	} from '#lib/sabitler.ts';
	import { acikSatirIciSorgu, eslesir, sadelestir, satirIciBaglar } from '#lib/metin.ts';
	import Alan from './Alan.svelte';
	import DugumSecici, { type SecenekDugum } from './DugumSecici.svelte';
	import GizlilikSecici from './GizlilikSecici.svelte';
	import TurSekli from './TurSekli.svelte';

	type Props = {
		degerler?: Record<string, string>;
		hatalar?: Record<string, string>;
		gonderMetni: string;
		/** Form eylemi, ör. "?/kaydet"; boşsa varsayılan eylem */
		eylem?: string;
		/**
		 * Verilirse "Seni buraya ne getirdi?" bölümü gösterilir (yeni düğüm eklerken).
		 * Kullanıcının haritasındaki, getiren olarak seçilebilecek düğümler.
		 */
		getirenSecenekleri?: SecenekDugum[];
		/** Açıklamada [[…]] ile bağ kurulabilecek kendi düğümleri */
		bagSecenekleri?: SecenekDugum[];
	};
	let {
		degerler = {},
		hatalar = {},
		gonderMetni,
		eylem,
		getirenSecenekleri,
		bagSecenekleri = []
	}: Props = $props();
	let gonderiliyor = $state(false);

	const d = (ad: string) => degerler[ad] ?? '';

	// Durum etiketleri seçili eser türüne göre fiil alır ("Okudum", "İzledim"…)
	// svelte-ignore state_referenced_locally
	let eserTuru = $state(eserTuruMu(degerler.eserTuru) ? degerler.eserTuru : 'kitap');

	// ——— Başlık yazılırken eser önerisi (Open Library / TMDB) ———
	let baslik = $state(d('baslik'));
	let altBaslik = $state(d('altBaslik'));
	let yil = $state(d('yil'));
	let form: HTMLFormElement | undefined = $state();
	let oneriler = $state<{ baslik: string; altBaslik: string | null; yil: number | null }[]>([]);
	let oneriZamanlayici: ReturnType<typeof setTimeout> | undefined;
	let oneriNo = 0;

	function eserSeciliMi() {
		return (
			(form?.querySelector('input[name="tur"]:checked') as HTMLInputElement | null)?.value ===
			'eser'
		);
	}

	function oneriAra() {
		clearTimeout(oneriZamanlayici);
		const q = baslik.trim();
		if (q.length < 3 || !eserSeciliMi() || !['kitap', 'film', 'dizi'].includes(eserTuru)) {
			oneriler = [];
			return;
		}
		oneriZamanlayici = setTimeout(async () => {
			const no = ++oneriNo;
			try {
				const yanit = await fetch(
					`/api/eser-ara?q=${encodeURIComponent(q)}&tur=${encodeURIComponent(eserTuru)}`
				);
				const veri = await yanit.json();
				if (no === oneriNo) oneriler = veri.sonuclar ?? [];
			} catch {
				oneriler = [];
			}
		}, 450);
	}

	function oneriSec(o: { baslik: string; altBaslik: string | null; yil: number | null }) {
		baslik = o.baslik;
		if (o.altBaslik) altBaslik = o.altBaslik;
		if (o.yil) yil = String(o.yil);
		oneriler = [];
	}

	// ——— Açıklamada satır içi bağ: [[ yazınca kendi düğümlerin önerilir ———
	let aciklama = $state(d('aciklama'));
	let aciklamaAlani: HTMLTextAreaElement | undefined = $state();
	let acikSorgu = $state<string | null>(null);
	const satirIciAdaylar = $derived(
		acikSorgu === null
			? []
			: bagSecenekleri.filter((s) => !acikSorgu || eslesir(s.baslik, acikSorgu)).slice(0, 6)
	);
	const satirIciOnizleme = $derived(
		satirIciBaglar(aciklama).map((b) => ({
			baslik: b,
			bulundu: bagSecenekleri.some((s) => sadelestir(s.baslik) === sadelestir(b))
		}))
	);

	function aciklamaYazildi() {
		const el = aciklamaAlani;
		if (!el) return;
		acikSorgu = acikSatirIciSorgu(el.value.slice(0, el.selectionStart ?? el.value.length));
	}

	function satirIciSec(baslikSecilen: string) {
		const el = aciklamaAlani;
		if (!el) return;
		const imlec = el.selectionStart ?? el.value.length;
		const oncesi = el.value.slice(0, imlec).replace(/\[\[[^[\]\n]*$/, `[[${baslikSecilen}]]`);
		aciklama = oncesi + el.value.slice(imlec);
		acikSorgu = null;
		queueMicrotask(() => {
			el.focus();
			el.selectionStart = el.selectionEnd = oncesi.length;
		});
	}

	const getirenKip = $derived(
		d('getirenKip') || (getirenSecenekleri && getirenSecenekleri.length ? 'mevcut' : 'yeni')
	);
</script>

<form
	bind:this={form}
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
					<span><TurSekli {tur} boyut={12} /> {DUGUM_TURU_ETIKETI[tur]}</span>
				</label>
			{/each}
		</div>
		{#if hatalar.tur}<span class="hata-metni">{hatalar.tur}</span>{/if}
	</fieldset>

	<div class="eser-alani">
		<Alan id="eserTuru" etiket="Eser türü" hata={hatalar.eserTuru}>
			<select
				id="eserTuru"
				name="eserTuru"
				aria-invalid={!!hatalar.eserTuru}
				onchange={(e) => {
					const deger = e.currentTarget.value;
					if (eserTuruMu(deger)) eserTuru = deger;
				}}
			>
				{#each ESER_TURLERI as et (et)}
					<option value={et} selected={(d('eserTuru') || 'kitap') === et}
						>{ESER_TURU_ETIKETI[et]}</option
					>
				{/each}
			</select>
		</Alan>
	</div>

	<Alan id="baslik" etiket="Başlık" hata={hatalar.baslik}>
		<input
			id="baslik"
			name="baslik"
			bind:value={baslik}
			oninput={oneriAra}
			maxlength="200"
			required
			autocomplete="off"
			aria-invalid={!!hatalar.baslik}
			aria-describedby={oneriler.length ? 'eser-onerileri' : undefined}
		/>
		{#if oneriler.length}
			<ul class="oneriler" id="eser-onerileri" aria-label="Eser önerileri">
				{#each oneriler as o, i (i)}
					<li>
						<button type="button" onclick={() => oneriSec(o)}>
							<strong>{o.baslik}</strong>
							<small>{[o.altBaslik, o.yil].filter(Boolean).join(' · ')}</small>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</Alan>

	<Alan
		id="altBaslik"
		etiket="Kısa bilgi"
		hata={hatalar.altBaslik}
		ipucu="Eser için yazar/yönetmen/sanatçı; kişi için kim olduğu (ör. “lise öğretmenim”)."
	>
		<input id="altBaslik" name="altBaslik" bind:value={altBaslik} maxlength="200" />
	</Alan>

	<fieldset class="alan eser-alani">
		<legend class="etiket">Durum</legend>
		<div class="secenekler kucuk-secenekler">
			{#each ESER_DURUMLARI as durum (durum)}
				<label class="secenek durum-secenegi">
					<input type="radio" name="durum" value={durum} checked={d('durum') === durum} />
					<span>{durumEtiketi(durum, eserTuru)}</span>
				</label>
			{/each}
		</div>
		<span class="ipucu">“Merak ediyorum” dediklerin merak listende toplanır.</span>
		{#if hatalar.durum}<span class="hata-metni">{hatalar.durum}</span>{/if}
	</fieldset>

	{#if getirenSecenekleri}
		<fieldset class="getiren">
			<legend>Seni buraya ne getirdi?</legend>
			<p class="getiren-aciklama">
				İz'in kalbi bu soru: bir kitap, bir kişi, bir yer, bir karar… Bilmiyorsan boş bırak; sonra
				da ekleyebilirsin.
			</p>
			<div class="kipler" role="radiogroup" aria-label="Getireni nasıl belirteceksin?">
				{#if getirenSecenekleri.length}
					<label class="kip">
						<input
							type="radio"
							name="getirenKip"
							value="mevcut"
							checked={getirenKip === 'mevcut'}
						/>
						<span>Haritamdan seç</span>
					</label>
				{/if}
				<label class="kip">
					<input type="radio" name="getirenKip" value="yeni" checked={getirenKip === 'yeni'} />
					<span>Yeni ekle</span>
				</label>
				<label class="kip">
					<input type="radio" name="getirenKip" value="yok" checked={getirenKip === 'yok'} />
					<span>Bilmiyorum</span>
				</label>
			</div>

			{#if getirenSecenekleri.length}
				<div class="kip-mevcut">
					<Alan id="getirenId" etiket="Haritandaki düğüm" hata={hatalar.getiren}>
						<DugumSecici
							id="getirenId"
							ad="getirenId"
							secenekler={getirenSecenekleri}
							secili={d('getirenId') || null}
							hata={hatalar.getiren}
							yerTutucu="Kitap, kişi, yer… adını yaz"
						/>
					</Alan>
				</div>
			{/if}

			<div class="kip-yeni yigin">
				<div class="secenekler kucuk-secenekler" role="radiogroup" aria-label="Getirenin türü">
					{#each DUGUM_TURLERI as tur (tur)}
						<label class="secenek" data-tur={tur}>
							<input
								type="radio"
								name="getirenTur"
								value={tur}
								checked={(d('getirenTur') || 'kisi') === tur}
							/>
							<span><TurSekli {tur} boyut={11} /> {DUGUM_TURU_ETIKETI[tur]}</span>
						</label>
					{/each}
				</div>
				<div class="getiren-eser-turu">
					<label class="gorunmez" for="getirenEserTuru">Getiren eserin türü</label>
					<select id="getirenEserTuru" name="getirenEserTuru">
						{#each ESER_TURLERI as et (et)}
							<option value={et} selected={(d('getirenEserTuru') || 'kitap') === et}
								>{ESER_TURU_ETIKETI[et]}</option
							>
						{/each}
					</select>
				</div>
				<Alan id="getirenBaslik" etiket="Adı" hata={hatalar.getirenBaslik}>
					<input
						id="getirenBaslik"
						name="getirenBaslik"
						value={d('getirenBaslik')}
						maxlength="200"
						placeholder="ör. Selin Hoca"
						aria-invalid={!!hatalar.getirenBaslik}
					/>
				</Alan>
			</div>

			<div class="kip-not">
				<Alan
					id="getirenNot"
					etiket="Nasıl?"
					hata={hatalar.getirenNot}
					ipucu="İsteğe bağlı: “derste bir paragrafını okudu”, “filmin müziğiydi”…"
				>
					<input id="getirenNot" name="getirenNot" value={d('getirenNot')} maxlength="1000" />
				</Alan>
			</div>
		</fieldset>
	{/if}

	<div class="iki">
		<Alan
			id="tarih"
			etiket="Ne zaman?"
			hata={hatalar.tarih}
			ipucu="Yıl, ay ya da gün: 1998 · 1998-05 · 12.05.1998"
		>
			<input
				id="tarih"
				name="tarih"
				value={d('tarih')}
				inputmode="numeric"
				placeholder="ör. 2019"
				aria-invalid={!!hatalar.tarih}
			/>
		</Alan>
		<div class="eser-alani">
			<Alan id="yil" etiket="Yayın yılı" hata={hatalar.yil}>
				<input
					id="yil"
					name="yil"
					bind:value={yil}
					inputmode="numeric"
					maxlength="4"
					aria-invalid={!!hatalar.yil}
				/>
			</Alan>
		</div>
	</div>

	<Alan
		id="aciklama"
		etiket="Açıklama"
		hata={hatalar.aciklama}
		ipucu={bagSecenekleri.length
			? '[[ yazıp bir düğüm seç: kaydedince bu düğümden ona “götürdü” bağı kurulur.'
			: null}
	>
		<textarea
			id="aciklama"
			name="aciklama"
			maxlength="5000"
			rows="4"
			bind:this={aciklamaAlani}
			bind:value={aciklama}
			oninput={aciklamaYazildi}
			onkeydown={(e) => {
				if (e.key === 'Escape' && acikSorgu !== null) {
					acikSorgu = null;
					e.preventDefault();
				}
			}}></textarea>
		{#if satirIciAdaylar.length}
			<ul class="oneriler" aria-label="Bağlanacak düğüm">
				{#each satirIciAdaylar as aday (aday.id)}
					<li>
						<button type="button" onclick={() => satirIciSec(aday.baslik)}>
							<TurSekli tur={aday.tur} boyut={11} />
							<strong>{aday.baslik}</strong>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
		{#if satirIciOnizleme.length}
			<p class="satir-ici-onizleme kucuk">
				Kaydedince kurulacak bağlar:
				{#each satirIciOnizleme as b, i (b.baslik)}
					{i ? ', ' : ''}<span class:bulunamadi={!b.bulundu}
						>{b.baslik}{b.bulundu ? '' : ' (haritanda yok)'}</span
					>
				{/each}
			</p>
		{/if}
	</Alan>

	<details class="konum" open={!!(d('enlem') || d('yerAdi') || hatalar.enlem || hatalar.boylam)}>
		<summary>Konum (isteğe bağlı)</summary>
		<div class="yigin">
			<Alan id="yerAdi" etiket="Yer adı" hata={hatalar.yerAdi}>
				<input
					id="yerAdi"
					name="yerAdi"
					value={d('yerAdi')}
					maxlength="200"
					placeholder="ör. Kadıköy, İstanbul"
				/>
			</Alan>
			<div class="iki">
				<Alan id="enlem" etiket="Enlem" hata={hatalar.enlem}>
					<input
						id="enlem"
						name="enlem"
						value={d('enlem')}
						inputmode="decimal"
						placeholder="40.9909"
						aria-invalid={!!hatalar.enlem}
					/>
				</Alan>
				<Alan id="boylam" etiket="Boylam" hata={hatalar.boylam}>
					<input
						id="boylam"
						name="boylam"
						value={d('boylam')}
						inputmode="decimal"
						placeholder="29.0303"
						aria-invalid={!!hatalar.boylam}
					/>
				</Alan>
			</div>
			<p class="kucuk soluk">Harita görünümü geldiğinde konumu haritadan seçebileceksin.</p>
		</div>
	</details>

	<fieldset class="alan">
		<legend class="etiket"
			>Hayatındaki etkisi <span class="soluk">(isteğe bağlı, puan değil)</span></legend
		>
		<div class="secenekler kucuk-secenekler">
			<label class="secenek durum-secenegi">
				<input type="radio" name="etki" value="" checked={!d('etki')} />
				<span>Belirtme</span>
			</label>
			{#each ETKI_DUZEYLERI as e (e)}
				<label class="secenek durum-secenegi">
					<input type="radio" name="etki" value={e} checked={d('etki') === e} />
					<span>{ETKI_ETIKETI[e]}</span>
				</label>
			{/each}
		</div>
		<span class="ipucu">Ağda düğümün büyüklüğünü belirler.</span>
	</fieldset>

	<GizlilikSecici secili={d('gizlilik')} hata={hatalar.gizlilik} />
	<p class="kisi-uyarisi bildirim bildirim-uyari" role="note">
		<strong>Bu düğüm gerçek bir kişi hakkında.</strong> Herkese açık yaparsan adı ve yazdıkların herkes
		tarafından görülebilir. Kişinin onayı olmadan özel bilgilerini paylaşma.
	</p>

	<div class="satir">
		<button class="dugme dugme-birincil" disabled={gonderiliyor}>
			{gonderiliyor ? 'Kaydediliyor…' : gonderMetni}
		</button>
	</div>
</form>

<style>
	.oneriler {
		list-style: none;
		margin: var(--a-1) 0 0;
		padding: var(--a-1);
		border: 1px solid var(--cizgi-guclu);
		border-radius: var(--yaricap);
		background: var(--yuzey);
		box-shadow: var(--golge-1);
	}
	.oneriler button {
		display: flex;
		align-items: baseline;
		gap: var(--a-2);
		width: 100%;
		padding: var(--a-2);
		border: 0;
		border-radius: var(--yaricap-sm);
		background: transparent;
		color: var(--metin);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.oneriler button:hover,
	.oneriler button:focus-visible {
		background: var(--vurgu-zemin);
	}
	.oneriler small {
		color: var(--metin-soluk);
	}
	.satir-ici-onizleme {
		margin: var(--a-1) 0 0;
		color: var(--metin-soluk);
	}
	.satir-ici-onizleme span {
		color: var(--metin);
		font-weight: 600;
	}
	.satir-ici-onizleme .bulunamadi {
		color: var(--metin-soluk);
		font-weight: 400;
		text-decoration: line-through;
	}
	.etiket {
		font-weight: 550;
		font-size: var(--boyut-sm);
		margin-bottom: var(--a-2);
	}
	.ipucu {
		font-size: var(--boyut-xs);
		color: var(--metin-soluk);
	}
	.secenekler {
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-2);
	}
	.secenek,
	.kip {
		position: relative;
		cursor: pointer;
	}
	.secenek input,
	.kip input {
		position: absolute;
		opacity: 0;
		inset: 0;
		margin: 0;
		cursor: pointer;
	}
	.secenek span,
	.kip span {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 2.5rem;
		padding: 0 var(--a-4);
		border-radius: var(--yaricap-tam);
		border: 1px solid var(--cizgi-guclu);
		background: var(--yuzey);
		font-weight: 550;
		font-size: var(--boyut-sm);
	}
	.kucuk-secenekler .secenek span {
		min-height: 2.25rem;
		padding: 0 var(--a-3);
	}
	.secenek input:checked + span {
		background: var(--renk-zemin, var(--vurgu-zemin));
		border-color: var(--renk, var(--vurgu));
		color: var(--renk, var(--vurgu));
	}
	.secenek input:focus-visible + span,
	.kip input:focus-visible + span {
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
	fieldset.eser-alani {
		border: 0;
		padding: 0;
		margin: 0;
	}

	/* ——— "Seni buraya ne getirdi?" ——— */
	.getiren {
		display: flex;
		flex-direction: column;
		gap: var(--a-3);
		margin: 0;
		padding: var(--a-4);
		border: 1px solid color-mix(in srgb, var(--vurgu) 35%, var(--cizgi));
		border-left: 4px solid var(--vurgu);
		border-radius: var(--yaricap);
		background: var(--vurgu-zemin);
	}
	.getiren legend {
		float: left;
		width: 100%;
		margin-bottom: var(--a-1);
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-lg);
		font-weight: 600;
	}
	.getiren-aciklama {
		margin: 0;
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
	}
	.kipler {
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-2);
	}
	.kip input:checked + span {
		background: var(--metin);
		border-color: var(--metin);
		color: var(--zemin);
	}
	.kip-mevcut,
	.kip-yeni,
	.kip-not {
		display: none;
	}
	.getiren:has(input[name='getirenKip'][value='mevcut']:checked) .kip-mevcut,
	.getiren:has(input[name='getirenKip'][value='yeni']:checked) .kip-yeni {
		display: flex;
		flex-direction: column;
		gap: var(--a-3);
	}
	.getiren:has(input[name='getirenKip'][value='mevcut']:checked) .kip-not,
	.getiren:has(input[name='getirenKip'][value='yeni']:checked) .kip-not {
		display: block;
	}
	.getiren-eser-turu {
		display: none;
		max-width: 14rem;
	}
	.getiren:has(input[name='getirenTur'][value='eser']:checked) .getiren-eser-turu {
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

	/* Kişi düğümü herkese açık yapılırken mahremiyet uyarısı (JavaScript gerekmez) */
	.kisi-uyarisi {
		display: none;
		margin: 0;
	}
	/* Gizlilik seçenekleri GizlilikSecici bileşeninde: seçici :global ile ona uzanır */
	.dugum-formu:has(input[name='tur'][value='kisi']:checked):has(
			:global(input[name='gizlilik'][value='herkes']:checked)
		)
		.kisi-uyarisi {
		display: block;
	}
</style>
