<script lang="ts">
	// Sesli anı: tarayıcıda kayıt (MediaRecorder) ya da dosya seçme. Kayıt, formdaki dosya alanına
	// konur; form her durumda aynı biçimde gönderilir. JavaScript yoksa yalnızca dosya alanı görünür
	// (telefonlarda `capture` ile doğrudan ses kaydedici açılır).
	import { onDestroy, onMount } from 'svelte';
	import { EN_BUYUK_SES_MB, EN_UZUN_DAKIKA, sureYaz } from '#lib/ses.ts';
	import Simge from './Simge.svelte';

	let { id = 'ses', ad = 'ses' }: { id?: string; ad?: string } = $props();

	let destek = $state(false);
	let durum = $state<'hazir' | 'kayit' | 'bitti'>('hazir');
	let sure = $state(0);
	let hata = $state<string | null>(null);
	let onizleme = $state<string | null>(null);
	let girdi: HTMLInputElement | undefined = $state();
	let kaydedici: MediaRecorder | null = null;
	let akis: MediaStream | null = null;
	let parcalar: Blob[] = [];
	let zamanlayici: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		destek = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
	});
	onDestroy(() => {
		durdur();
		if (onizleme) URL.revokeObjectURL(onizleme);
	});

	function turSec() {
		for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'])
			if (MediaRecorder.isTypeSupported(t)) return t;
		return '';
	}

	async function basla() {
		hata = null;
		try {
			akis = await navigator.mediaDevices.getUserMedia({ audio: true });
		} catch {
			hata =
				'Mikrofona erişilemedi. Tarayıcının izin verdiğinden emin ol ya da bir ses dosyası seç.';
			return;
		}
		const tur = turSec();
		kaydedici = new MediaRecorder(akis, tur ? { mimeType: tur } : undefined);
		parcalar = [];
		kaydedici.ondataavailable = (e) => e.data.size && parcalar.push(e.data);
		kaydedici.onstop = bitir;
		kaydedici.start(1000);
		sure = 0;
		durum = 'kayit';
		zamanlayici = setInterval(() => {
			sure++;
			if (sure >= EN_UZUN_DAKIKA * 60) durdur();
		}, 1000);
	}

	function durdur() {
		clearInterval(zamanlayici);
		if (kaydedici?.state === 'recording') kaydedici.stop();
		akis?.getTracks().forEach((t) => t.stop());
		akis = null;
	}

	function bitir() {
		const tur = kaydedici?.mimeType || 'audio/webm';
		const blob = new Blob(parcalar, { type: tur });
		const uzanti = tur.includes('mp4') ? 'm4a' : tur.includes('ogg') ? 'ogg' : 'webm';
		const dosya = new File([blob], `kayit.${uzanti}`, { type: tur });
		if (dosya.size > EN_BUYUK_SES_MB * 1024 * 1024) {
			hata = `Kayıt ${EN_BUYUK_SES_MB} MB'tan büyük oldu; daha kısa parçalar halinde kaydet.`;
			durum = 'hazir';
			return;
		}
		const dt = new DataTransfer();
		dt.items.add(dosya);
		if (girdi) girdi.files = dt.files;
		if (onizleme) URL.revokeObjectURL(onizleme);
		onizleme = URL.createObjectURL(blob);
		durum = 'bitti';
	}

	function sifirla() {
		if (girdi) girdi.value = '';
		if (onizleme) URL.revokeObjectURL(onizleme);
		onizleme = null;
		durum = 'hazir';
	}
</script>

<div class="ses-kaydedici yigin">
	{#if destek}
		<div class="satir kayit-satiri">
			{#if durum === 'hazir'}
				<button type="button" class="dugme kayit" onclick={basla}>
					<span class="nokta" aria-hidden="true"></span> Kaydı başlat
				</button>
			{:else if durum === 'kayit'}
				<button type="button" class="dugme dugme-birincil" onclick={durdur}>
					<span class="kare" aria-hidden="true"></span> Durdur
				</button>
				<span class="sayac" role="timer" aria-live="off">{sureYaz(sure)}</span>
				<span class="gorunmez" role="status">Kayıt sürüyor</span>
			{:else}
				<button type="button" class="dugme dugme-hayalet" onclick={sifirla}>
					<Simge ad="yenile" boyut={16} /> Yeniden kaydet
				</button>
			{/if}
		</div>
		{#if onizleme}
			<audio controls src={onizleme} aria-label="Kaydı dinle"></audio>
		{/if}
		<p class="kucuk soluk">
			ya da bir ses dosyası seç (en çok {EN_BUYUK_SES_MB} MB; WhatsApp sesli mesajları da olur):
		</p>
	{/if}
	<input
		{id}
		name={ad}
		type="file"
		accept="audio/*,.m4a,.opus,.ogg,.webm,.mp3,.wav"
		capture="user"
		bind:this={girdi}
		onchange={() => {
			if (onizleme) URL.revokeObjectURL(onizleme);
			onizleme = null;
			durum = 'hazir';
		}}
	/>
	{#if hata}<p class="hata-metni" role="alert">{hata}</p>{/if}
</div>

<style>
	.ses-kaydedici p {
		margin: 0;
	}
	.kayit-satiri {
		align-items: center;
	}
	.kayit .nokta {
		display: inline-block;
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 50%;
		background: var(--hata);
	}
	.kare {
		display: inline-block;
		width: 0.65rem;
		height: 0.65rem;
		background: currentColor;
		border-radius: 2px;
	}
	.sayac {
		font-variant-numeric: tabular-nums;
		font-weight: 650;
		color: var(--hata);
	}
	audio {
		width: 100%;
		max-width: 28rem;
	}
</style>
