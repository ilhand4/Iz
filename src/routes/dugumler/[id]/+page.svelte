<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import SesKaydedici from '#lib/bilesenler/SesKaydedici.svelte';
	import { SES_DURUMU_ETIKETI, sureYaz, type SesDurumu } from '#lib/ses.ts';
	import Alan from '#lib/bilesenler/Alan.svelte';
	import BagOgesi from '#lib/bilesenler/BagOgesi.svelte';
	import BagTuruSecici from '#lib/bilesenler/BagTuruSecici.svelte';
	import DugumSecici from '#lib/bilesenler/DugumSecici.svelte';
	import GizlilikRozeti from '#lib/bilesenler/GizlilikRozeti.svelte';
	import IzKarti from '#lib/bilesenler/IzKarti.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import TurRozeti from '#lib/bilesenler/TurRozeti.svelte';
	import TurSekli from '#lib/bilesenler/TurSekli.svelte';
	import {
		durumEtiketi,
		ESER_DURUMLARI,
		ETKI_ETIKETI,
		etkiMi,
		type DugumTuru
	} from '#lib/sabitler.ts';
	import OnceSonra from '#lib/bilesenler/OnceSonra.svelte';
	import {
		EN_BUYUK_FOTO_MB,
		FOTO_DONEMI_ETIKETI,
		FOTO_HAKKI_ETIKETI,
		FOTO_HAKLARI,
		karsilastirmaCifti,
		type FotoDonemi,
		type FotoHakki
	} from '#lib/fotograf.ts';
	import { KARAR_SONUCLARI, KARAR_SONUCU_ETIKETI, type KararSonucu } from '#lib/kararDefteri.ts';
	import { mesafeYaz } from '#lib/konumlar.ts';
	import { tarihYaz } from '#lib/tarih.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const d = $derived(data.dugum);

	type BagFormu = {
		yon: string;
		hatalar: Record<string, string>;
		degerler: Record<string, string>;
	};
	const bagFormu = $derived((form?.bag ?? null) as BagFormu | null);
	const gidenHata = $derived(bagFormu?.yon === 'giden' ? bagFormu : null);
	const gelenHata = $derived(bagFormu?.yon === 'gelen' ? bagFormu : null);
	const bagDuzenle = $derived(
		(form?.bagDuzenle ?? null) as {
			bagId: string;
			hatalar: Record<string, string>;
			degerler: Record<string, string>;
		} | null
	);
	// Yeni eklenen ya da "?getiren" ile açılan düğümde getiren sorusu öne çıkar
	const getirenSorusu = $derived(
		data.sahibiMi &&
			(data.eklendi || data.getirenSor) &&
			data.baglar.gelen.length === 0 &&
			data.secenekler.length > 0
	);
	const alintiHata = $derived(
		(
			form as {
				alinti?: { hatalar: Record<string, string>; degerler: Record<string, string> };
			} | null
		)?.alinti ?? null
	);
	const fotoHata = $derived(
		(
			form as {
				foto?: { hatalar: Record<string, string>; degerler: Record<string, string> };
			} | null
		)?.foto ?? null
	);
	const cift = $derived(karsilastirmaCifti(data.fotolar));
	const sesHata = $derived((form as { ses?: { hata: string } } | null)?.ses?.hata ?? null);
	// Yazıya dökülmekte olan ses varsa sayfa birkaç saniyede bir tazelenir
	$effect(() => {
		if (!data.sesler.some((x) => x.durum === 'bekliyor' || x.durum === 'isleniyor')) return;
		const z = setInterval(() => invalidateAll(), 4000);
		return () => clearInterval(z);
	});
	const kararFormu = $derived(
		form as {
			kararHatalari?: Record<string, string>;
			kararDegerleri?: Record<string, string>;
			sonucHatalari?: Record<string, string>;
		} | null
	);
	const kararDeger = (ad: 'gerekce' | 'beklenti' | 'guven' | 'sorulacak') =>
		kararFormu?.kararDegerleri?.[ad] ??
		(ad === 'guven'
			? (data.karar?.guven?.toString() ?? '')
			: ad === 'sorulacak'
				? (data.karar?.sorulacak ?? '')
				: (data.karar?.[ad] ?? ''));
	const sonucZamani = $derived(
		!!data.karar &&
			!data.karar.sonuc &&
			!!data.karar.sorulacak &&
			data.karar.sorulacak <= data.bugun
	);
	const uzakKapilar = $derived(data.kapilar.filter((k) => k.derinlik > 1));

	const KAYNAK_ADI: Record<string, string> = { openlibrary: 'Open Library', tmdb: 'TMDB' };
	function disBaglanti(kaynak: string | null, kimlik: string | null) {
		if (!kaynak || !kimlik) return null;
		if (kaynak === 'openlibrary') return `https://openlibrary.org/works/${kimlik}`;
		if (kaynak === 'tmdb') return `https://www.themoviedb.org/${kimlik}`;
		return null;
	}
	const disAdres = $derived(disBaglanti(d.disKaynak, d.disKimlik));
</script>

<svelte:head><title>{d.baslik} · İz</title></svelte:head>

