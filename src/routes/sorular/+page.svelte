<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import Alan from '#lib/bilesenler/Alan.svelte';
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import { SES_DURUMU_ETIKETI, type SesDurumu } from '#lib/ses.ts';
	import { whatsappBaglantisi } from '#lib/sorular.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	type Hata = { hatalar: Record<string, string>; degerler: Record<string, string> };
	const hata = $derived((form as { olustur?: Hata } | null)?.olustur ?? null);
	const yeni = $derived(
		(form as { yeniBaglanti?: { adres: string; aliciAdi: string; metin: string } } | null)
			?.yeniBaglanti ?? null
	);
	// svelte-ignore state_referenced_locally
	let secim = $state<string>(data.onerilen ?? data.haftanin);
	let kopyalandi = $state(false);

	const tarih = (t: Date | string) =>
		new Intl.DateTimeFormat('tr-TR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone: 'Europe/Istanbul'
		}).format(new Date(t));

	async function kopyala(metin: string) {
		try {
			await navigator.clipboard.writeText(metin);
			kopyalandi = true;
			setTimeout(() => (kopyalandi = false), 2500);
		} catch {
			kopyalandi = false;
		}
	}
	const davetMetni = (y: { adres: string; aliciAdi: string; metin: string }) =>
		`${y.aliciAdi}, sana bir soru sormak istiyorum: “${y.metin}” Yazarak ya da sesli yanıtlayabilirsin, hesap açman gerekmiyor: ${y.adres}`;
</script>

<svelte:head><title>Yakınlara sorular · İz</title></svelte:head>

