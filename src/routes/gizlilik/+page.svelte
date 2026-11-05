<script lang="ts">
	import { ceviri } from '#lib/dilDurumu.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const sorumlu = $derived(
		data.sorumlu ??
			(ceviri.dil === 'en'
				? 'The person or organisation operating this İz installation'
				: 'Bu İz kurulumunu işleten kişi ya da kurum')
	);
</script>

<svelte:head>
	<title
		>{ceviri.dil === 'en'
			? 'Privacy and personal data · İz'
			: 'Gizlilik ve kişisel veriler · İz'}</title
	>
	<meta
		name="description"
		content={ceviri.dil === 'en'
			? 'Which personal data İz processes, why, and for how long.'
			: "İz'in hangi kişisel verileri, hangi amaçla ve ne kadar süre işlediğine dair aydınlatma metni."}
	/>
</svelte:head>

{#if ceviri.dil === 'en'}
	<article class="kap kap-dar metin-sayfasi">
		<p class="ust">Turkish Personal Data Protection Law (KVKK)</p>
		<h1>Privacy and personal data</h1>
		<p class="ozet">
			İz is a notebook that keeps the connections in your life for you. It shows no ads, never sells
			your data and does not share it to build profiles. This notice is provided under Article 10 of
			Law No. 6698 (KVKK).
		</p>
		<h2>Data controller</h2>
		<p>
			{sorumlu}{#if data.eposta}. For requests and questions: <a href="mailto:{data.eposta}"
					>{data.eposta}</a
				>{/if}.
		</p>
		<h2>What we process</h2>
		<ul>
			<li>
				<strong>Account:</strong> display name, username, email address and an irreversible hash of your
				password (Argon2id). The password itself is never stored.
			</li>
			<li>
				<strong>Your map:</strong> the nodes, links, trails, notes, quotes, periods, decision journal
				and translation tables you add.
			</li>
			<li>
				<strong>Photos and voice:</strong> files you upload. Location and device data (EXIF) are removed
				from photos on upload. Voice recordings are transcribed on this server and never sent to any third
				party.
			</li>
			<li>
				<strong>Technical:</strong> session records (a hash of the token, device type, last use) and short-lived,
				IP-based attempt counters to prevent abuse.
			</li>
			<li>
				<strong>Answers from loved ones:</strong> written or spoken answers to your questions, given without
				an account; they go only to your archive.
			</li>
		</ul>
		<h2>Why, and on what legal basis</h2>
		<p>
			To provide the service, protect your account and fix problems; under KVKK Art. 5/2-c
			(performance of a contract) and Art. 5/2-f (legitimate interest: security and abuse
			prevention). Whether to share sensitive data such as health or beliefs is entirely up to you;
			if you do, it is with your explicit consent and you can delete it at any time.
		</p>
		<h2>Who it is shared with</h2>
		<p>
			Only with the people you choose: you set the visibility of each node and trail (private,
			group, shadow, public). Private is always the default, and public pages are hidden from search
			engines unless you allow it. When you search for works, only your search terms go to Open
			Library, TMDB and Wikidata; map tiles are fetched from OpenFreeMap by your browser. None of
			these services receive your account data or content. No personal data is transferred abroad.
		</p>
		<h2>How long it is kept</h2>
		<ul>
			<li>
				Your map, for as long as your account exists; deleted nodes stay in the bin for 30 days and
				are then permanently deleted.
			</li>
			<li>
				Sessions at most 30 days; password reset links 1 hour, email verification links 3 days.
			</li>
			<li>
				When you delete your account, all your data, photos and recordings are deleted immediately.
			</li>
		</ul>
		<h2>Your rights</h2>
		<p>
			Under KVKK Art. 11 you may learn whether your data is processed, request information, ask for
			correction or deletion, object, and claim compensation for damage. You can exercise most of
			these yourself: in <a href="/ayarlar#veriler">Settings</a> you can download all your data, correct
			it, or delete your account entirely.
		</p>
		<p class="guncelleme">On cookies: <a href="/cerezler">Cookie policy</a>.</p>
	</article>
{:else}
	<article class="kap kap-dar metin-sayfasi">
		<p class="ust">Kişisel Verilerin Korunması Kanunu (KVKK)</p>
		<h1>Gizlilik ve kişisel veriler</h1>
		<p class="ozet">
			İz, hayatındaki bağları senin için saklayan bir defterdir; reklam göstermez, verini satmaz,
			kimseyle profil çıkarmak için paylaşmaz. Bu metin 6698 sayılı KVKK'nın 10. maddesi uyarınca
			seni bilgilendirmek içindir.
		</p>

		<h2>Veri sorumlusu</h2>
		<p>
			{sorumlu}{#if data.eposta}. Başvuru ve sorular için: <a href="mailto:{data.eposta}"
					>{data.eposta}</a
				>{/if}.
		</p>

		<h2>Hangi verileri işliyoruz?</h2>
		<ul>
			<li>
				<strong>Hesap:</strong> görünen ad, kullanıcı adı, e-posta adresi ve şifrenin geri döndürülemez
				özeti (Argon2id). Şifrenin kendisi saklanmaz.
			</li>
			<li>
				<strong>Haritan:</strong> eklediğin düğümler, bağlar, izler, notlar, alıntılar, dönemler, karar
				defteri, çeviri masaları.
			</li>
			<li>
				<strong>Fotoğraf ve sesler:</strong> yüklediğin dosyalar. Fotoğraflardaki konum ve cihaz bilgisi
				(EXIF) yüklenirken silinir. Sesler bu sunucuda yazıya dökülür; hiçbir dış servise gönderilmez.
			</li>
			<li>
				<strong>Teknik:</strong> oturum kaydı (jetonun özeti, cihaz türü, son kullanım), kötüye kullanımı
				önlemek için kısa süreli IP tabanlı deneme sayaçları.
			</li>
			<li>
				<strong>Yakınlarının yanıtları:</strong> sorduğun soruya hesapsız verilen yazılı ya da sesli yanıtlar;
				yalnızca senin arşivine girer.
			</li>
		</ul>

		<h2>Ne amaçla ve hangi hukuki sebeple?</h2>
		<p>
			Hizmeti sunmak, hesabını korumak ve sorunları gidermek için; KVKK m. 5/2-c (sözleşmenin
			kurulması ve ifası) ve m. 5/2-f (meşru menfaat: güvenlik, kötüye kullanımın önlenmesi)
			kapsamında. Sağlık, inanç gibi özel nitelikli bilgileri paylaşıp paylaşmamak sana kalmıştır;
			paylaşırsan bunu açık rızanla yaparsın ve istediğin an silebilirsin.
		</p>

		<h2>Kimlerle paylaşılır?</h2>
		<p>
			Yalnızca senin seçtiğin kişilerle: her düğüm ve izin gizliliğini sen belirlersin (özel, grup,
			gölge, herkes). Varsayılan her zaman özeldir; herkese açık sayfalar da sen izin vermedikçe
			arama motorlarına kapalıdır. Eser aramalarında Open Library, TMDB ve Wikidata'ya yalnızca
			arama sözcükleri, harita karoları için OpenFreeMap'e yalnızca tarayıcının olağan isteği gider;
			bu servislere hesap bilgin ya da içeriğin gönderilmez. Yurt dışına kişisel veri aktarılmaz.
		</p>

		<h2>Ne kadar süre saklanır?</h2>
		<ul>
			<li>
				Hesabın açık olduğu sürece haritan; silinen düğümler 30 gün çöp kutusunda bekler, sonra
				kalıcı olarak silinir.
			</li>
			<li>
				Oturumlar en çok 30 gün; şifre sıfırlama bağlantıları 1 saat, e-posta doğrulama bağlantıları
				3 gün.
			</li>
			<li>Hesabını sildiğinde tüm verilerin, fotoğrafların ve seslerin hemen silinir.</li>
		</ul>

		<h2>Hakların</h2>
		<p>
			KVKK m. 11 uyarınca verilerinin işlenip işlenmediğini öğrenme, bilgi isteme, düzeltilmesini ya
			da silinmesini isteme, itiraz etme ve zarara uğradıysan giderilmesini talep etme hakların var.
			Bunların çoğunu doğrudan kendin kullanabilirsin: <a href="/ayarlar#veriler">Ayarlar</a>'dan
			bütün verilerini indirebilir, düzeltebilir ya da hesabını tamamen silebilirsin.
		</p>

		<p class="guncelleme">Çerezler için: <a href="/cerezler">Çerez politikası</a>.</p>
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
	h2 {
		margin: var(--a-6) 0 var(--a-2);
		font-size: 1.35rem;
		font-weight: 500;
	}
	ul {
		padding-left: 1.2rem;
	}
	li + li {
		margin-top: var(--a-2);
	}
	.guncelleme {
		margin-top: var(--a-6);
		padding-top: var(--a-4);
		border-top: 1px solid var(--cizgi);
		color: var(--metin-soluk);
	}
</style>
