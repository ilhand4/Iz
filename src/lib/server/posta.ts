// E-posta gönderimi. Hangi servisin kullanılacağına kullanıcı karar verecek (ROADMAP 3a);
// seçilene kadar geliştirmede iletiler terminale yazılır. Üretimde servis yoksa ileti gönderilmez
// ve bağlantı günlüğe yazılmaz (sıfırlama bağlantısı log dosyalarına sızmasın).
import { dev } from '$app/env';

export type Ileti = { kime: string; konu: string; metin: string };

/** Test ve geliştirmede son gönderilenler (yalnızca bellek içi) */
export const sonIletiler: Ileti[] = [];

export async function epostaGonder(ileti: Ileti): Promise<boolean> {
	sonIletiler.push(ileti);
	if (sonIletiler.length > 20) sonIletiler.shift();
	if (dev || process.env.VITEST) {
		console.info(
			`\n[posta] Kime: ${ileti.kime}\n[posta] Konu: ${ileti.konu}\n${ileti.metin}\n[posta] ———\n`
		);
		return true;
	}
	console.warn(`[posta] E-posta servisi yapılandırılmadı; "${ileti.konu}" iletisi gönderilemedi.`);
	return false;
}