<div class="kap yigin">
	<SayfaBasligi
		ust="Aile hafızası"
		baslik="Yakınlara sorular"
		aciklama="Bir büyüğüne, anlatmasını istediğin bir şeyi sor. Hesap açmadan, yazarak ya da sesli mesajla yanıtlar; yanıt senin özel arşivine gelir, istersen bir anıya dönüşür."
	/>

	{#if yeni}
		<section class="kart yeni-baglanti yigin" aria-labelledby="baglanti-baslik">
			<h2 id="baglanti-baslik">Bağlantı hazır: {yeni.aliciAdi}</h2>
			<p class="kucuk">
				Bu bağlantı yalnızca şimdi gösteriliyor (güvenlik için saklanmıyor). Kopyala ya da doğrudan
				gönder; 60 gün geçerli, bir kez yanıtlanır.
			</p>
			<div class="baglanti-satiri">
				<input readonly value={yeni.adres} aria-label="Yanıt bağlantısı" />
				<button type="button" class="dugme" onclick={() => kopyala(davetMetni(yeni))}>
					<Simge ad="kopyala" boyut={16} />
					{kopyalandi ? 'Kopyalandı' : 'Mesajı kopyala'}
				</button>
				<a
					class="dugme dugme-birincil"
					href={whatsappBaglantisi(davetMetni(yeni))}
					target="_blank"
					rel="noopener noreferrer">WhatsApp ile gönder</a
				>
			</div>
		</section>
	{/if}

	<div class="duzen">
		<form
			method="POST"
			action="?/olustur"
			class="kart yigin"
			use:enhance={() =>
				async ({ update }) => {
					await update();
					// Form sıfırlanınca seçili radyo düğmesi de temizlenir: varsayılan soruyu geri seç
					secim = '';
					await tick();
					secim = data.onerilen ?? data.haftanin;
				}}
		>
			<h2>Yeni soru</h2>
			<Alan
				id="aliciAdi"
				etiket="Kime?"
				hata={hata?.hatalar.aliciAdi}
				ipucu="Ör. Babaannem, Ali dayım"
			>
				<input
					id="aliciAdi"
					name="aliciAdi"
					maxlength="80"
					required
					value={hata?.degerler.aliciAdi ?? ''}
				/>
			</Alan>
			{#if data.kisiler.length}
				<Alan
					id="kisiId"
					etiket="Haritandaki kişi"
					ipucu="İsteğe bağlı: yanıttan oluşan anı bu kişiye bağlanır"
				>
					<select id="kisiId" name="kisiId">
						<option value="">Seçme</option>
						{#each data.kisiler as k (k.id)}<option value={k.id}>{k.baslik}</option>{/each}
					</select>
				</Alan>
			{/if}
			<fieldset class="sorular">
				<legend>Soru</legend>
				<label class="secenek haftanin">
					<input type="radio" name="hazir" value={data.haftanin} bind:group={secim} />
					<span><small>Bu haftanın sorusu</small>{data.haftanin}</span>
				</label>
				{#if data.onerilen && data.onerilen !== data.haftanin}
					<label class="secenek">
						<input type="radio" name="hazir" value={data.onerilen} bind:group={secim} />
						<span>{data.onerilen}</span>
					</label>
				{/if}
				<details>
					<summary class="kucuk">Başka hazır sorular</summary>
					<div class="yigin banka">
						{#each data.banka.filter((b) => b !== data.haftanin) as b (b)}
							<label class="secenek">
								<input type="radio" name="hazir" value={b} bind:group={secim} />
								<span>{b}</span>
							</label>
						{/each}
					</div>
				</details>
				<label class="secenek">
					<input type="radio" name="hazir" value="ozel" bind:group={secim} />
					<span>Kendi sorumu yazacağım</span>
				</label>
				<!-- JavaScript olmadan da çalışsın: alan "kendi sorum" seçiliyken CSS ile görünür -->
				<div class="ozel-alan">
					<Alan id="metin" etiket="Sorun" hata={hata?.hatalar.metin}>
						<textarea id="metin" name="metin" rows="3" maxlength="500"
							>{hata?.degerler.metin ?? ''}</textarea
						>
					</Alan>
				</div>
				{#if hata?.hatalar.metin && secim !== 'ozel'}
					<p class="hata-metni" role="alert">{hata.hatalar.metin}</p>
				{/if}
			</fieldset>
			<div class="satir"><button class="dugme dugme-birincil">Bağlantı oluştur</button></div>
		</form>

		<section class="yigin" aria-labelledby="liste-baslik">
			<h2 id="liste-baslik">Sorduğun sorular</h2>
			{#if data.liste.length}
				<ul class="liste">
					{#each data.liste as s (s.id)}
						<li class="kart yigin">
							<div class="ust">
								<strong>{s.aliciAdi}</strong>
								<small class="soluk">
									{s.yanitlanma
										? `Yanıtladı · ${tarih(s.yanitlanma)}`
										: new Date(s.sonGecerlilik) < new Date()
											? 'Süresi doldu'
											: `Yanıt bekleniyor · ${tarih(s.olusturma)}`}
								</small>
							</div>
							<p class="soru">{s.metin}</p>
							{#if s.yanitMetni}<blockquote>{s.yanitMetni}</blockquote>{/if}
							{#each s.sesler as ses (ses.id)}
								<audio
									controls
									preload="none"
									src="/sesler/{ses.id}"
									aria-label="{s.aliciAdi} sesli yanıtı"
								></audio>
								<small class="soluk">{SES_DURUMU_ETIKETI[ses.durum as SesDurumu]}</small>
								{#if ses.metin}<blockquote>{ses.metin}</blockquote>{/if}
							{/each}
							<div class="satir">
								{#if s.aniId}
									<a class="dugme dugme-kucuk" href="/dugumler/{s.aniId}">Anıyı aç</a>
								{:else if s.yanitlanma}
									<form method="POST" action="?/ani" use:enhance>
										<input type="hidden" name="soruId" value={s.id} />
										<button class="dugme dugme-kucuk dugme-birincil">Anı olarak ekle</button>
									</form>
								{/if}
								<form method="POST" action="?/sil" use:enhance>
									<input type="hidden" name="soruId" value={s.id} />
									<button class="dugme dugme-kucuk dugme-hayalet">Sil</button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<BosDurum
					baslik="Henüz soru sormadın"
					aciklama="Her hafta yeni bir soru önerilir. Bağlantıyı WhatsApp’tan gönder; yanıt geldiğinde zil seni haberdar eder."
				/>
			{/if}
		</section>
	</div>
</div>

<style>
	h2 {
		margin: 0;
		font-size: var(--boyut-lg);
	}
	.duzen {
		display: grid;
		gap: var(--a-5);
		grid-template-columns: minmax(0, 1fr);
		align-items: start;
	}
	@media (min-width: 60rem) {
		.duzen {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
		}
	}
	.yeni-baglanti {
		border-left: 4px solid var(--basari);
	}
	.yeni-baglanti p {
		margin: 0;
	}
	.baglanti-satiri {
		display: flex;
		flex-wrap: wrap;
		gap: var(--a-2);
	}
	.baglanti-satiri input {
		flex: 1 1 16rem;
		min-height: 2.5rem;
		padding: 0 var(--a-3);
		border: 1px solid var(--cizgi-guclu);
		border-radius: var(--yaricap-sm);
		background: var(--yuzey-2);
		color: var(--metin);
		font: inherit;
		font-size: var(--boyut-sm);
	}
	.sorular {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	legend {
		margin-bottom: var(--a-2);
		font-weight: 600;
		font-size: var(--boyut-sm);
	}
	.secenek {
		display: flex;
		align-items: flex-start;
		gap: var(--a-2);
		padding: var(--a-2) var(--a-3);
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap);
		cursor: pointer;
	}
	.secenek:has(input:checked) {
		border-color: var(--vurgu);
		background: var(--vurgu-zemin);
	}
	.secenek input {
		margin-top: 0.25rem;
		accent-color: var(--vurgu);
	}
	.secenek small {
		display: block;
		font-size: var(--boyut-xs);
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--vurgu);
	}
	.sorular:not(:has(input[value='ozel']:checked)) .ozel-alan {
		display: none;
	}
	.banka {
		margin-top: var(--a-2);
		gap: var(--a-2);
	}
	.liste {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-3);
	}
	.ust {
		display: flex;
		justify-content: space-between;
		gap: var(--a-2);
		flex-wrap: wrap;
	}
	.soru {
		margin: 0;
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-lg);
	}
	blockquote {
		margin: 0;
		padding: var(--a-2) var(--a-3);
		border-left: 3px solid var(--tur-ani);
		white-space: pre-line;
	}
	audio {
		width: 100%;
	}
</style>
