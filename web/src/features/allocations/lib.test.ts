import { describe, expect, test } from 'bun:test';
import { allocateByWeights } from './lib';

describe('allocateByWeights', () => {
  const kategori = ['A', 'B', 'C'];

  test('total hasil selalu sama dengan anggaran', () => {
    const hasil = allocateByWeights(kategori, { A: 3, B: 2, C: 1 }, 10_000_000, 50_000);
    expect(Object.values(hasil ?? {}).reduce((a, b) => a + b, 0)).toBe(10_000_000);
  });

  test('poin lebih besar mendapat bagian lebih besar', () => {
    const hasil = allocateByWeights(kategori, { A: 3, B: 2, C: 1 }, 10_000_000, 50_000);
    expect(hasil!.A).toBeGreaterThan(hasil!.B);
    expect(hasil!.B).toBeGreaterThan(hasil!.C);
  });

  test('semua bobot nol tidak menghasilkan pembagian palsu', () => {
    expect(allocateByWeights(kategori, { A: 0, B: 0, C: 0 }, 10_000_000, 50_000)).toBeNull();
  });
});
