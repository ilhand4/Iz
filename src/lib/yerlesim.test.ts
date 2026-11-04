import { describe, expect, it } from 'vitest';
import { eksikKonumlariYerlestir, sabitAci } from './yerlesim';

describe('eksikKonumlariYerlestir', () => {
	it('hiç kayıtlı konum yoksa null döner (baştan yerleşim gerekir)', () => {
		expect(
			eksikKonumlariYerlestir(
				[
					{ id: 'a', x: null, y: null },
					{ id: 'b', x: null, y: null }
				],
				[]
			)
		).toBeNull();
	});

	it('kayıtlı konumlara dokunmaz; yeni düğümü kayıtlı komşularının yakınına koyar', () => {
		const sonuc = eksikKonumlariYerlestir(
			[
				{ id: 'a', x: 0, y: 0 },
				{ id: 'b', x: 200, y: 0 },
				{ id: 'yeni', x: null, y: null }
			],
			[
				{ kaynakId: 'a', hedefId: 'yeni' },
				{ kaynakId: 'yeni', hedefId: 'b' }
			],
			{ yaricap: 50 }
		)!;
		expect(sonuc.konumlar.get('a')).toEqual({ x: 0, y: 0 });
		expect(sonuc.yeniler).toEqual(['yeni']);
		const yeni = sonuc.konumlar.get('yeni')!;
		// Komşuların ortası (100, 0) etrafında 50 birimlik çemberde
		expect(Math.hypot(yeni.x - 100, yeni.y)).toBeCloseTo(50);
	});

	it('zincirle eklenen yeni düğümleri sırayla yerleştirir', () => {
		const sonuc = eksikKonumlariYerlestir(
			[
				{ id: 'a', x: 0, y: 0 },
				{ id: 'b', x: null, y: null },
				{ id: 'c', x: null, y: null }
			],
			[
				{ kaynakId: 'a', hedefId: 'b' },
				{ kaynakId: 'b', hedefId: 'c' }
			]
		)!;
		expect(sonuc.yeniler).toEqual(['b', 'c']);
	});

	it('bağsız yeni düğümleri haritanın sağına ızgara olarak dizer', () => {
		const sonuc = eksikKonumlariYerlestir(
			[
				{ id: 'a', x: 0, y: 0 },
				{ id: 'b', x: 100, y: 50 },
				{ id: 'y1', x: null, y: null },
				{ id: 'y2', x: null, y: null }
			],
			[],
			{ aralik: 100 }
		)!;
		expect(sonuc.konumlar.get('y1')!.x).toBeGreaterThan(100);
		expect(sonuc.konumlar.get('y1')!.y).toBe(0);
	});

	it('aynı kimlik hep aynı açıyı verir', () => {
		expect(sabitAci('düğüm-1')).toBe(sabitAci('düğüm-1'));
		expect(sabitAci('düğüm-1')).not.toBe(sabitAci('düğüm-2'));
	});
});