<div class="kap yigin">
	{#if data.sahibiMi}
		<a href="/dugumler" class="geri"><Simge ad="geri" boyut={16} /> Düğümler</a>
	{/if}

	{#snippet disOge(
		bag: {
			id: string;
			not: string | null;
			dugum: { id: string; baslik: string; tur: DugumTuru };
			kisi: { ad: string; kullaniciAdi: string };
		},
		silinebilir: boolean
	)}
		<li class="dis-bag">
			<span class="dis-ust">
				<a href="/dugumler/{bag.dugum.id}"
					><TurSekli tur={bag.dugum.tur} boyut={11} /> {bag.dugum.baslik}</a
				>
				<a class="kucuk soluk" href="/@{bag.kisi.kullaniciAdi}">@{bag.kisi.kullaniciAdi}</a>
			</span>
			{#if bag.not}<span class="kucuk not">“{bag.not}”</span>{/if}
			{#if silinebilir}
				<form method="POST" action="?/disBagSil" use:enhance>
					<input type="hidden" name="bagId" value={bag.id} />
					<button
						class="dugme dugme-kucuk dugme-hayalet"
						aria-label="{bag.dugum.baslik} bağını kaldır">Kaldır</button
					>
				</form>
			{/if}
		</li>
	{/snippet}

	{#snippet gelenFormu()}
		<form method="POST" action="?/bagKur" class="yigin" use:enhance>
			<input type="hidden" name="yon" value="gelen" />
			<Alan
				id="gelenKaynak"
				etiket="Beni “{d.baslik}” düğümüne getiren:"
				hata={gelenHata?.hatalar.digerId}
			>
				<DugumSecici
					id="gelenKaynak"
					ad="digerId"
					secenekler={data.secenekler}
					secili={gelenHata?.degerler.digerId}
					hata={gelenHata?.hatalar.digerId}
				/>
			</Alan>
			<Alan
				id="gelenNot"
				etiket="Nasıl?"
				hata={gelenHata?.hatalar.not}
				ipucu="İsteğe bağlı: “Selin Hoca önerdi”, “filmin müziğiydi”…"
			>
				<input id="gelenNot" name="not" maxlength="1000" value={gelenHata?.degerler.not ?? ''} />
			</Alan>
			<Alan
				id="gelenTarih"
				etiket="Ne zaman?"
				hata={gelenHata?.hatalar.tarih}
				ipucu="İsteğe bağlı: 2021 · 2021-03 · 14.03.2021"
			>
				<input
					id="gelenTarih"
					name="tarih"
					inputmode="numeric"
					value={gelenHata?.degerler.tarih ?? ''}
					aria-invalid={!!gelenHata?.hatalar.tarih}
				/>
			</Alan>
			<BagTuruSecici id="gelenTur" secili={gelenHata?.degerler.tur} />
			<div class="satir"><button class="dugme dugme-birincil">Bağı kur</button></div>
		</form>
	{/snippet}

	{#if getirenSorusu}
		<section class="getiren-sorusu" aria-labelledby="getiren-sorusu-baslik">
			<h2 id="getiren-sorusu-baslik">
				{data.eklendi ? 'Eklendi. ' : ''}Seni buraya ne getirdi?
			</h2>
			<p class="soluk kucuk">
				İz'in kalbi bu soru: bir kişi, bir başka eser, bir yer ya da bir an olabilir. Haritanda
				yoksa <a href="/dugumler/yeni?tur=kisi">yeni bir düğüm</a> olarak ekleyebilirsin.
			</p>
			{@render gelenFormu()}
		</section>
	{/if}

	<article class="kart dugum" data-tur={d.tur}>
		{#if d.gorselUrl}
			<img src={d.gorselUrl} alt="{d.baslik} kapağı" referrerpolicy="no-referrer" />
		{/if}
		<div class="yigin bilgi">
			<div class="satir">
				<TurRozeti tur={d.tur} eserTuru={d.eserTuru} />
				<GizlilikRozeti gizlilik={d.gizlilik} />
			</div>
			<div>
				<h1>{d.baslik}</h1>
				{#if d.altBaslik || d.yil}
					<p class="alt-baslik">{[d.altBaslik, d.yil].filter(Boolean).join(' · ')}</p>
				{/if}
			</div>
			{#if d.tur === 'eser'}
				{#if data.sahibiMi}
					<form method="POST" action="?/durum" class="durumlar" use:enhance>
						<span class="gorunmez" id="durum-baslik">Durum</span>
						<div class="durum-dugmeleri" role="group" aria-labelledby="durum-baslik">
							{#each ESER_DURUMLARI as durum (durum)}
								<button
									class="durum-dugmesi"
									name="durum"
									value={durum}
									aria-pressed={d.durum === durum}
								>
									{durumEtiketi(durum, d.eserTuru)}
								</button>
							{/each}
						</div>
					</form>
				{:else if d.durum}
					<span class="rozet durum-rozeti">{durumEtiketi(d.durum, d.eserTuru)}</span>
				{/if}
			{/if}
			<ul class="ozellikler kucuk soluk">
				{#if d.tarih}
					<li><Simge ad="takvim" boyut={16} /> {tarihYaz(d.tarih, d.tarihHassasiyeti)}</li>
				{/if}
				{#if d.yerAdi || d.enlem !== null}
					<li>
						<Simge ad="konum" boyut={16} />
						{d.yerAdi ?? ''}
						{#if d.enlem !== null && d.boylam !== null}
							<span class="koordinat">({d.enlem.toFixed(4)}, {d.boylam.toFixed(4)})</span>
							{#if data.sahibiMi}
								<a href="/dugumler/harita?odak={d.id}">Haritada gör</a>
							{/if}
						{/if}
					</li>
				{/if}
				{#if !data.sahibiMi}
					<li>
						<a href="/@{data.sahip.kullaniciAdi}">{data.sahip.ad} (@{data.sahip.kullaniciAdi})</a> paylaştı
					</li>
				{/if}
				{#if disAdres && d.disKaynak}
					<li>
						<a href={disAdres} rel="noopener noreferrer external" target="_blank">
							{KAYNAK_ADI[d.disKaynak]} sayfası ↗
						</a>
					</li>
				{/if}
			</ul>
			{#if d.etki && etkiMi(d.etki)}
				<span class="rozet etki-rozeti" data-etki={d.etki}>{ETKI_ETIKETI[d.etki]}</span>
			{/if}
			{#if d.muhurlu}
				<div class="kapsul" role="note" aria-labelledby="kapsul-baslik">
					<Simge ad="kilit" boyut={22} />
					<div class="yigin">
						<p id="kapsul-baslik" class="kapsul-baslik">
							Zaman kapsülü · {tarihYaz(d.muhurTarihi, 'gun')} günü açılacak
						</p>
						<p class="kucuk soluk">
							O güne kadar açıklaması, fotoğrafları ve sesleri {data.sahibiMi
								? 'sana bile '
								: ''}gösterilmez.
						</p>
						{#if data.sahibiMi}
							<details>
								<summary class="kucuk">Beklemeden aç</summary>
								<form method="POST" action="?/kapsuluAc" class="yigin" use:enhance>
									<label class="onay kucuk">
										<input type="checkbox" name="onay" value="evet" required />
										<span>Kapsülü şimdi açmak istiyorum; bu geri alınamaz.</span>
									</label>
									<div class="satir">
										<button class="dugme dugme-kucuk">Kapsülü aç</button>
									</div>
								</form>
							</details>
						{/if}
					</div>
				</div>
			{:else if d.muhurTarihi}
				<p class="kucuk soluk kapsul-acildi">
					<Simge ad="kilit" boyut={14} /> Bu zaman kapsülü {tarihYaz(d.muhurTarihi, 'gun')} günü açıldı.
				</p>
			{/if}
			{#if d.aciklama}<p class="aciklama">{d.aciklama}</p>{/if}
			{#if data.yol.length || data.kapilar.length}
				<p class="olcuyler kucuk">
					{#if data.yol.length}
						<a href="#gelen-baslik"><strong>{data.yol.length}</strong> şeyden geliniyor</a>
					{/if}
					{#if data.kapilar.length}
						<a href="#giden-baslik"><strong>{data.kapilar.length}</strong> şeye kapı açtı</a>
					{/if}
				</p>
			{/if}
			{#if data.sahibiMi}
				<div class="satir eylemler">
					{#if !d.muhurlu}
						<a class="dugme dugme-kucuk" href="/dugumler/{d.id}/duzenle">
							<Simge ad="kalem" boyut={16} /> Düzenle
						</a>
					{/if}
					<a class="dugme dugme-kucuk" href="/dugumler/ag?odak={d.id}">
						<Simge ad="dugumler" boyut={16} /> Ağda göster
					</a>
					<a class="dugme dugme-kucuk" href="/izler/yeni?dugum={d.id}">
						<Simge ad="iz" boyut={16} /> Buradan iz başlat
					</a>
				</div>
			{/if}
		</div>
	</article>

	{#if data.yapimciOnerisi || data.wikidataOnerisi}
		<div class="zengin">
			{#if data.yapimciOnerisi}
				<form method="POST" action="?/yapimciEkle" class="zengin-oneri" use:enhance>
					<span class="kucuk"
						><strong>{data.yapimciOnerisi}</strong> haritanda kişi olarak yok.</span
					>
					<button class="dugme dugme-kucuk">
						<Simge ad="ekle" boyut={14} /> Kişi olarak ekle ve bağla
					</button>
				</form>
			{/if}
			{#if data.wikidataOnerisi}
				<form method="POST" action="?/wikidata" class="zengin-oneri" use:enhance>
					<span class="kucuk soluk"
						>Boş alanları Wikidata’dan doldur (açıklama, yıllar, konum).</span
					>
					<button class="dugme dugme-kucuk">Wikidata’dan bilgi al</button>
				</form>
			{/if}
		</div>
	{/if}

	{#if data.yakinlar.length}
		<section class="yakinlar yigin" aria-labelledby="yakinlar-baslik">
			<div class="satir arasi">
				<h2 id="yakinlar-baslik">Yakınındakiler</h2>
				<a class="kucuk" href="/dugumler/harita?odak={d.id}">Haritada gör</a>
			</div>
			<ul>
				{#each data.yakinlar as y (y.id)}
					<li>
						<a href="/dugumler/{y.id}"><TurSekli tur={y.tur} boyut={12} /> {y.baslik}</a>
						<small class="soluk">{y.mesafe === 0 ? 'aynı yerde' : mesafeYaz(y.mesafe)}</small>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.oneriSonucu}
		<p class="bildirim bildirim-basari" role="status">
			Anlatılandan {data.oneriSonucu[0]} yeni düğüm eklendi, {data.oneriSonucu[1]} bağ kuruldu.
		</p>
	{/if}

	{#if data.sesler.length || data.sesEklenebilir}
		<section class="sesler yigin" aria-labelledby="sesler-baslik">
			<div class="satir arasi">
				<h2 id="sesler-baslik">Sesli anılar</h2>
				{#if data.sahibiMi && (data.sesler.some((x) => x.metin) || d.aciklama)}
					<a class="kucuk" href="/dugumler/{d.id}/oneriler">Anlatılandan düğüm öner</a>
				{/if}
			</div>
			{#if data.sesler.length}
				<ul class="ses-listesi">
					{#each data.sesler as ses (ses.id)}
						<li class="kart">
							<audio controls preload="none" src="/sesler/{ses.id}" aria-label="Sesli anı"></audio>
							<div class="ses-ust kucuk soluk">
								<span data-durum={ses.durum}
									>{SES_DURUMU_ETIKETI[ses.durum as SesDurumu]}{ses.sure
										? ` · ${sureYaz(ses.sure)}`
										: ''}</span
								>
								{#if data.sahibiMi}
									<span class="satir">
										{#if ses.durum === 'hata' || (ses.durum === 'kapali' && data.yaziyaDokmeVar)}
											<form method="POST" action="?/sesYenidenDene" use:enhance>
												<input type="hidden" name="sesId" value={ses.id} />
												<button class="dugme dugme-kucuk dugme-hayalet">Yeniden dene</button>
											</form>
										{/if}
										<form method="POST" action="?/sesSil" use:enhance>
											<input type="hidden" name="sesId" value={ses.id} />
											<button class="dugme dugme-kucuk dugme-hayalet" aria-label="Sesi sil">
												<Simge ad="cop" boyut={14} />
											</button>
										</form>
									</span>
								{/if}
							</div>
							{#if ses.metin}
								<p class="ses-metni">{ses.metin}</p>
							{/if}
							{#if data.sahibiMi && ses.durum !== 'bekliyor' && ses.durum !== 'isleniyor'}
								<details>
									<summary class="kucuk">{ses.metin ? 'Metni düzelt' : 'Metni elle yaz'}</summary>
									<form
										method="POST"
										action="?/sesMetni"
										class="yigin"
										use:enhance={() =>
											({ update }) =>
												update({ reset: false })}
									>
										<input type="hidden" name="sesId" value={ses.id} />
										<label class="gorunmez" for="metin-{ses.id}">Sesin metni</label>
										<textarea id="metin-{ses.id}" name="metin" rows="5" maxlength="50000"
											>{ses.metin ?? ''}</textarea
										>
										<div class="satir"><button class="dugme dugme-kucuk">Kaydet</button></div>
									</form>
								</details>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p class="soluk kucuk">
					{d.tur === 'kisi'
						? 'Onun sesinden bir hatıra kaydet: bir şarkı, bir öğüt, bir hikâye.'
						: 'Anlatarak kaydet; yazıya dökülen metinden kişi ve yer önerileri çıkarılır.'}
				</p>
			{/if}

			{#if data.sesEklenebilir}
				<details class="kart bag-formu" open={!!sesHata}>
					<summary>Ses ekle</summary>
					<form
						method="POST"
						action="?/sesEkle"
						enctype="multipart/form-data"
						class="yigin"
						use:enhance
					>
						<SesKaydedici id="sesDosya" />
						{#if sesHata}<p class="hata-metni" role="alert">{sesHata}</p>{/if}
						<p class="kucuk soluk">
							{data.yaziyaDokmeVar
								? 'Ses bu bilgisayarda yazıya dökülür; hiçbir yere gönderilmez.'
								: 'Yazıya dökme aracı kurulu değil: ses saklanır, metni elle yazabilirsin.'}
							Ses yalnızca sana {d.gizlilik === 'ozel' ? '' : 've grup arkadaşlarına '}açıktır;
							düğüm herkese açık olsa da herkese gösterilmez.
						</p>
						<div class="satir"><button class="dugme dugme-birincil">Kaydet</button></div>
					</form>
				</details>
			{/if}
		</section>
	{/if}

	{#if data.fotolar.length || data.fotoEklenebilir}
		<section class="fotograflar yigin" aria-labelledby="fotograflar-baslik">
			<h2 id="fotograflar-baslik">{d.tur === 'yer' ? 'Bir zamanlar burası' : 'Fotoğraflar'}</h2>
			{#if cift}
				<OnceSonra eski={cift.eski} yeni={cift.yeni} baslik={d.baslik} />
			{/if}
			{#if data.fotolar.length}
				<ul class="foto-izgarasi">
					{#each data.fotolar as f (f.id)}
						<li>
							<figure>
								<a href="/fotograflar/{f.id}" target="_blank" rel="noopener">
									<img
										src="/fotograflar/{f.id}?k=1"
										alt="{d.baslik}, {f.yil ??
											FOTO_DONEMI_ETIKETI[f.donem as FotoDonemi].toLocaleLowerCase(
												'tr-TR'
											)}{f.aciklama ? `: ${f.aciklama}` : ''}"
										width={f.genislik}
										height={f.yukseklik}
										loading="lazy"
									/>
								</a>
								<figcaption>
									<span class="foto-ust">
										<span class="rozet" data-donem={f.donem}
											>{FOTO_DONEMI_ETIKETI[f.donem as FotoDonemi]}{f.yil
												? ` · ${f.yil}`
												: ''}</span
										>
										{#if data.sahibiMi}
											<form method="POST" action="?/fotoSil" use:enhance>
												<input type="hidden" name="fotoId" value={f.id} />
												<button class="dugme dugme-kucuk dugme-hayalet" aria-label="Fotoğrafı sil">
													<Simge ad="cop" boyut={14} />
												</button>
											</form>
										{/if}
									</span>
									{#if f.aciklama}<span>{f.aciklama}</span>{/if}
									<small class="soluk">
										{FOTO_HAKKI_ETIKETI[f.hak as FotoHakki]}{f.kaynak ? ` · ${f.kaynak}` : ''}
									</small>
								</figcaption>
							</figure>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="soluk kucuk">
					{d.tur === 'yer'
						? 'Buranın eski bir fotoğrafını ve bugünkü hâlini ekle; ikisi yan yana kaydırılarak karşılaştırılır.'
						: 'Bu anıya ait fotoğrafları ekleyebilirsin.'}
				</p>
			{/if}

			{#if data.fotoEklenebilir}
				<details class="kart bag-formu" open={!!fotoHata}>
					<summary>Fotoğraf ekle</summary>
					<form
						method="POST"
						action="?/fotoEkle"
						enctype="multipart/form-data"
						class="yigin"
						use:enhance
					>
						<Alan
							id="fotoDosya"
							etiket="Fotoğraf"
							hata={fotoHata?.hatalar.dosya}
							ipucu="JPEG, PNG, WebP ya da AVIF; en fazla {EN_BUYUK_FOTO_MB} MB. Konum ve cihaz bilgileri (EXIF) yüklenirken silinir."
						>
							<input
								id="fotoDosya"
								name="dosya"
								type="file"
								accept="image/jpeg,image/png,image/webp,image/avif"
								required
							/>
						</Alan>
						<fieldset class="secenekler">
							<legend>Ne zamanın fotoğrafı?</legend>
							<label class="cip"
								><input
									type="radio"
									name="donem"
									value="eski"
									checked={(fotoHata?.degerler.donem ?? 'eski') === 'eski'}
								/> Eski</label
							>
							<label class="cip"
								><input
									type="radio"
									name="donem"
									value="yeni"
									checked={fotoHata?.degerler.donem === 'yeni'}
								/> Yeni (bugün)</label
							>
						</fieldset>
						<div class="karar-satiri">
							<Alan id="fotoYil" etiket="Yılı" hata={fotoHata?.hatalar.yil} ipucu="İsteğe bağlı">
								<input
									id="fotoYil"
									name="yil"
									inputmode="numeric"
									maxlength="4"
									value={fotoHata?.degerler.yil ?? ''}
								/>
							</Alan>
							<Alan id="fotoAciklama" etiket="Açıklama" hata={fotoHata?.hatalar.aciklama}>
								<input
									id="fotoAciklama"
									name="aciklama"
									maxlength="300"
									value={fotoHata?.degerler.aciklama ?? ''}
								/>
							</Alan>
						</div>
						<fieldset class="hak">
							<legend>Bu fotoğrafı neye dayanarak paylaşıyorsun?</legend>
							{#each FOTO_HAKLARI as h (h)}
								<label
									><input
										type="radio"
										name="hak"
										value={h}
										required
										checked={fotoHata?.degerler.hak === h}
									/>
									{FOTO_HAKKI_ETIKETI[h]}</label
								>
							{/each}
							{#if fotoHata?.hatalar.hak}
								<span class="hata-metni" role="alert">{fotoHata.hatalar.hak}</span>
							{/if}
						</fieldset>
						<Alan
							id="fotoKaynak"
							etiket="Kaynak"
							hata={fotoHata?.hatalar.kaynak}
							ipucu="Kim çekti, nereden? İzinli ya da kamu malı fotoğraflarda zorunlu (ör. “SALT Araştırma, CC BY-SA”)."
						>
							<input
								id="fotoKaynak"
								name="kaynak"
								maxlength="200"
								value={fotoHata?.degerler.kaynak ?? ''}
							/>
						</Alan>
						<label class="onay">
							<input type="checkbox" name="onay" value="evet" required />
							<span
								>Bu fotoğrafı yüklemeye ve düğümün gizlilik ayarına göre paylaşmaya hakkım olduğunu
								beyan ederim. Fotoğraftaki kişilerin mahremiyetine dikkat ederim.</span
							>
						</label>
						{#if fotoHata?.hatalar.onay}
							<span class="hata-metni" role="alert">{fotoHata.hatalar.onay}</span>
						{/if}
						{#if d.gizlilik === 'herkes'}
							<p class="bildirim bildirim-uyari kucuk">
								Bu düğüm herkese açık: fotoğraf da herkese görünür.
							</p>
						{/if}
						<div class="satir"><button class="dugme dugme-birincil">Yükle</button></div>
					</form>
				</details>
			{/if}
		</section>
	{/if}

	{#if data.sahibiMi && d.tur === 'karar'}
		<section class="karar-defteri yigin" aria-labelledby="karar-defteri-baslik">
			<div class="satir arasi">
				<h2 id="karar-defteri-baslik">Karar defteri</h2>
				<a href="/kararlar" class="kucuk">Tüm kararlar ve kalibrasyon</a>
			</div>
			<p class="soluk kucuk">
				Yalnızca sen görürsün; düğüm herkese açık olsa da gerekçe, güven ve sonuç paylaşılmaz.
			</p>

			{#if data.karar?.sonuc}
				<div class="kart sonuc-karti" data-sonuc={data.karar.sonuc}>
					<p class="ust-etiket">Sonuç</p>
					<p class="sonuc-metni">{KARAR_SONUCU_ETIKETI[data.karar.sonuc as KararSonucu]}</p>
					{#if data.karar.sonucNotu}<p class="not">{data.karar.sonucNotu}</p>{/if}
					{#if data.karar.guven !== null}
						<p class="kucuk soluk">Karar verirken %{data.karar.guven} emindin.</p>
					{/if}
				</div>
			{:else if sonucZamani || kararFormu?.sonucHatalari}
				<div class="kart sonuc-sor" role="region" aria-labelledby="sonuc-sor-baslik">
					<p class="ust-etiket">Sonuç zamanı</p>
					<h3 id="sonuc-sor-baslik">Beklediğin gibi oldu mu?</h3>
					{#if data.karar?.beklenti}
						<blockquote class="beklenti">{data.karar.beklenti}</blockquote>
					{/if}
					<form method="POST" action="?/kararSonucu" class="yigin" use:enhance>
						<fieldset class="secenekler">
							<legend class="gorunmez">Sonuç</legend>
							{#each KARAR_SONUCLARI as s (s)}
								<label class="cip">
									<input type="radio" name="sonuc" value={s} required />
									{KARAR_SONUCU_ETIKETI[s]}
								</label>
							{/each}
						</fieldset>
						{#if kararFormu?.sonucHatalari?.sonuc}
							<span class="hata-metni" role="alert">{kararFormu.sonucHatalari.sonuc}</span>
						{/if}
						<Alan
							id="sonucNotu"
							etiket="Geriye bakınca"
							hata={kararFormu?.sonucHatalari?.sonucNotu}
							ipucu="İsteğe bağlı: ne öğrendin?"
						>
							<textarea id="sonucNotu" name="sonucNotu" rows="2" maxlength="1000"></textarea>
						</Alan>
						<div class="satir"><button class="dugme dugme-birincil">Sonucu kaydet</button></div>
					</form>
				</div>
			{/if}

			<details class="kart bag-formu" open={!data.karar || !!kararFormu?.kararHatalari}>
				<summary>{data.karar ? 'Gerekçe ve beklenti' : 'Bu kararı deftere yaz'}</summary>
				<form
					method="POST"
					action="?/kararKaydet"
					class="yigin"
					use:enhance={() =>
						({ update }) =>
							update({ reset: false })}
				>
					<Alan
						id="gerekce"
						etiket="Neden bu kararı verdin?"
						hata={kararFormu?.kararHatalari?.gerekce}
					>
						<textarea id="gerekce" name="gerekce" rows="3" maxlength="2000"
							>{kararDeger('gerekce')}</textarea
						>
					</Alan>
					<Alan
						id="beklenti"
						etiket="Ne olmasını bekliyorsun?"
						hata={kararFormu?.kararHatalari?.beklenti}
						ipucu="Sonradan “oldu / olmadı” diyebileceğin kadar açık yaz."
					>
						<textarea id="beklenti" name="beklenti" rows="2" maxlength="1000"
							>{kararDeger('beklenti')}</textarea
						>
					</Alan>
					<div class="karar-satiri">
						<Alan
							id="guven"
							etiket="Ne kadar eminsin? (%)"
							hata={kararFormu?.kararHatalari?.guven}
							ipucu="50 yazı tura, 90 neredeyse kesin."
						>
							<input
								id="guven"
								name="guven"
								type="number"
								inputmode="numeric"
								min="0"
								max="100"
								step="1"
								value={kararDeger('guven')}
							/>
						</Alan>
						<Alan
							id="sorulacak"
							etiket="Sonucu ne zaman sorayım?"
							hata={kararFormu?.kararHatalari?.sorulacak}
							ipucu="Ör. 2027-06 ya da 01.06.2027"
						>
							<input id="sorulacak" name="sorulacak" value={kararDeger('sorulacak')} />
						</Alan>
					</div>
					<div class="satir"><button class="dugme dugme-birincil">Deftere yaz</button></div>
				</form>
			</details>
		</section>
	{/if}

	{#if data.alintilar.length || (data.sahibiMi && d.tur === 'eser')}
		<section class="alintilar yigin" aria-labelledby="alintilar-baslik">
			<h2 id="alintilar-baslik">Alıntılar</h2>
			{#if data.alintilar.length}
				<ul class="alinti-listesi">
					{#each data.alintilar as a (a.id)}
						<li>
							<blockquote>
								{a.metin}
								{#if a.yer}<cite>{a.yer}</cite>{/if}
							</blockquote>
							{#if data.sahibiMi}
								<form method="POST" action="?/alintiSil" use:enhance>
									<input type="hidden" name="alintiId" value={a.id} />
									<button class="dugme dugme-kucuk dugme-hayalet" aria-label="Alıntıyı sil">
										<Simge ad="cop" boyut={14} />
									</button>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
			{#if data.sahibiMi}
				<details class="kart bag-formu" open={!!alintiHata}>
					<summary>Alıntı ekle</summary>
					<form method="POST" action="?/alintiEkle" class="yigin" use:enhance>
						<Alan id="alintiMetin" etiket="Alıntı" hata={alintiHata?.hatalar.metin}>
							<textarea id="alintiMetin" name="metin" rows="3" maxlength="2000" required
								>{alintiHata?.degerler.metin ?? ''}</textarea
							>
						</Alan>
						<Alan
							id="alintiYer"
							etiket="Nerede?"
							hata={alintiHata?.hatalar.yer}
							ipucu="İsteğe bağlı: s. 42, 1:12:30…"
						>
							<input
								id="alintiYer"
								name="yer"
								maxlength="60"
								value={alintiHata?.degerler.yer ?? ''}
							/>
						</Alan>
						<p class="kucuk soluk">
							Bu düğümden giden bir bağın notunu bir alıntıya iliştirebilirsin: “Bu cümle beni şuna
							götürdü”.
						</p>
						<div class="satir"><button class="dugme dugme-birincil">Ekle</button></div>
					</form>
				</details>
			{/if}
		</section>
	{/if}

	<div class="baglar-izgara">
		<section class="yigin" aria-labelledby="giden-baslik">
			<h2 id="giden-baslik">Bu beni şuna götürdü</h2>
			{#if data.baglar.giden.length}
				<ul class="bag-listesi">
					{#each data.baglar.giden as bag (bag.id)}
						<BagOgesi
							{bag}
							yon="giden"
							duzenlenebilir={data.sahibiMi}
							alintiSecenekleri={data.sahibiMi ? data.alintilar : []}
							hatalar={bagDuzenle?.bagId === bag.id ? bagDuzenle.hatalar : null}
							degerler={bagDuzenle?.bagId === bag.id ? bagDuzenle.degerler : null}
						/>
					{/each}
				</ul>
			{:else}
				<p class="soluk kucuk">Henüz buradan bir yere giden bağ yok.</p>
			{/if}

			{#if data.gidenDis.gorunur.length || data.gidenDis.gizliSayisi}
				<div class="kart dis-kart">
					<h3>Başkalarını da bir yere götürdü</h3>
					{#if data.gidenDis.gorunur.length}
						<ul class="dis-listesi">
							{#each data.gidenDis.gorunur as bag (bag.id)}
								{@render disOge(bag, false)}
							{/each}
						</ul>
					{/if}
					{#if data.gidenDis.gizliSayisi}
						<p class="kucuk soluk">
							{data.gidenDis.gorunur.length
								? `${data.gidenDis.gizliSayisi} kişi daha`
								: `${data.gidenDis.gizliSayisi} kişi`}
							buradan kendi haritasında bir yere gitti.
						</p>
					{/if}
				</div>
			{/if}

			{#if data.kendiSeceneklerim.length}
				<details class="kart bag-formu" open={!!form?.disHata}>
					<summary>Bu seni de bir yere götürdü mü?</summary>
					<form method="POST" action="?/disBagKur" class="yigin" use:enhance>
						<Alan
							id="disHedef"
							etiket="Kendi haritandan: “{d.baslik}” beni şuna götürdü"
							hata={form?.disHata}
						>
							<DugumSecici
								id="disHedef"
								ad="digerId"
								secenekler={data.kendiSeceneklerim}
								hata={form?.disHata}
							/>
						</Alan>
						<Alan
							id="disNot"
							etiket="Nasıl?"
							ipucu="İsteğe bağlı. Notun, düğümünü görebilenlere görünür."
						>
							<input id="disNot" name="not" maxlength="1000" />
						</Alan>
						<p class="kucuk soluk">
							{data.sahip.ad} bir bildirim alır. Düğümün özelse adını ve notunu göremez.
						</p>
						<div class="satir"><button class="dugme dugme-birincil">Bağı kur</button></div>
					</form>
				</details>
			{/if}

			{#if data.sahibiMi}
				<div class="kart bag-formu">
					<h3>Yeni bağ kur</h3>
					{#if data.secenekler.length}
						<form method="POST" action="?/bagKur" class="yigin" use:enhance>
							<input type="hidden" name="yon" value="giden" />
							<Alan
								id="gidenHedef"
								etiket="“{d.baslik}” beni şuna götürdü:"
								hata={gidenHata?.hatalar.digerId}
							>
								<DugumSecici
									id="gidenHedef"
									ad="digerId"
									secenekler={data.secenekler}
									secili={gidenHata?.degerler.digerId}
									hata={gidenHata?.hatalar.digerId}
								/>
							</Alan>
							<Alan
								id="gidenNot"
								etiket="Nasıl?"
								hata={gidenHata?.hatalar.not}
								ipucu="İsteğe bağlı: “arkadaşım hediye etti”, “filmin müziğiydi”…"
							>
								<input
									id="gidenNot"
									name="not"
									maxlength="1000"
									value={gidenHata?.degerler.not ?? ''}
								/>
							</Alan>
							<Alan
								id="gidenTarih"
								etiket="Ne zaman?"
								hata={gidenHata?.hatalar.tarih}
								ipucu="İsteğe bağlı: 2021 · 2021-03 · 14.03.2021"
							>
								<input
									id="gidenTarih"
									name="tarih"
									inputmode="numeric"
									value={gidenHata?.degerler.tarih ?? ''}
									aria-invalid={!!gidenHata?.hatalar.tarih}
								/>
							</Alan>
							<BagTuruSecici id="gidenTur" secili={gidenHata?.degerler.tur} />
							<div class="satir"><button class="dugme dugme-birincil">Bağı kur</button></div>
						</form>
					{:else}
						<p class="soluk kucuk">Bağ kurmak için önce başka bir düğüm eklemen gerek.</p>
					{/if}
					<p class="kucuk soluk yeni-yol">
						Henüz eklemediğin bir şeye mi götürdü?
						<a href="/dugumler/yeni?kaynak={d.id}">Yeni düğüm ekle</a> ya da
						<a href="/ara?kaynak={d.id}">eser ara</a>.
					</p>
				</div>
			{/if}

			{#if uzakKapilar.length}
				<div class="kart yol kapilar">
					<h3>Açtığı kapılar</h3>
					<p class="kucuk soluk">
						Bağları ileriye doğru izleyince “{d.baslik}” dolaylı olarak bunlara da götürmüş:
					</p>
					<ol>
						{#each uzakKapilar as k (k.id)}
							<li style:--derinlik={k.derinlik - 1}>
								<span class="kucuk soluk">{k.derinlik} adım sonra</span>
								<a href="/dugumler/{k.id}"><TurSekli tur={k.tur} boyut={11} /> {k.baslik}</a>
							</li>
						{/each}
					</ol>
				</div>
			{/if}
		</section>

		<section class="yigin" aria-labelledby="gelen-baslik">
			<h2 id="gelen-baslik">Beni buraya getirenler</h2>
			{#if data.baglar.gelen.length}
				<ul class="bag-listesi">
					{#each data.baglar.gelen as bag (bag.id)}
						<BagOgesi
							{bag}
							yon="gelen"
							duzenlenebilir={data.sahibiMi}
							hatalar={bagDuzenle?.bagId === bag.id ? bagDuzenle.hatalar : null}
							degerler={bagDuzenle?.bagId === bag.id ? bagDuzenle.degerler : null}
						/>
					{/each}
				</ul>
			{:else if !data.gelenDis.length}
				<p class="soluk kucuk">Buraya gelen bir bağ yok.</p>
			{/if}

			{#if data.gelenDis.length}
				<div class="kart dis-kart">
					<h3>Başkalarının haritasından</h3>
					<ul class="dis-listesi">
						{#each data.gelenDis as bag (bag.id)}
							{@render disOge(bag, bag.sahibiBenMiyim)}
						{/each}
					</ul>
				</div>
			{/if}

			{#if data.sahibiMi && data.secenekler.length && !getirenSorusu}
				<details class="kart bag-formu" open={!!gelenHata}>
					<summary>Seni buraya ne getirdi?</summary>
					{@render gelenFormu()}
				</details>
			{/if}

			{#if data.yol.length > data.baglar.gelen.length}
				<div class="kart yol">
					<h3>Geldiğin yol</h3>
					<p class="kucuk soluk">Bağları geriye doğru izleyince bu düğüme varan her şey:</p>
					<ol>
						{#each data.yol as y (y.id)}
							<li style:--derinlik={y.derinlik}>
								<span class="kucuk soluk">{y.derinlik} adım önce</span>
								<a href="/dugumler/{y.id}"><TurSekli tur={y.tur} boyut={11} /> {y.baslik}</a>
							</li>
						{/each}
					</ol>
				</div>
			{/if}
		</section>
	</div>

	{#if data.izler.length || data.sahibiMi}
		<section class="izler yigin" aria-labelledby="izler-baslik">
			<h2 id="izler-baslik">Geçtiği izler</h2>
			{#if data.izler.length}
				<div class="iz-izgarasi">
					{#each data.izler as iz (iz.id)}
						<IzKarti {iz} />
					{/each}
				</div>
			{:else}
				<p class="soluk kucuk">Bu düğüm henüz bir izde durak değil.</p>
			{/if}

			{#if data.sahibiMi}
				<div class="ize-ekle">
					{#if data.eklenebilirIzler.length}
						<form method="POST" action="?/izeEkle" class="satir" use:enhance>
							<label class="gorunmez" for="izId">Eklenecek iz</label>
							<select id="izId" name="izId" required aria-invalid={!!form?.izHatasi}>
								<option value="">Bir iz seç…</option>
								{#each data.eklenebilirIzler as iz (iz.id)}
									<option value={iz.id}>{iz.baslik}</option>
								{/each}
							</select>
							<button class="dugme">İze ekle</button>
						</form>
						{#if form?.izHatasi}<p class="hata-metni kucuk" role="alert">{form.izHatasi}</p>{/if}
					{/if}
					<a class="kucuk" href="/izler/yeni?dugum={d.id}">Bu düğümle yeni bir iz başlat →</a>
				</div>
			{/if}
		</section>
	{/if}

	{#if data.kesifler.length || data.kesisim.length}
		<section class="kesif yigin" aria-labelledby="kesif-baslik">
			<div>
				<h2 id="kesif-baslik">Başkalarının yolları</h2>
				<p class="kucuk soluk">
					Bu eseri haritasına ekleyen başkalarının yalnızca herkese açık bağ ve izlerinden. Puan
					yok; insanların gerçekten yürüdüğü yollar.
				</p>
			</div>

			{#if data.kesifler.length}
				<div class="kart">
					<h3>Buradan yola çıkanlar şunlara da gitti</h3>
					<ul class="kesif-listesi">
						{#each data.kesifler as k (k.kanonikId)}
							<li>
								<span class="kesif-eser">
									<TurSekli tur="eser" boyut={11} />
									<span>
										<strong>{k.baslik}</strong>
										<small class="soluk"
											>{[k.altBaslik, k.yil].filter(Boolean).join(' · ')}
											{k.altBaslik || k.yil ? '·' : ''}
											{k.kisi} kişi</small
										>
									</span>
								</span>
								<form method="POST" action="?/kesifEkle" use:enhance>
									<input type="hidden" name="kanonikId" value={k.kanonikId} />
									<button class="dugme dugme-kucuk" aria-label="{k.baslik}: merak listeme ekle">
										<Simge ad="yildiz" boyut={14} /> Merak listeme ekle
									</button>
								</form>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if data.kesisim.length}
				<div>
					<h3>Bu eserden geçen açık izler</h3>
					<div class="iz-izgarasi">
						{#each data.kesisim as iz (iz.id)}
							<div class="kesisim-izi">
								<IzKarti {iz} />
								{#if iz.sahip}
									<a class="kucuk soluk" href="/@{iz.sahip.kullaniciAdi}"
										>{iz.sahip.ad} (@{iz.sahip.kullaniciAdi})</a
									>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.geri {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
		align-self: flex-start;
		font-size: var(--boyut-sm);
		font-weight: 550;
		color: var(--metin-soluk);
		text-decoration: none;
	}
	.geri:hover {
		color: var(--vurgu);
	}
	.getiren-sorusu {
		display: flex;
		flex-direction: column;
		gap: var(--a-3);
		padding: var(--a-4) var(--a-5);
		border: 1px solid color-mix(in srgb, var(--vurgu) 35%, var(--cizgi));
		border-left: 4px solid var(--vurgu);
		border-radius: var(--yaricap-lg);
		background: var(--vurgu-zemin);
	}
	.getiren-sorusu p {
		margin: 0;
	}
	.olcuyler {
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-1) var(--a-4);
		margin: 0;
	}
	.olcuyler a {
		color: var(--metin-soluk);
		text-decoration: none;
	}
	.olcuyler a:hover {
		color: var(--vurgu);
	}
	.olcuyler strong {
		color: var(--vurgu);
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-lg);
	}
	.durumlar {
		margin: 0;
	}
	.durum-dugmeleri {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 2px;
		padding: 3px;
		border-radius: var(--yaricap-lg);
		border: 1px solid var(--cizgi);
		background: var(--yuzey-2);
	}
	.durum-dugmesi {
		min-height: 2.25rem;
		padding: 0 var(--a-3);
		border: 0;
		border-radius: var(--yaricap);
		background: transparent;
		color: var(--metin-soluk);
		font: inherit;
		font-size: var(--boyut-sm);
		font-weight: 600;
		cursor: pointer;
		transition:
			background var(--gecis),
			color var(--gecis);
	}
	.durum-dugmesi:hover {
		color: var(--metin);
	}
	.durum-dugmesi[aria-pressed='true'] {
		background: var(--yuzey);
		color: var(--tur-eser);
		box-shadow: var(--golge-1);
	}
	.durum-rozeti {
		align-self: flex-start;
	}
	.dugum {
		display: grid;
		gap: var(--a-5);
		border-top: 4px solid var(--renk, var(--cizgi));
	}
	.dugum[data-tur='eser'] {
		--renk: var(--tur-eser);
	}
	.dugum[data-tur='kisi'] {
		--renk: var(--tur-kisi);
	}
	.dugum[data-tur='yer'] {
		--renk: var(--tur-yer);
	}
	.dugum[data-tur='karar'] {
		--renk: var(--tur-karar);
	}
	.dugum[data-tur='ani'] {
		--renk: var(--tur-ani);
	}
	.dugum img {
		width: 8rem;
		border-radius: var(--yaricap);
		box-shadow: var(--golge-2);
	}
	.bilgi {
		gap: var(--a-3);
	}
	h1 {
		font-size: var(--boyut-3xl);
		margin: 0;
	}
	.alt-baslik {
		margin: var(--a-1) 0 0;
		font-size: var(--boyut-lg);
		color: var(--metin-soluk);
	}
	.ozellikler {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-2) var(--a-4);
	}
	.ozellikler li {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
	}
	.koordinat {
		font-family: var(--yazi-kod);
		font-size: var(--boyut-xs);
	}
	.aciklama {
		white-space: pre-line;
		max-width: var(--okuma-genislik);
		margin: 0;
	}
	.eylemler {
		padding-top: var(--a-2);
		border-top: 1px solid var(--cizgi);
	}
	.baglar-izgara {
		display: grid;
		gap: var(--a-6);
		align-items: start;
	}
	h2 {
		margin: 0;
	}
	.bag-listesi {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.bag-formu h3 {
		margin-bottom: var(--a-3);
	}
	details.bag-formu summary {
		cursor: pointer;
		font-family: var(--yazi-baslik);
		font-weight: 600;
		font-size: var(--boyut-lg);
	}
	details.bag-formu[open] summary {
		margin-bottom: var(--a-3);
	}
	.yeni-yol {
		margin: var(--a-4) 0 0;
	}
	.yol h3 {
		margin-bottom: var(--a-1);
	}
	.yol ol {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.yol li {
		display: flex;
		flex-direction: column;
		border-left: 2px dotted var(--vurgu);
		padding-inline-start: calc(var(--a-3) + (var(--derinlik) - 1) * var(--a-3));
	}
	.kapilar li {
		border-left-style: solid;
		border-left-color: color-mix(in srgb, var(--vurgu) 45%, transparent);
	}
	.yol li a {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
	}
	.yol p {
		margin: 0 0 var(--a-3);
	}
	.etki-rozeti {
		align-self: flex-start;
		background: var(--vurgu-zemin);
		color: var(--metin);
	}
	.etki-rozeti[data-etki='degistirdi'] {
		box-shadow: inset 0 0 0 1.5px var(--vurgu);
	}
	.alintilar h2,
	.sesler h2,
	.yakinlar h2,
	.fotograflar h2,
	.karar-defteri h2 {
		margin: 0;
	}
	.karar-defteri .arasi {
		justify-content: space-between;
		align-items: baseline;
		flex-wrap: wrap;
	}
	.karar-defteri > p {
		margin: 0;
	}
	.sonuc-sor {
		border-left: 4px solid var(--tur-karar);
	}
	.sonuc-sor h3 {
		margin: 0 0 var(--a-2);
	}
	.beklenti {
		margin: 0 0 var(--a-3);
		padding: var(--a-2) var(--a-4);
		border-left: 3px solid var(--cizgi-guclu);
		font-style: italic;
		white-space: pre-line;
	}
	.secenekler {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-2);
	}
	.secenekler .cip {
		display: inline-flex;
		align-items: center;
		gap: var(--a-2);
		min-height: 2.5rem;
		padding: 0 var(--a-3);
		border: 1px solid var(--cizgi-guclu);
		border-radius: var(--yaricap-tam);
		background: var(--yuzey);
		font-size: var(--boyut-sm);
		font-weight: 550;
		cursor: pointer;
	}
	.secenekler .cip:has(input:checked) {
		border-color: var(--tur-karar);
		background: var(--tur-karar-zemin);
	}
	.secenekler input {
		accent-color: var(--tur-karar);
		margin: 0;
	}
	.karar-defteri .ust-etiket {
		margin: 0 0 var(--a-1);
		font-size: var(--boyut-xs);
		font-weight: 650;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--tur-karar);
	}
	.sonuc-karti p {
		margin: 0;
	}
	.sonuc-metni {
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-xl);
	}
	.sonuc-karti[data-sonuc='gerceklesti'] {
		border-left: 4px solid var(--basari);
	}
	.sonuc-karti[data-sonuc='kismen'] {
		border-left: 4px solid var(--tur-karar);
	}
	.sonuc-karti[data-sonuc='gerceklesmedi'] {
		border-left: 4px solid var(--metin-silik);
	}
	.sonuc-karti .not {
		margin-top: var(--a-2);
		white-space: pre-line;
	}
	.kapsul {
		display: flex;
		gap: var(--a-3);
		align-items: flex-start;
		margin-top: var(--a-3);
		padding: var(--a-4);
		border: 1px dashed var(--tur-ani);
		border-radius: var(--yaricap);
		background: var(--tur-ani-zemin);
		color: var(--metin);
	}
	.kapsul p {
		margin: 0;
	}
	.kapsul-baslik {
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-lg);
	}
	.kapsul .onay {
		display: flex;
		align-items: flex-start;
		gap: var(--a-2);
	}
	.kapsul-acildi {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
		margin: var(--a-2) 0 0;
	}
	.sesler .arasi {
		justify-content: space-between;
		align-items: baseline;
	}
	.ses-listesi {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-3);
	}
	.ses-listesi li {
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.ses-listesi audio {
		width: 100%;
	}
	.ses-ust {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--a-2);
	}
	.ses-ust [data-durum='isleniyor']::before,
	.ses-ust [data-durum='bekliyor']::before {
		content: '';
		display: inline-block;
		width: 0.6rem;
		height: 0.6rem;
		margin-right: 0.4rem;
		border-radius: 50%;
		background: var(--uyari);
		animation: nabiz 1.2s ease-in-out infinite;
	}
	@keyframes nabiz {
		50% {
			opacity: 0.3;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ses-ust [data-durum]::before {
			animation: none;
		}
	}
	.ses-metni {
		margin: 0;
		white-space: pre-line;
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-lg);
		line-height: 1.55;
	}
	.yakinlar .arasi {
		justify-content: space-between;
		align-items: baseline;
	}
	.yakinlar ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-2);
	}
	.yakinlar li {
		display: inline-flex;
		align-items: baseline;
		gap: var(--a-2);
		padding: var(--a-1) var(--a-3);
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap-tam);
		background: var(--yuzey);
	}
	.yakinlar li a {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
		color: var(--metin);
		font-weight: 550;
	}
	.foto-izgarasi {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: var(--a-3);
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 12rem), 1fr));
	}
	.foto-izgarasi figure {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.foto-izgarasi img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		border-radius: var(--yaricap);
		background: var(--yuzey-2);
	}
	.foto-izgarasi figcaption {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: var(--boyut-sm);
	}
	.foto-ust {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--a-2);
	}
	.rozet[data-donem='eski'] {
		background: var(--uyari-zemin);
		color: var(--uyari);
	}
	.hak {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.hak legend,
	.secenekler legend {
		margin-bottom: var(--a-2);
		font-weight: 600;
		font-size: var(--boyut-sm);
	}
	.hak label,
	.onay {
		display: flex;
		align-items: flex-start;
		gap: var(--a-2);
		font-size: var(--boyut-sm);
	}
	.hak input,
	.onay input {
		margin-top: 0.2rem;
		accent-color: var(--vurgu);
	}
	.karar-satiri {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: var(--a-3);
	}
	.alinti-listesi {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-3);
	}
	.alinti-listesi li {
		display: flex;
		align-items: flex-start;
		gap: var(--a-2);
	}
	.alinti-listesi blockquote {
		flex: 1;
		margin: 0;
		padding: var(--a-2) var(--a-4);
		border-left: 3px solid var(--tur-eser);
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-lg);
		font-style: italic;
		white-space: pre-line;
	}
	.alinti-listesi cite {
		display: block;
		margin-top: var(--a-1);
		font-family: var(--yazi-govde);
		font-style: normal;
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
	}
	.alinti-listesi form {
		margin: 0;
	}
	.zengin {
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.zengin-oneri {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--a-2) var(--a-3);
		padding: var(--a-2) var(--a-4);
		border: 1px dashed var(--cizgi-guclu);
		border-radius: var(--yaricap);
		margin: 0;
	}
	.kesif {
		padding-top: var(--a-4);
		border-top: 1px solid var(--cizgi);
	}
	.kesif h3 {
		margin: 0 0 var(--a-2);
		font-size: var(--boyut-lg);
	}
	.kesif p {
		margin: var(--a-1) 0 0;
	}
	.kesif-listesi {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.kesif-listesi li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--a-3);
		flex-wrap: wrap;
	}
	.kesif-listesi form {
		margin: 0;
	}
	.kesif-eser {
		display: flex;
		align-items: flex-start;
		gap: var(--a-2);
		min-width: 0;
	}
	.kesif-eser > span {
		display: flex;
		flex-direction: column;
	}
	.kesisim-izi {
		display: flex;
		flex-direction: column;
		gap: var(--a-1);
	}
	.dis-kart h3 {
		margin: 0 0 var(--a-2);
		font-size: var(--boyut-md);
	}
	.dis-kart p {
		margin: var(--a-2) 0 0;
	}
	.dis-listesi {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.dis-bag {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--a-1) var(--a-3);
	}
	.dis-bag form {
		margin: 0;
	}
	.dis-ust {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--a-1) var(--a-2);
	}
	.dis-ust a:first-child {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
		font-weight: 600;
	}
	.dis-bag .not {
		flex-basis: 100%;
		font-style: italic;
		color: var(--metin-soluk);
	}
	.iz-izgarasi {
		display: grid;
		gap: var(--a-3);
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
	}
	.ize-ekle {
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
		max-width: 32rem;
	}
	.ize-ekle form {
		flex-wrap: nowrap;
	}
	.ize-ekle p {
		margin: 0;
	}
	@media (min-width: 40rem) {
		.dugum:has(img) {
			grid-template-columns: auto 1fr;
		}
	}
	@media (min-width: 56rem) {
		.baglar-izgara {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
