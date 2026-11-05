<script lang="ts">
	// Kaydırmalı önce/sonra karşılaştırması. Kaydırıcı gerçek bir <input type="range">: klavyeyle
	// (ok tuşları, Home/End) ve ekran okuyucuyla kullanılabilir. JavaScript yoksa ortadan bölünmüş görünür.
	type Foto = { id: string; yil: number | null; aciklama: string | null };
	let { eski, yeni, baslik }: { eski: Foto; yeni: Foto; baslik: string } = $props();
	let konum = $state(50);
	const etiket = (f: Foto, varsayilan: string) => (f.yil ? String(f.yil) : varsayilan);
</script>

<figure class="once-sonra" style:--konum="{konum}%">
	<div class="sahne">
		<img
			class="yeni"
			src="/fotograflar/{yeni.id}"
			alt="{baslik}, {etiket(yeni, 'bugün')}{yeni.aciklama ? `: ${yeni.aciklama}` : ''}"
			loading="lazy"
		/>
		<img
			class="eski"
			src="/fotograflar/{eski.id}"
			alt="{baslik}, {etiket(eski, 'eskiden')}{eski.aciklama ? `: ${eski.aciklama}` : ''}"
			loading="lazy"
		/>
		<span class="cizgi" aria-hidden="true"><span class="tutamak"></span></span>
		<span class="etiket sol" aria-hidden="true">{etiket(eski, 'Eski')}</span>
		<span class="etiket sag" aria-hidden="true">{etiket(yeni, 'Bugün')}</span>
		<input
			type="range"
			min="0"
			max="100"
			step="1"
			bind:value={konum}
			aria-label="Eski fotoğrafın ne kadarı görünsün"
			aria-valuetext="%{konum} eski, %{100 - konum} yeni"
		/>
	</div>
	<figcaption class="kucuk soluk">
		Kaydırıcıyı sürükle ya da ok tuşlarıyla {etiket(eski, 'eski')} ile {etiket(yeni, 'bugün')} arasında
		gidip gel.
	</figcaption>
</figure>

<style>
	.once-sonra {
		max-width: 48rem;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--a-2);
	}
	.sahne {
		position: relative;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		border-radius: var(--yaricap-lg);
		background: var(--yuzey-2);
		user-select: none;
	}
	img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.eski {
		clip-path: inset(0 calc(100% - var(--konum)) 0 0);
		filter: sepia(0.15);
	}
	.cizgi {
		position: absolute;
		top: 0;
		bottom: 0;
		left: var(--konum);
		width: 2px;
		margin-left: -1px;
		background: #fff;
		box-shadow: 0 0 6px rgb(0 0 0 / 0.5);
		pointer-events: none;
	}
	.tutamak {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 2.25rem;
		height: 2.25rem;
		margin: -1.125rem 0 0 -1.125rem;
		border: 2px solid #fff;
		border-radius: 50%;
		background: rgb(0 0 0 / 0.45);
		box-shadow: 0 1px 6px rgb(0 0 0 / 0.5);
	}
	.tutamak::before,
	.tutamak::after {
		content: '';
		position: absolute;
		top: 50%;
		width: 0;
		height: 0;
		margin-top: -5px;
		border: 5px solid transparent;
	}
	.tutamak::before {
		left: 4px;
		border-right-color: #fff;
	}
	.tutamak::after {
		right: 4px;
		border-left-color: #fff;
	}
	.etiket {
		position: absolute;
		top: var(--a-2);
		padding: 0.15rem 0.55rem;
		border-radius: var(--yaricap-tam);
		background: rgb(0 0 0 / 0.6);
		color: #fff;
		font-size: var(--boyut-xs);
		font-weight: 650;
		pointer-events: none;
	}
	.sol {
		left: var(--a-2);
	}
	.sag {
		right: var(--a-2);
	}
	input[type='range'] {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		opacity: 0;
		cursor: ew-resize;
	}
	.sahne:has(input:focus-visible) {
		outline: 3px solid var(--vurgu);
		outline-offset: 2px;
	}
	figcaption {
		margin: 0;
	}
</style>
