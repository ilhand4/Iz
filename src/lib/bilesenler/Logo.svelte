<script lang="ts">
	let { boyut = 28 }: { boyut?: number } = $props();
</script>

<span class="logo">
	<svg width={boyut} height={boyut} viewBox="0 0 32 32" aria-hidden="true">
		<!-- Tür şekilleri (eser kare, kişi daire, yer üçgen) ve aralarındaki iz -->
		<path
			d="M8 23 C 10 15, 13 10, 16 9 S 22 14, 24 21"
			stroke="var(--vurgu)"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-dasharray="0.2 3"
			fill="none"
		/>
		<rect x="4.6" y="19.6" width="6.8" height="6.8" rx="1.7" fill="var(--tur-eser)" />
		<circle cx="16" cy="9" r="3.6" fill="var(--tur-kisi)" />
		<path
			d="M24 17.2 27.6 23.6H20.4Z"
			fill="var(--tur-yer)"
			stroke="var(--tur-yer)"
			stroke-width="0.8"
			stroke-linejoin="round"
		/>
	</svg>
	<span class="ad" style:font-size="{(boyut * 1.5) / 28}rem">İz</span>
</span>

<style>
	.logo {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}
	.ad {
		font-family: var(--yazi-baslik);
		font-weight: 700;
		letter-spacing: -0.02em;
		line-height: 1;
		color: var(--metin);
	}
</style>
