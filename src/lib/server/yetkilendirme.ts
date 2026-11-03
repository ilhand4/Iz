import { redirect } from '@sveltejs/kit';

/** Giriş yapmamış kullanıcıyı, geri dönebileceği adresle giriş sayfasına gönderir */
export function girisGerekli(locals: App.Locals, url: URL) {
	if (!locals.kullanici) {
		const donus = url.pathname + url.search;
		redirect(303, `/giris?donus=${encodeURIComponent(donus)}`);
	}
	return locals.kullanici;
}
