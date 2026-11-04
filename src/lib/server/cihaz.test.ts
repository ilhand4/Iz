import { describe, expect, it } from 'vitest';
import { cihazAdi } from './cihaz';

describe('cihazAdi', () => {
	it('yaygın tarayıcı ve sistemleri tanır', () => {
		expect(
			cihazAdi(
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0'
			)
		).toBe('Edge · Windows');
		expect(
			cihazAdi(
				'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
			)
		).toBe('Safari · iPhone');
		expect(
			cihazAdi(
				'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
			)
		).toBe('Chrome · Android');
		expect(
			cihazAdi(
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:131.0) Gecko/20100101 Firefox/131.0'
			)
		).toBe('Firefox · macOS');
	});

	it('boş ya da tanınmayan değerler', () => {
		expect(cihazAdi(null)).toBeNull();
		expect(cihazAdi('curl/8.0')).toBe('Bilinmeyen cihaz');
	});
});
