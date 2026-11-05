<script lang="ts">
	import { ceviri } from '#lib/dilDurumu.svelte.ts';
</script>

<svelte:head>
	<title>{ceviri.dil === 'en' ? 'Cookie policy · İz' : 'Çerez politikası · İz'}</title>
	<meta
		name="description"
		content={ceviri.dil === 'en'
			? 'İz uses only the cookies it needs to work; no tracking or ad cookies.'
			: 'İz yalnızca çalışması için gereken çerezleri kullanır; izleme ya da reklam çerezi yoktur.'}
	/>
</svelte:head>

{#if ceviri.dil === 'en'}
	<article class="kap kap-dar metin-sayfasi">
		<p class="ust">Cookies</p>
		<h1>Only what is needed</h1>
		<p class="ozet">
			İz has no tracking, analytics or advertising cookies, so there is no consent banner either:
			the four cookies we use are necessary for the site to work.
		</p>
		<table>
			<caption class="gorunmez">Cookies in use</caption>
			<thead>
				<tr><th scope="col">Cookie</th><th scope="col">Purpose</th><th scope="col">Lifetime</th></tr
				>
			</thead>
			<tbody>
				<tr
					><th scope="row"><code>iz_oturum</code></th><td
						>Keeps you signed in. Readable only by the server (HttpOnly), never sent to other sites.</td
					><td>30 days</td></tr
				>
				<tr
					><th scope="row"><code>tema</code></th><td
						>Your light or dark theme choice. Not written unless you choose; otherwise your device
						setting is used.</td
					><td>1 year</td></tr
				>
				<tr
					><th scope="row"><code>dil</code></th><td
						>Your interface language (Turkish or English). Not written unless you choose; otherwise
						your browser language is used.</td
					><td>1 year</td></tr
				>
				<tr
					><th scope="row"><code>iz_meydan</code></th><td
						>The security challenge for signing in with a passkey.</td
					><td>5 minutes</td></tr
				>
			</tbody>
		</table>
		<p>
			If you installed the app on your phone, pages you have opened are kept only in this device’s
			browser cache so they can be read offline, and are removed when you sign out.
		</p>
		<p class="guncelleme">
			On your personal data: <a href="/gizlilik">Privacy and personal data</a>.
		</p>
	</article>
{:else}
	<article class="kap kap-dar metin-sayfasi">
		<p class="ust">Çerezler</p>
		<h1>Yalnızca gerekenler</h1>
		<p class="ozet">
			İz'de izleme, analiz ya da reklam çerezi yok. Bu yüzden onay penceresi de yok: kullandığımız
			dört çerez sitenin çalışması için gerekli.
		</p>

		<table>
			<caption class="gorunmez">Kullanılan çerezler</caption>
			<thead>
				<tr>
					<th scope="col">Çerez</th>
					<th scope="col">Ne işe yarar</th>
					<th scope="col">Süre</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<th scope="row"><code>iz_oturum</code></th>
					<td
						>Giriş yaptığını hatırlar. Yalnızca sunucu okuyabilir (HttpOnly), başka sitelere
						gönderilmez.</td
					>
					<td>30 gün</td>
				</tr>
				<tr>
					<th scope="row"><code>tema</code></th>
					<td>Açık ya da koyu tema seçimin. Seçmezsen yazılmaz; cihazının ayarı kullanılır.</td>
					<td>1 yıl</td>
				</tr>
				<tr>
					<th scope="row"><code>dil</code></th>
					<td
						>Arayüz dili seçimin (Türkçe ya da İngilizce). Seçmezsen yazılmaz; tarayıcının dili
						kullanılır.</td
					>
					<td>1 yıl</td>
				</tr>
				<tr>
					<th scope="row"><code>iz_meydan</code></th>
					<td>Geçiş anahtarıyla (passkey) girişin güvenlik sınaması.</td>
					<td>5 dakika</td>
				</tr>
			</tbody>
		</table>

		<p>
			Uygulamayı telefonuna eklediysen, daha önce açtığın sayfalar bağlantı yokken de okunabilsin
			diye yalnızca bu cihazın tarayıcı önbelleğinde tutulur ve çıkış yaptığında silinir.
		</p>
		<p class="guncelleme">
			Kişisel verilerin için: <a href="/gizlilik">Gizlilik ve kişisel veriler</a>.
		</p>
	</article>
{/if}

<style>
	.metin-sayfasi {
		padding-block: var(--a-7);
		line-height: 1.7;
	}
	.ust {
		margin: 0 0 var(--a-2);
		font-size: var(--boyut-xs);
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--vurgu);
	}
	h1 {
		margin: 0 0 var(--a-4);
		font-size: clamp(2rem, 5vw, 2.8rem);
		font-weight: 500;
		letter-spacing: -0.02em;
	}
	.ozet {
		font-family: var(--yazi-baslik);
		font-size: 1.2rem;
		color: var(--metin-soluk);
	}
	table {
		width: 100%;
		margin: var(--a-5) 0;
		border-collapse: collapse;
		font-size: var(--boyut-sm);
		line-height: 1.5;
	}
	th,
	td {
		padding: var(--a-3) var(--a-2);
		text-align: left;
		vertical-align: top;
		border-bottom: 1px solid var(--cizgi);
	}
	thead th {
		color: var(--metin-soluk);
		font-weight: 600;
	}
	code {
		font-family: var(--yazi-kod);
		font-size: 0.95em;
	}
	.guncelleme {
		margin-top: var(--a-6);
		padding-top: var(--a-4);
		border-top: 1px solid var(--cizgi);
		color: var(--metin-soluk);
	}
</style>
