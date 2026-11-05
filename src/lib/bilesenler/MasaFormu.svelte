<script lang="ts">
	// Çeviri masası oluşturma/düzenleme formu (liste sayfası ve masa ayarları ortak).
	import { enhance } from '$app/forms';
	import Alan from './Alan.svelte';

	type Props = {
		eylem: string;
		degerler?: Record<string, string>;
		hatalar?: Record<string, string>;
		eserler: { id: string; baslik: string }[];
		gonderMetni: string;
		onek?: string;
	};
	let { eylem, degerler = {}, hatalar = {}, eserler, gonderMetni, onek = 'm' }: Props = $props();
	const d = (ad: string) => degerler[ad] ?? '';
</script>

<form method="POST" action={eylem} class="yigin" use:enhance>
	<Alan id="{onek}-baslik" etiket="Masanın adı" hata={hatalar.baslik} ipucu="Genellikle eserin adı">
		<input id="{onek}-baslik" name="baslik" maxlength="160" required value={d('baslik')} />
	</Alan>
	<div class="iki">
		<Alan id="{onek}-ozgunDil" etiket="Özgün dil" hata={hatalar.ozgunDil}>
			<input
				id="{onek}-ozgunDil"
				name="ozgunDil"
				maxlength="40"
				placeholder="Rusça"
				value={d('ozgunDil')}
			/>
		</Alan>
		<Alan id="{onek}-gizlilik" etiket="Kimler görsün?" hata={hatalar.gizlilik}>
			<select id="{onek}-gizlilik" name="gizlilik">
				<option value="ozel" selected={(d('gizlilik') || 'ozel') === 'ozel'}>Yalnızca ben</option>
				<option value="grup" selected={d('gizlilik') === 'grup'}>Gruplarım</option>
				<option value="herkes" selected={d('gizlilik') === 'herkes'}>Herkes</option>
			</select>
		</Alan>
	</div>
	{#if eserler.length}
		<Alan
			id="{onek}-eserId"
			etiket="Haritandaki eser"
			hata={hatalar.eserId}
			ipucu="İsteğe bağlı: masa, eser düğümünün sayfasında görünür"
		>
			<select id="{onek}-eserId" name="eserId">
				<option value="">Bağlama</option>
				{#each eserler as e (e.id)}
					<option value={e.id} selected={d('eserId') === e.id}>{e.baslik}</option>
				{/each}
			</select>
		</Alan>
	{/if}
	<Alan id="{onek}-aciklama" etiket="Açıklama" hata={hatalar.aciklama} ipucu="İsteğe bağlı">
		<textarea id="{onek}-aciklama" name="aciklama" rows="2" maxlength="1000"
			>{d('aciklama')}</textarea
		>
	</Alan>
	<div class="satir"><button class="dugme dugme-birincil">{gonderMetni}</button></div>
</form>

<style>
	.iki {
		display: grid;
		gap: var(--a-3);
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
	}
</style>
