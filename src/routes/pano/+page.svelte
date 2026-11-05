<script lang="ts">
	import { enhance } from '$app/forms';
	import BosDurum from '#lib/bilesenler/BosDurum.svelte';
	import DugumSecici from '#lib/bilesenler/DugumSecici.svelte';
	import DugumKarti from '#lib/bilesenler/DugumKarti.svelte';
	import IzKarti from '#lib/bilesenler/IzKarti.svelte';
	import SayfaBasligi from '#lib/bilesenler/SayfaBasligi.svelte';
	import Simge from '#lib/bilesenler/Simge.svelte';
	import TurSekli from '#lib/bilesenler/TurSekli.svelte';
	import { DUGUM_TURLERI, DUGUM_TURU_COGUL, durumEtiketi } from '#lib/sabitler.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const pano = $derived(data.pano);
	const toplam = $derived(Object.values(pano.sayilar).reduce((a, b) => a + (b ?? 0), 0));
	const k = $derived(data.karakterler);
	const karakterVar = $derived(
		!!k && (k.kokler.length > 0 || k.kapiAcanlar.length > 0 || k.kavsaklar.length > 0)
	);
</script>

<svelte:head><title>Pano · İz</title></svelte:head>

<div class="kap yigin genis-aralik">
	<SayfaBasligi
		ust="Pano"
		baslik="Merhaba, {data.kullanici?.ad}"
		aciklama={toplam === 0
			? 'Haritan henüz boş. İlk düğümünü ekleyerek başla.'
			: `Haritanda ${toplam} düğüm, ${pano.bagSayisi} bağ ve ${data.toplamIz} iz var.`}
	>
		{#snippet eylemler()}
			<a class="dugme" href="/ice-aktar"><Simge ad="asagi" boyut={18} /> Başka yerden getir</a>
			<a class="dugme" href="/ara"><Simge ad="ara" boyut={18} /> Eser ara</a>
			<a class="dugme dugme-birincil" href="/dugumler/yeni"
				><Simge ad="ekle" boyut={18} /> Düğüm ekle</a
			>
		{/snippet}
	</SayfaBasligi>

	{#if data.hosgeldin}
		<p class="bildirim bildirim-basari" role="status">
			Hesabın açıldı. Hoş geldin! Bir kitap, film ya da hayatındaki bir anla başlayabilirsin.
		</p>
	{/if}

	{#if toplam === 0}
		<a class="kart sihirbaz-daveti" href="/basla">
			<span class="sihirbaz-simge"><Simge ad="iz" boyut={28} /></span>
			<span class="gorunum-metin">
				<strong>İlk izini üç adımda oluştur</strong>
				<span
					>Seni değiştiren bir eser, onu sana getiren şey ve seni götürdüğü yer. İki dakika sürer.</span
				>
			</span>
			<Simge ad="ok" boyut={20} />
		</a>
	{/if}

	{#if data.soru || data.gecmis.length}
		<div class="hatirlaticilar">
			{#if data.soru}
				<section class="kart gunun-sorusu" aria-labelledby="soru-baslik">
					<p class="ust-etiket">Günün sorusu</p>
					<h2 id="soru-baslik">
						<a href="/dugumler/{data.soru.id}">“{data.soru.baslik}”</a> — bunu nereden duymuştun?
					</h2>
					{#if data.secenekler.length}
						<form method="POST" action="/dugumler/{data.soru.id}?/bagKur" class="yigin" use:enhance>
							<input type="hidden" name="yon" value="gelen" />
							<DugumSecici
								id="soru-getiren"
								ad="digerId"
								secenekler={data.secenekler}
								yerTutucu="Haritandan seç…"
							/>
							<div class="satir">
								<button class="dugme dugme-birincil dugme-kucuk">Bağla</button>
								<a class="kucuk" href="/dugumler/{data.soru.id}?getiren=1">Yeni bir şey ekle</a>
							</div>
						</form>
					{/if}
				</section>
			{/if}
			{#if data.gecmis.length}
				<section class="kart bugun" aria-labelledby="bugun-baslik">
					<p class="ust-etiket">Bugün geçmişte</p>
					<ul>
						{#each data.gecmis as g (g.id)}
							<li>
								<strong>{g.yilOnce} yıl önce bugün</strong>
								<a href="/dugumler/{g.id}"><TurSekli tur={g.tur} boyut={11} /> {g.baslik}</a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	{/if}

	<form method="GET" action="/hizli" class="hizli-ekle" role="search" aria-label="Hızlı ekle">
		<label for="hizli-metin" class="hizli-etiket">
			<Simge ad="simsek" boyut={18} /> Hızlı ekle
		</label>
		<div class="hizli-satir">
			<input
				id="hizli-metin"
				name="metin"
				required
				maxlength="300"
				autocomplete="off"
				placeholder="Ör. Selin Hoca önerdi → Tutunamayanlar"
				aria-describedby="hizli-ipucu"
			/>
			<button class="dugme dugme-birincil">Ekle</button>
		</div>
		<p id="hizli-ipucu" class="kucuk soluk">
			Tek satırda yaz: “Babylon Berlin'i izlerken Berlin Alexanderplatz'ı merak ettim”. Kaydetmeden
			önce ne anladığımı gösteririm.
		</p>
	</form>

	<section aria-label="Türlere göre düğüm sayıları" class="sayilar">
		{#each DUGUM_TURLERI as tur (tur)}
			<a class="kart sayi" href="/dugumler?tur={tur}" data-tur={tur}>
				<span class="sayi-ust">
					<TurSekli {tur} boyut={14} />
					<span>{DUGUM_TURU_COGUL[tur]}</span>
				</span>
				<strong>{pano.sayilar[tur] ?? 0}</strong>
			</a>
		{/each}
	</section>

	{#if toplam > 0}
		<section aria-labelledby="gorunumler-baslik" class="yigin">
			<h2 id="gorunumler-baslik" class="gorunmez">Haritana bak</h2>
			<div class="gorunum-kartlari">
				<a class="kart gorunum" href="/dugumler/ag">
					<span class="gorunum-simge"><Simge ad="dugumler" boyut={22} /></span>
					<span class="gorunum-metin">
						<strong>Ağ</strong>
						<span>Neyin neye götürdüğünü tek bakışta gör.</span>
					</span>
					<Simge ad="ok" boyut={18} />
				</a>
				<a class="kart gorunum" href="/dugumler/zaman">
					<span class="gorunum-simge"><Simge ad="zaman" boyut={22} /></span>
					<span class="gorunum-metin">
						<strong>Zaman çizgisi</strong>
						<span>Düğümlerini yaşandıkları sırayla izle.</span>
					</span>
					<Simge ad="ok" boyut={18} />
				</a>
				<a class="kart gorunum" href="/izler">
					<span class="gorunum-simge"><Simge ad="iz" boyut={22} /></span>
					<span class="gorunum-metin">
						<strong>İzler</strong>
						<span>Yollarını bir hikâye gibi anlat.</span>
					</span>
					<Simge ad="ok" boyut={18} />
				</a>
			</div>
		</section>
	{/if}

	{#if k && (karakterVar || k.yetimSayisi > 0)}
		<section class="yigin" aria-labelledby="karakter-baslik">
			<div class="bolum-baslik">
				<h2 id="karakter-baslik">Haritanın karakterleri</h2>
				<a href="/dugumler/ag" class="kucuk">Ağda gör</a>
			</div>
			<div class="karakterler">
				{#if k.kokler.length}
					<div class="kart karakter">
						<h3>Kökler</h3>
						<p class="kucuk soluk">Hiçbir şeyin getirmediği, her şeyin başladığı yerler.</p>
						<ol>
							{#each k.kokler as d (d.id)}
								<li>
									<a href="/dugumler/{d.id}"><TurSekli tur={d.tur} boyut={11} /> {d.baslik}</a>
									<span class="deger">{d.deger} kapı</span>
								</li>
							{/each}
						</ol>
					</div>
				{/if}
				{#if k.kapiAcanlar.length}
					<div class="kart karakter">
						<h3>Kapı açanlar</h3>
						<p class="kucuk soluk">Bağlar boyunca en çok şeye götürenler.</p>
						<ol>
							{#each k.kapiAcanlar as d (d.id)}
								<li>
									<a href="/dugumler/{d.id}"><TurSekli tur={d.tur} boyut={11} /> {d.baslik}</a>
									<span class="deger">{d.deger} şey</span>
								</li>
							{/each}
						</ol>
					</div>
				{/if}
				{#if k.kavsaklar.length}
					<div class="kart karakter">
						<h3>Kavşaklar</h3>
						<p class="kucuk soluk">Hayatının ayrı köşelerini birbirine bağlayanlar.</p>
						<ol>
							{#each k.kavsaklar as d (d.id)}
								<li>
									<a href="/dugumler/{d.id}"><TurSekli tur={d.tur} boyut={11} /> {d.baslik}</a>
								</li>
							{/each}
						</ol>
					</div>
				{/if}
				{#if k.yetimSayisi > 0}
					<div class="kart karakter yetimler">
						<h3>Bağsızlar <span class="soluk">({k.yetimSayisi})</span></h3>
						<p class="kucuk soluk">Henüz hiçbir şeye bağlanmamış. Seni buraya ne getirdi?</p>
						<ul>
							{#each k.yetimler as d (d.id)}
								<li>
									<a href="/dugumler/{d.id}?getiren=1"
										><TurSekli tur={d.tur} boyut={11} /> {d.baslik}</a
									>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<div class="iki-sutun">
		<section class="yigin" aria-labelledby="son-baslik">
			<div class="bolum-baslik">
				<h2 id="son-baslik">Son eklenenler</h2>
				{#if pano.sonDugumler.length}<a href="/dugumler" class="kucuk">Tümü</a>{/if}
			</div>
			{#if pano.sonDugumler.length}
				<div class="liste">
					{#each pano.sonDugumler as dugum (dugum.id)}
						<DugumKarti {dugum} />
					{/each}
				</div>
			{:else}
				<BosDurum
					baslik="Henüz düğüm yok"
					aciklama="Okuduğun bir kitap, tanıştığın biri, yaşadığın bir yer… Her şey bir düğüm olabilir."
				>
					{#snippet eylemler()}
						<a class="dugme dugme-birincil" href="/dugumler/yeni">İlk düğümü ekle</a>
					{/snippet}
				</BosDurum>
			{/if}
		</section>

		<div class="yigin genis-aralik">
			{#if data.merak.length}
				<section class="yigin" aria-labelledby="merak-baslik">
					<div class="bolum-baslik">
						<h2 id="merak-baslik">Merak listen</h2>
						<a href="/dugumler?durum=merak" class="kucuk">Tümü</a>
					</div>
					<ul class="merak">
						{#each data.merak as m (m.id)}
							<li>
								<a href="/dugumler/{m.id}" class="merak-baslik">{m.baslik}</a>
								<span class="kucuk soluk">
									{m.durum ? durumEtiketi(m.durum, m.eserTuru) : ''}
									{#if m.getiren}
										· <a href="/dugumler/{m.getiren.id}">{m.getiren.baslik}</a> getirdi
									{/if}
								</span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			<section class="yigin" aria-labelledby="izler-baslik">
				<div class="bolum-baslik">
					<h2 id="izler-baslik">İzlerin</h2>
					{#if data.toplamIz > data.izler.length}<a href="/izler" class="kucuk">Tümü</a>{/if}
				</div>
				{#if data.izler.length}
					<div class="liste">
						{#each data.izler as iz (iz.id)}
							<IzKarti {iz} />
						{/each}
					</div>
				{:else}
					<div class="kart davet">
						<p>Düğümlerini sıraya dizip bir hikâye gibi anlatmak için bir iz oluştur.</p>
						<a class="dugme dugme-kucuk" href="/izler/yeni"
							><Simge ad="iz" boyut={16} /> İlk izini oluştur</a
						>
					</div>
				{/if}
			</section>

			<section class="yigin" aria-labelledby="baglar-baslik">
				<h2 id="baglar-baslik">Son bağlar</h2>
				{#if pano.sonBaglar.length}
					<ul class="baglar">
						{#each pano.sonBaglar as bag (bag.id)}
							<li>
								<span class="bag-uclari">
									<a href="/dugumler/{bag.kaynak.id}"
										><TurSekli tur={bag.kaynak.tur} boyut={11} /> {bag.kaynak.baslik}</a
									>
									<span class="ok" aria-label="şuna götürdü">→</span>
									<a href="/dugumler/{bag.hedef.id}"
										><TurSekli tur={bag.hedef.tur} boyut={11} /> {bag.hedef.baslik}</a
									>
								</span>
								{#if bag.not}<span class="not">“{bag.not}”</span>{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<div class="kart davet">
						<p>Bir düğümün sayfasında “Bu beni şuna götürdü” diyerek iki düğümü bağlayabilirsin.</p>
					</div>
				{/if}
			</section>
		</div>
	</div>
</div>

<style>
	.genis-aralik {
		gap: var(--a-6);
	}
	.sayilar {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
		gap: var(--a-3);
	}
	.sayi {
		display: flex;
		flex-direction: column;
		gap: var(--a-1);
		padding: var(--a-3) var(--a-4);
		text-decoration: none;
		color: var(--metin);
		transition:
			box-shadow var(--gecis),
			border-color var(--gecis);
	}
	.sayi:hover {
		color: var(--metin);
		border-color: var(--cizgi-guclu);
		box-shadow: var(--golge-2);
	}
	.sayi-ust {
		display: flex;
		align-items: center;
		gap: var(--a-2);
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
	}
	.sayi strong {
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-2xl);
		line-height: 1.1;
		font-variant-numeric: tabular-nums;
	}

	.gorunum-kartlari {
		display: grid;
		gap: var(--a-3);
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
	}
	.gorunum {
		display: flex;
		align-items: center;
		gap: var(--a-3);
		padding: var(--a-4);
		color: var(--metin);
		text-decoration: none;
		transition:
			box-shadow var(--gecis),
			border-color var(--gecis);
	}
	.gorunum:hover {
		color: var(--metin);
		border-color: var(--vurgu);
		box-shadow: var(--golge-2);
	}
	.gorunum > :global(svg:last-child) {
		color: var(--metin-silik);
		transition:
			transform var(--gecis),
			color var(--gecis);
	}
	.gorunum:hover > :global(svg:last-child) {
		color: var(--vurgu);
		transform: translateX(3px);
	}
	.gorunum-simge {
		display: grid;
		place-items: center;
		flex: none;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: var(--yaricap);
		background: var(--vurgu-zemin);
		color: var(--vurgu);
	}
	.gorunum-metin {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.gorunum-metin span {
		font-size: var(--boyut-sm);
		color: var(--metin-soluk);
	}

	.hatirlaticilar {
		display: grid;
		gap: var(--a-3);
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
	}
	.ust-etiket {
		margin: 0 0 var(--a-2);
		font-size: var(--boyut-xs);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--vurgu);
	}
	.gunun-sorusu h2 {
		margin: 0 0 var(--a-3);
		font-size: var(--boyut-lg);
	}
	.gunun-sorusu h2 a {
		color: var(--metin);
	}
	.bugun ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.bugun li {
		display: flex;
		flex-direction: column;
	}
	.bugun li strong {
		font-size: var(--boyut-xs);
		color: var(--metin-soluk);
	}
	.bugun li a {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
		font-weight: 600;
		color: var(--metin);
	}
	.sihirbaz-daveti {
		display: flex;
		align-items: center;
		gap: var(--a-4);
		padding: var(--a-5);
		color: var(--metin);
		text-decoration: none;
		border-color: color-mix(in srgb, var(--vurgu) 40%, var(--cizgi));
		background: var(--vurgu-zemin);
	}
	.sihirbaz-daveti:hover {
		color: var(--metin);
		box-shadow: var(--golge-2);
	}
	.sihirbaz-daveti strong {
		font-family: var(--yazi-baslik);
		font-size: var(--boyut-xl);
	}
	.sihirbaz-simge {
		display: grid;
		place-items: center;
		flex: none;
		width: 3.25rem;
		height: 3.25rem;
		border-radius: var(--yaricap-tam);
		background: var(--vurgu);
		color: var(--vurgu-uzeri);
	}

	.hizli-ekle {
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
		padding: var(--a-4);
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap-lg);
		background: var(--yuzey);
		box-shadow: var(--golge-1);
	}
	.hizli-etiket {
		display: inline-flex;
		align-items: center;
		gap: var(--a-2);
		font-weight: 650;
		color: var(--vurgu);
	}
	.hizli-satir {
		display: flex;
		gap: var(--a-2);
	}
	.hizli-satir input {
		flex: 1;
		min-width: 0;
		font-size: var(--boyut-md);
	}
	.hizli-ekle p {
		margin: 0;
	}

	.karakterler {
		display: grid;
		gap: var(--a-3);
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
	}
	.karakter {
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.karakter h3 {
		margin: 0;
		font-size: var(--boyut-lg);
	}
	.karakter p {
		margin: 0;
	}
	.karakter ol,
	.karakter ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-1);
	}
	.karakter li {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--a-2);
	}
	.karakter li a {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
		min-width: 0;
		font-weight: 600;
		color: var(--metin);
		text-decoration: none;
	}
	.karakter li a:hover {
		color: var(--vurgu);
	}
	.deger {
		flex: none;
		font-size: var(--boyut-xs);
		font-weight: 600;
		color: var(--vurgu);
		font-variant-numeric: tabular-nums;
	}
	.yetimler {
		border-style: dashed;
	}

	.merak {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		border: 1px dashed var(--cizgi-guclu);
		border-radius: var(--yaricap-lg);
	}
	.merak li {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: var(--a-3) var(--a-4);
	}
	.merak li + li {
		border-top: 1px dashed var(--cizgi);
	}
	.merak-baslik {
		font-weight: 600;
		color: var(--metin);
		text-decoration: none;
	}
	.merak-baslik:hover {
		color: var(--vurgu);
	}

	.iki-sutun {
		display: grid;
		gap: var(--a-6);
		align-items: start;
	}
	.bolum-baslik {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	h2 {
		margin: 0;
	}
	.liste {
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.davet p {
		margin: 0 0 var(--a-3);
		color: var(--metin-soluk);
		font-size: var(--boyut-sm);
	}
	.davet p:last-child {
		margin: 0;
	}
	.baglar {
		list-style: none;
		padding: 0;
		margin: 0;
		border: 1px solid var(--cizgi);
		border-radius: var(--yaricap-lg);
		background: var(--yuzey);
		overflow: hidden;
	}
	.baglar li {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: var(--a-3) var(--a-4);
	}
	.baglar li + li {
		border-top: 1px solid var(--cizgi);
	}
	.bag-uclari {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--a-1) var(--a-2);
	}
	.bag-uclari a {
		display: inline-flex;
		align-items: center;
		gap: var(--a-1);
		font-weight: 600;
		color: var(--metin);
		text-decoration: none;
	}
	.bag-uclari a:hover {
		color: var(--vurgu);
	}
	.ok {
		color: var(--vurgu);
		font-weight: 700;
	}
	.not {
		font-style: italic;
		color: var(--metin-soluk);
		font-size: var(--boyut-sm);
	}
	@media (min-width: 56rem) {
		.iki-sutun {
			grid-template-columns: 1.25fr 1fr;
		}
	}
</style>
