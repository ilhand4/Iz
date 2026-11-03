<script lang="ts">
	let { boyut = 28 }: { boyut?: number } = $props();
</script>

<span class="logo">
	<svg width={boyut} height={boyut} viewBox="0 0 32 32" aria-hidden="true">
		<circle cx="7" cy="24" r="3.2" fill="var(--tur-eser)" />
		<circle cx="16" cy="9" r="3.2" fill="var(--tur-kisi)" />
		<circle cx="25" cy="21" r="3.2" fill="var(--tur-yer)" />
		<path
			d="M9.2 21.6 13.8 11.6M18.6 10.8 23.2 18.6"
			stroke="var(--vurgu)"
			stroke-width="2"
			stroke-linecap="round"
			stroke-dasharray="0.1 3.6"
			fill="none"
		/>
	</svg>
	<span class="ad">İz</span>
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
		font-size: 1.5rem;
		letter-spacing: -0.02em;
		line-height: 1;
		color: var(--metin);
	}
</style>
