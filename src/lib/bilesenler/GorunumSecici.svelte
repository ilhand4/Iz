<script lang="ts">
	import Simge, { type SimgeAdi } from './Simge.svelte';

	type Gorunum = 'liste' | 'ag' | 'zaman' | 'harita';
	let { etkin }: { etkin: Gorunum } = $props();

	const GORUNUMLER: {
		ad: Gorunum;
		etiket: string;
		kisa: string;
		href: string | null;
		simge: SimgeAdi;
	}[] = [
		{ ad: 'liste', etiket: 'Liste', kisa: 'Liste', href: '/dugumler', simge: 'liste' },
		{ ad: 'ag', etiket: 'Ağ', kisa: 'Ağ', href: '/dugumler/ag', simge: 'dugumler' },
		{ ad: 'zaman', etiket: 'Zaman çizgisi', kisa: 'Zaman', href: '/dugumler/zaman', simge: 'zaman' },
		{ ad: 'harita', etiket: 'Harita', kisa: 'Harita', href: null, simge: 'harita' }
	];
</script>

<nav class="gorunumler" aria-label="Görünüm">
	{#each GORUNUMLER as g (g.ad)}
		{#if g.href}
			<a href={g.href} aria-current={etkin === g.ad ? 'page' : undefined}>
				<Simge ad={g.simge} boyut={17} />
				<span class="uzun">{g.etiket}</span><span class="kisa">{g.kisa}</span>
			</a>
		{:else}
			<span class="pasif" aria-disabled="true" title="Harita görünümü yakında geliyor">
				<Simge ad={g.simge} boyut={17} />
				<span class="uzun">{g.etiket}</span><span class="kisa">{g.kisa}</span>
				<small>yakında</small>
			</span>
		{/if}
	{/each}
</nav>

<style>
	.gorunumler {
		display: flex;
		gap: 2px;
		padding: 3px;
		border-radius: var(--yaricap-tam);
		background: var(--yuzey-2);
		border: 1px solid var(--cizgi);
		width: 100%;
		max-width: 36rem;
	}
	a,
	.pasif {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		min-height: 2.5rem;
		padding: 0 var(--a-2);
		border-radius: var(--yaricap-tam);
		font-size: var(--boyut-sm);
		font-weight: 600;
		color: var(--metin-soluk);
		text-decoration: none;
		white-space: nowrap;
		transition:
			background var(--gecis),
			color var(--gecis);
	}
	a:hover {
		color: var(--metin);
	}
	a[aria-current='page'] {
		background: var(--yuzey);
		color: var(--metin);
		box-shadow: var(--golge-1);
	}
	.pasif {
		cursor: not-allowed;
		opacity: 0.55;
	}
	small {
		display: none;
		font-size: 0.7rem;
		font-weight: 500;
	}
	.uzun {
		display: none;
	}
	@media (min-width: 30rem) {
		.uzun {
			display: inline;
		}
		.kisa {
			display: none;
		}
	}
	@media (min-width: 40rem) {
		small {
			display: inline;
		}
	}
</style>
