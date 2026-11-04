// Oturum listesinde gösterilecek kısa cihaz açıklaması: "Edge · Windows", "Safari · iPhone".
// Tam User-Agent saklanmaz (gereksiz parmak izi verisi); yalnızca bu kısa özet.

const TARAYICILAR: [RegExp, string][] = [
	[/Edg(?:e|A|iOS)?\//, 'Edge'],
	[/OPR\/|Opera/, 'Opera'],
	[/SamsungBrowser\//, 'Samsung Internet'],
	[/YaBrowser\//, 'Yandex'],
	[/Firefox\/|FxiOS\//, 'Firefox'],
	[/Chrome\/|CriOS\//, 'Chrome'],
	[/Safari\//, 'Safari']
];

const SISTEMLER: [RegExp, string][] = [
	[/iPhone/, 'iPhone'],
	[/iPad/, 'iPad'],
	[/Android/, 'Android'],
	[/Windows/, 'Windows'],
	[/Mac OS X|Macintosh/, 'macOS'],
	[/CrOS/, 'ChromeOS'],
	[/Linux/, 'Linux']
];

export function cihazAdi(ua: string | null | undefined): string | null {
	if (!ua) return null;
	const tarayici = TARAYICILAR.find(([d]) => d.test(ua))?.[1];
	const sistem = SISTEMLER.find(([d]) => d.test(ua))?.[1];
	const parcalar = [tarayici, sistem].filter(Boolean);
	return parcalar.length ? parcalar.join(' · ') : 'Bilinmeyen cihaz';
}
