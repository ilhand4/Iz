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
		/** Kullanıcının grupları: ortak iz seçimi için */
		gruplar?: { id: string; ad: string }[];
	};
	let { degerler = {}, hatalar = {}, gonderMetni, eylem, gruplar = [] }: Props = $props();
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
	<Alan
		id="izBaslik"
		etiket="İzin adı"
		hata={hatalar.baslik}
		ipucu="ör. “Bir kitaplıktan Berlin’e”"
	>
		<input
			id="izBaslik"
			name="baslik"
			value={degerler.baslik ?? ''}
			maxlength="120"
			required
			aria-invalid={!!hatalar.baslik}
		/>
	</Alan>
	<Alan
		id="izAciklama"
		etiket="Kısa anlatım"
		hata={hatalar.aciklama}
		ipucu="İsteğe bağlı: bu yolun hikâyesi bir iki cümleyle."
	>
		<textarea id="izAciklama" name="aciklama" rows="3" maxlength="2000"
			>{degerler.aciklama ?? ''}</textarea
		>
	</Alan>
	<GizlilikSecici
		secili={degerler.gizlilik}
		hata={hatalar.gizlilik}
		baslik="Bu izi kim görebilir?"
	/>
	{#if gruplar.length}
		<Alan
			id="ortakGrupId"
			etiket="Ortak iz"
			ipucu="Seçersen grubun üyeleri bu izi görür ve kendi düğümlerinden durak ekleyebilir."
		>
			<select id="ortakGrupId" name="ortakGrupId">
				<option value="">Yalnızca benim izim</option>
				{#each gruplar as g (g.id)}
					<option value={g.id} selected={degerler.ortakGrupId === g.id}>{g.ad} ile ortak</option>
				{/each}
			</select>
		</Alan>
	{/if}
	<div class="satir">
		<button class="dugme dugme-birincil" disabled={gonderiliyor}>
			{gonderiliyor ? 'Kaydediliyor…' : gonderMetni}
		</button>
	</div>
</form>
