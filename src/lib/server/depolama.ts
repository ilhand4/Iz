// Dosya konumları. Proje klasörü OneDrive gibi bir bulut klasöründe olabileceği için yüklemeler
// (fotoğraflar, sesler) ve yerel araçlar (whisper.cpp, model) varsayılan olarak kullanıcının ev
// dizininde, `~/.iz/` altında tutulur. Yayında YUKLEME_KLASORU ve IZ_ARACLAR ile değiştirilir.
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export function yuklemeKlasoru(alt: string) {
	return join(resolve(process.env.YUKLEME_KLASORU || join(homedir(), '.iz', 'yuklemeler')), alt);
}

export function aracKlasoru() {
	return resolve(process.env.IZ_ARACLAR || join(homedir(), '.iz', 'araclar'));
}
