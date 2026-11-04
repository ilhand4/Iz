// Saf yetki ve sorgu yardımcıları (veritabanına bağlı değil; birim testli)
import type { Gizlilik } from '../sabitler';

/** Bir düğümü (ya da izi) kimin görebileceği kuralı. SQL karşılığı: dugumler.ts → gorunurluk() */
export function gorebilirMi(
	kayit: { sahipId: string; gizlilik: Gizlilik },
	izleyenId: string | null,
	/** İzleyen, sahiple en az bir ortak grupta mı? */
	grupArkadasi = false
): boolean {
	if (izleyenId && kayit.sahipId === izleyenId) return true;
	if (kayit.gizlilik === 'grup') return !!izleyenId && grupArkadasi;
	return kayit.gizlilik === 'herkes';
}

/** ILIKE desenindeki %, _ ve \ karakterlerini kaçırır */
export function likeKacir(metin: string): string {
	return metin.replace(/[\\%_]/g, (k) => '\\' + k);
}

/** Yalnızca uygulama içi göreli yollara yönlendirmeye izin verir (açık yönlendirme koruması) */
export function guvenliDonus(hedef: string | null | undefined, varsayilan = '/pano'): string {
	if (!hedef || !hedef.startsWith('/') || hedef.startsWith('//') || hedef.startsWith('/\\'))
		return varsayilan;
	return hedef;
}
