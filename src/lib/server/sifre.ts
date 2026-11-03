import { hash, verify } from '@node-rs/argon2';

// Argon2id, OWASP önerisi: 19 MiB bellek, 2 tur, 1 iş parçacığı
const AYARLAR = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 } as const;

export function sifreOzetle(sifre: string): Promise<string> {
	return hash(sifre, AYARLAR);
}

export async function sifreDogrula(ozet: string, sifre: string): Promise<boolean> {
	try {
		return await verify(ozet, sifre);
	} catch {
		return false;
	}
}

// Olmayan kullanıcıyla giriş denemesinde de aynı süre harcansın diye kullanılan sahte özet
let sahteOzet: Promise<string> | null = null;
export function sahteDogrulama(sifre: string): Promise<boolean> {
	sahteOzet ??= sifreOzetle('iz-zamanlama-esitleme');
	return sahteOzet.then((ozet) => sifreDogrula(ozet, sifre)).then(() => false);
}
