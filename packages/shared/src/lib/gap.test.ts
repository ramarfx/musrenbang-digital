import { describe, expect, test } from 'bun:test';
import { describeGap, gapDirection, sortGapByMagnitude } from './gap';
import type { GapItem } from '../schemas/gap';

const item = (kategori: string, gap: number): GapItem => ({
  kategori,
  persen_warga: 30,
  persen_apbd: 30 - gap,
  gap_poin_persen: gap,
  nominal_apbd: 1_000_000_000,
  total_alokasi_warga: 500_000,
});

describe('sortGapByMagnitude', () => {
  test('mengurutkan berdasarkan selisih absolut terbesar', () => {
    const result = sortGapByMagnitude([
      item('Kecil', 2),
      item('Negatif besar', -12),
      item('Sedang', 7),
    ]);
    expect(result.map((row) => row.kategori)).toEqual(['Negatif besar', 'Sedang', 'Kecil']);
  });

  test('tidak mengubah array asli', () => {
    const input = [item('A', 1), item('B', 5)];
    sortGapByMagnitude(input);
    expect(input.map((row) => row.kategori)).toEqual(['A', 'B']);
  });
});

describe('gapDirection dan describeGap', () => {
  test('mengenali arah gap', () => {
    expect(gapDirection(item('A', 3))).toBe('warga_lebih_tinggi');
    expect(gapDirection(item('A', -3))).toBe('apbd_lebih_tinggi');
    expect(gapDirection(item('A', 0))).toBe('seimbang');
  });

  test('menjelaskan gap positif dengan angka yang bisa ditelusuri', () => {
    const teks = describeGap(item('Pendidikan', 17.85));
    expect(teks).toContain('Pendidikan');
    expect(teks).toContain('lebih tinggi daripada APBD');
    expect(teks).toContain('17,85');
  });

  test('menjelaskan gap negatif', () => {
    const teks = describeGap(item('Transportasi Publik', -8));
    expect(teks).toContain('lebih rendah daripada APBD');
  });
});
