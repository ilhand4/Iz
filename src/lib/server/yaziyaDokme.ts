// Sesleri yerelde Türkçe yazıya döker: ffmpeg → 16 kHz mono WAV → whisper.cpp (whisper-cli).
// Ses hiçbir yere gönderilmez (kullanıcı kararı). Araçlar yoksa kayıtlar "kapali" olur; metin elle yazılır.
// Kuyruk süreç içidir ve tek seferde bir kayıt işler (CPU'yu boğmamak için). Sunucu yeniden
// başlayınca yarım kalanlar yeniden sıraya girer (sesler.ts → sesKuyrugunuBaslat, hooks.server.ts).
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { availableParallelism, tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { eq, sql } from 'drizzle-orm';
import { EN_UZUN_DAKIKA, halusinasyonuAyikla } from '../ses';
import { db } from './db';
import { sesler } from './db/schema';
import { aracKlasoru } from './depolama';

const calistir = promisify(execFile);

export type Araclar = { ffmpeg: string; whisper: string; model: string };

/** Araçların yolları: ortam değişkenleri, yoksa ~/.iz/araclar ve winget'in ffmpeg bağlantısı */
export function araclariBul(): Araclar | null {
	const klasor = aracKlasoru();
	const whisper =
		process.env.WHISPER_KOMUTU ||
		[
			join(klasor, 'whisper', 'Release', 'whisper-cli.exe'),
			join(klasor, 'whisper', 'whisper-cli')
		].find((y) => existsSync(y));
	const model = process.env.WHISPER_MODELI || join(klasor, 'ggml-large-v3-turbo-q5_0.bin');
	const wingetFfmpeg = process.env.LOCALAPPDATA
		? join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe')
		: '';
	const ffmpeg =
		process.env.FFMPEG_KOMUTU ||
		(wingetFfmpeg && existsSync(wingetFfmpeg) ? wingetFfmpeg : 'ffmpeg');
	if (!whisper || !existsSync(whisper) || !existsSync(model)) return null;
	return { ffmpeg, whisper, model };
}

/** Bir ses dosyasını yazıya döker; { metin, sure } */
export async function dosyayiYaziyaDok(girdi: string, a: Araclar) {
	const gecici = await mkdtemp(join(tmpdir(), 'iz-ses-'));
	const wav = join(gecici, 'ses.wav');
	const cikti = join(gecici, 'metin');
	try {
		await calistir(
			a.ffmpeg,
			[
				'-nostdin',
				'-y',
				'-i',
				girdi,
				'-t',
				String(EN_UZUN_DAKIKA * 60),
				'-ar',
				'16000',
				'-ac',
				'1',
				'-c:a',
				'pcm_s16le',
				wav
			],
			{ windowsHide: true, timeout: 5 * 60_000 }
		);
		// 16 kHz × 16 bit × mono = 32000 bayt/sn (44 baytlık başlık)
		const sure = Math.round(((await stat(wav)).size - 44) / 32000);
		await calistir(
			a.whisper,
			[
				'-m',
				a.model,
				'-l',
				'tr',
				'-t',
				String(Math.max(2, Math.min(8, availableParallelism() - 2))),
				'-nt',
				'-np',
				'-otxt',
				'-of',
				cikti,
				'-f',
				wav
			],
			{ windowsHide: true, timeout: 60 * 60_000, maxBuffer: 16 * 1024 * 1024 }
		);
		const metin = (await readFile(`${cikti}.txt`, 'utf8'))
			.split(/\r?\n/)
			.map((s) => s.trim())
			.filter(Boolean)
			.join(' ')
			.replace(/\s+/g, ' ')
			.trim();
		return { metin: halusinasyonuAyikla(metin), sure };
	} finally {
		await rm(gecici, { recursive: true, force: true });
	}
}

// ——— Kuyruk ———

type Isleyici = (id: string) => Promise<{ metin: string; sure: number } | 'kapali'>;

const sira: string[] = [];
let calisiyor = false;
let yolBulucu: (id: string) => string = () => '';
let isleyici: Isleyici = async (id) => {
	const a = araclariBul();
	if (!a) return 'kapali';
	return dosyayiYaziyaDok(yolBulucu(id), a);
};

/** sesler.ts dosya yolunu verir; testler sahte işleyici takar */
export function kuyrukAyarla(ayar: { yol?: (id: string) => string; isleyici?: Isleyici }) {
	if (ayar.yol) yolBulucu = ayar.yol;
	if (ayar.isleyici) isleyici = ayar.isleyici;
}

export function kuyrugaEkle(id: string) {
	if (!sira.includes(id)) sira.push(id);
	void sirayiIsle();
}

/** Kuyruk boşalana kadar bekler (testler için) */
export async function kuyrukBosalana() {
	while (calisiyor || sira.length) await new Promise((r) => setTimeout(r, 10));
}

async function sirayiIsle() {
	if (calisiyor) return;
	calisiyor = true;
	try {
		while (sira.length) {
			const id = sira.shift()!;
			await db.update(sesler).set({ durum: 'isleniyor', hata: null }).where(eq(sesler.id, id));
			try {
				const sonuc = await isleyici(id);
				if (sonuc === 'kapali') {
					await db.update(sesler).set({ durum: 'kapali' }).where(eq(sesler.id, id));
				} else {
					await db
						.update(sesler)
						.set({
							durum: 'tamam',
							// Elle yazılmış bir metin varsa üzerine yazılmaz
							metin: sql`coalesce(${sesler.metin}, ${sonuc.metin || null})`,
							sure: sonuc.sure,
							islenme: new Date()
						})
						.where(eq(sesler.id, id));
				}
			} catch (e) {
				console.warn('Yazıya dökme başarısız:', (e as Error).message?.slice(0, 200));
				await db
					.update(sesler)
					.set({ durum: 'hata', hata: 'Yazıya dökülemedi.' })
					.where(eq(sesler.id, id));
			}
		}
	} finally {
		calisiyor = false;
	}
}
