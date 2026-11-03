<script lang="ts" module>
	// Basit çizgi simgeleri (24×24, currentColor)
	const YOLLAR = {
		pano: 'M4 13h6V4H4zm0 7h6v-5H4zm10 0h6v-9h-6zm0-16v5h6V4z',
		dugumler: 'M6 6m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M18 8m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M10 18m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M8.3 7.2l7.4.6M7 8.3l2 7.3M16.4 10l-4.6 6',
		ara: 'M11 11m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0M20 20l-4-4',
		ekle: 'M12 5v14M5 12h14',
		gunes: 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
		ay: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
		otomatik: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 3v18',
		cikis: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11',
		ok: 'M5 12h14M13 6l6 6-6 6',
		geri: 'M19 12H5M11 6l-6 6 6 6',
		kilit: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
		dunya: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
		grup: 'M9 8m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 6',
		cop: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
		kalem: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
		konum: 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11zM12 10m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
		takvim: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4'
	} as const;

	export type SimgeAdi = keyof typeof YOLLAR;
</script>

<script lang="ts">
	let { ad, boyut = 20 }: { ad: SimgeAdi; boyut?: number } = $props();
</script>

<svg
	width={boyut}
	height={boyut}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
>
	<path d={YOLLAR[ad]} />
</svg>
