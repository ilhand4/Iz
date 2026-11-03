<script lang="ts">
	import { enhance } from '$app/forms';
	import Alan from './Alan.svelte';
	import GizlilikSecici from './GizlilikSecici.svelte';

	type Props = {
		degerler?: Record<string, string>;
		hatalar?: Record<string, string>;
		gonderMetni: string;
		/** Form eylemi, ör. "?/bilgi"; boşsa varsayılan eylem */
		eylem?: string;
	};
	let { degerler = {}, hatalar = {}, gonderMetni, eylem }: Props = $props();
	let gonderiliyor = $state(false);
</script>

<form
	method="POST"
	action={eylem}
	class="yigin"
	novalidate
	use:enhance={() => {
		gonderiliyor = true;
		return async ({ update }) => {
			await update({ reset: false });
			gonderiliyor = false;
		};
	}}
>
	<Alan id="izBaslik" etiket="İzin adı" hata={hatalar.baslik} ipucu="ör. “Bir kitaplıktan Berlin’e”">
		<input
			id="izBaslik"
			name="baslik"
			value={degerler.baslik ?? ''}
			maxlength="120"
			required
			aria-invalid={!!hatalar.baslik}
		/>
	</Alan>
	<Alan id="izAciklama" etiket="Kısa anlatım" hata={hatalar.aciklama} ipucu="İsteğe bağlı: bu yolun hikâyesi bir iki cümleyle.">
		<textarea id="izAciklama" name="aciklama" rows="3" maxlength="2000">{degerler.aciklama ?? ''}</textarea>
	</Alan>
	<GizlilikSecici secili={degerler.gizlilik} hata={hatalar.gizlilik} baslik="Bu izi kim görebilir?" />
	<div class="satir">
		<button class="dugme dugme-birincil" disabled={gonderiliyor}>
			{gonderiliyor ? 'Kaydediliyor…' : gonderMetni}
		</button>
	</div>
</form>
