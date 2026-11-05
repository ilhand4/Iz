// Uygulama simgelerini (PWA, Apple, favicon) tek SVG kaynağından üretir: `npm run simgeler`.
// Çıktılar static/ altına yazılır ve depoya girer; logo değişince yeniden çalıştırılır.
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

/** Logo: koyu zemin üzerinde üç tür rengi ve aralarındaki iz. `bosluk`: maskelenebilir simge için kenar payı */
const logo = (bosluk = 0) => {
	const k = 32 + bosluk * 2;
	return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-bosluk} ${-bosluk} ${k} ${k}">
	<rect x="${-bosluk}" y="${-bosluk}" width="${k}" height="${k}" rx="${bosluk ? 0 : 8}" fill="#1f1b16"/>
	<path d="M8 23 C 10 15, 13 10, 16 9 S 22 14, 24 21" stroke="#e8805f" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="0.2 2.6" fill="none"/>
	<rect x="4.8" y="19.8" width="6.4" height="6.4" rx="1.6" fill="#f0b44c"/>
	<circle cx="16" cy="9" r="3.4" fill="#f08bb0"/>
	<path d="M24 17.4 27.4 23.4H20.6Z" fill="#70c995" stroke="#70c995" stroke-width="0.8" stroke-linejoin="round"/>
</svg>`);
};

const ciktilar: [string, number, number][] = [
	['static/simge-192.png', 192, 0],
	['static/simge-512.png', 512, 0],
	['static/simge-maskeli-512.png', 512, 7],
	['static/apple-touch-icon.png', 180, 3],
	['static/favicon-32.png', 32, 0]
];
for (const [yol, boyut, bosluk] of ciktilar) {
	await sharp(logo(bosluk), { density: 1200 }).resize(boyut, boyut).png().toFile(yol);
	console.log(yol);
}
// favicon.ico: modern tarayıcılar PNG içerikli .ico'yu okur (eski istekler 404 olmasın)
await writeFile(
	'static/favicon.ico',
	await sharp(logo(0), { density: 600 }).resize(32, 32).png().toBuffer()
);
await writeFile('static/favicon.svg', logo(0));
console.log('static/favicon.ico, static/favicon.svg');
