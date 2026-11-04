<script lang="ts">
	// Geçiş anahtarı (passkey) düğmesi: ekleme (ayarlar) ya da giriş. Tarayıcı WebAuthn
	// desteklemiyorsa hiç görünmez (şifreyle giriş her zaman çalışır).
	import { onMount } from 'svelte';
	import { goto, refreshAll } from '$app/navigation';
	import { bildirimler } from '#lib/bildirim.svelte.ts';
	import Simge from './Simge.svelte';

	type Props = { kip: 'kayit' | 'giris'; donus?: string | null };
	let { kip, donus = null }: Props = $props();

	let destekleniyor = $state(false);
	let calisiyor = $state(false);
	let hata = $state<string | null>(null);

	onMount(() => {
		destekleniyor = typeof window.PublicKeyCredential === 'function';
	});

	async function istek(govde: Record<string, unknown>) {
		const yanit = await fetch('/api/gecis', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(govde)
		});
		const veri = await yanit.json().catch(() => ({}));
		if (!yanit.ok) throw new Error(veri.hata ?? 'İşlem tamamlanamadı.');
		return veri;
	}

	async function calistir() {
		calisiyor = true;
		hata = null;
		try {
			const { startAuthentication, startRegistration } = await import('@simplewebauthn/browser');
			if (kip === 'kayit') {
				const secenekler = await istek({ adim: 'kayit-secenekleri' });
				const yanit = await startRegistration({ optionsJSON: secenekler });
				await istek({ adim: 'kayit', yanit });
				await refreshAll();
				bildirimler.goster({ mesaj: 'Geçiş anahtarı eklendi. Artık şifresiz giriş yapabilirsin.' });
			} else {
				const secenekler = await istek({ adim: 'giris-secenekleri' });
				const yanit = await startAuthentication({ optionsJSON: secenekler });
				const sonuc = await istek({ adim: 'giris', yanit, donus });
				await goto(sonuc.yonlendir, { refreshAll: true });
			}
		} catch (e) {
			// Kullanıcı iletişim kutusunu kapattıysa sessiz geç
			const ad = (e as { name?: string }).name;
			if (ad !== 'NotAllowedError' && ad !== 'AbortError') {
				hata = (e as Error).message || 'İşlem tamamlanamadı.';
			}
		} finally {
			calisiyor = false;
		}
	}
</script>

{#if destekleniyor}
	<div class="gecis">
		<button
			type="button"
			class="dugme"
			class:tam={kip === 'giris'}
			onclick={calistir}
			disabled={calisiyor}
		>
			<Simge ad="anahtar" boyut={18} />
			{#if calisiyor}
				Bekleniyor…
			{:else if kip === 'kayit'}
				Bu cihaza geçiş anahtarı ekle
			{:else}
				Geçiş anahtarıyla giriş yap
			{/if}
		</button>
		{#if hata}<p class="hata-metni kucuk" role="alert">{hata}</p>{/if}
	</div>
{/if}

<style>
	.gecis {
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.tam {
		width: 100%;
		justify-content: center;
	}
	p {
		margin: 0;
	}
</style>
