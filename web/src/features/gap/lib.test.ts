import { describe, expect, test } from 'bun:test';
import type { GapItem } from '@musrenbang/shared';
import { buatCsv, siapkanGap } from './lib';

const item = (kategori: string, gap: number, nominal: number, warga = 100): GapItem => ({
  kategori,
  persen_warga: 10,
  persen_apbd: 10 - gap,
  gap_poin_persen: gap,
  nominal_apbd: nominal,
  total_alokasi_warga: warga,
});

describe('siapkanGap', () => {
  const data = [item('B', 5, 1), item('A', -20, 1), item('C', 0, 0), item('D', 12, 1)];

  test('urutan bawaan mengikuti urutan simulator yang diberikan', () => {
    const hasil = siapkanGap(data, ['A', 'B', 'C', 'D']);
    expect(hasil.rows.map((row) => row.kategori)).toEqual(['A', 'B', 'C', 'D']);
  });

  test('urutan menurut selisih menaruh kategori tanpa APBD di bawah', () => {
    const hasil = siapkanGap(data, ['A', 'B', 'C', 'D']);
    expect(hasil.rowsSelisih.map((row) => row.kategori)).toEqual(['A', 'D', 'B', 'C']);
  });

  test('tiga sorotan diambil dari selisih absolut terbesar yang punya data APBD', () => {
    const hasil = siapkanGap(data, []);
    expect(hasil.teratas.map((row) => row.kategori)).toEqual(['A', 'D', 'B']);
    expect(hasil.sorotan?.kategori).toBe('A');
  });

  test('tanpa pilihan warga tidak ada sorotan', () => {
    const hasil = siapkanGap([item('A', -5, 1, 0), item('B', 5, 1, 0)], []);
    expect(hasil.teratas).toEqual([]);
    expect(hasil.sorotan).toBeUndefined();
  });

  test('jumlah partisipan dan ketersediaan APBD diteruskan, dan boleh kosong', () => {
    expect(
      siapkanGap([{ ...data[0], jumlah_partisipan: 7, apbd_tersedia: true }]).jumlahPartisipan,
    ).toBe(7);
    const lama = siapkanGap(data);
    expect(lama.jumlahPartisipan).toBeUndefined();
    expect(lama.apbdTersedia).toBeUndefined();
  });

  test('apbd_tersedia benar tidak membuktikan semua kategori lengkap', () => {
    const hasil = siapkanGap(data.map((row) => ({ ...row, apbd_tersedia: true })));
    expect(hasil.apbdTersedia).toBe(true);
    expect(hasil.jumlahApbdTerverifikasi).toBe(3);
    expect(hasil.rows.length).toBe(4);
  });
});

describe('buatCsv', () => {
  test('tidak memuat kolom nominal alokasi warga', () => {
    const csv = buatCsv(siapkanGap([item('A', 1, 1)]).rows);
    expect(csv).not.toContain('total_alokasi_warga_rp');
    expect(csv.startsWith('\uFEFFkategori,')).toBe(true);
  });
});
