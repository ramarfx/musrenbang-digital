import { describe, expect, test } from 'bun:test';
import type { GapItem } from '@musrenbang/shared';
import { buatCsv, siapkanGap } from './lib';

const item = (
  kategori: string,
  gap: number,
  nominal: number,
  tambahan: Partial<GapItem> = {},
): GapItem => ({
  kategori,
  persen_warga: 10,
  persen_apbd: 10 - gap,
  gap_poin_persen: gap,
  nominal_apbd: nominal,
  total_alokasi_warga: 100,
  ...tambahan,
});

/** Bentuk respons server tujuh migrasi: penanda partisipan dan ketersediaan APBD ada. */
const baru = (partisipan: number, tersedia: boolean) => ({
  jumlah_partisipan: partisipan,
  apbd_tersedia: tersedia,
});

describe('siapkanGap, urutan dan sorotan (server tujuh migrasi)', () => {
  const data = [
    item('B', 5, 1, baru(3, true)),
    item('A', -20, 1, baru(3, true)),
    item('C', 0, 0, baru(3, true)),
    item('D', 12, 1, baru(3, true)),
  ];

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

  test('apbd_tersedia benar tidak membuktikan semua kategori lengkap', () => {
    const hasil = siapkanGap(data);
    expect(hasil.statusVerifikasiServer).toBe('terverifikasi');
    expect(hasil.jumlahApbdTerverifikasi).toBe(3);
    expect(hasil.rows.length).toBe(4);
  });
});

describe('siapkanGap, jumlah partisipan', () => {
  const dengan = (partisipan: number) => [
    item('A', 5, 1, { ...baru(partisipan, true), total_alokasi_warga: 0, persen_warga: 0 }),
    item('B', -5, 1, { ...baru(partisipan, true), total_alokasi_warga: 0, persen_warga: 0 }),
  ];

  test('nol partisipan: tidak ada hasil warga, tidak ada sorotan', () => {
    const hasil = siapkanGap(dengan(0));
    expect(hasil.adaWarga).toBe(false);
    expect(hasil.teratas).toEqual([]);
    expect(hasil.sorotan).toBeUndefined();
    expect(hasil.jumlahPartisipan).toBe(0);
  });

  test('nol partisipan tidak bisa diakali oleh total alokasi yang tersisa', () => {
    const hasil = siapkanGap([item('A', 5, 1, { ...baru(0, true), total_alokasi_warga: 500 })]);
    expect(hasil.adaWarga).toBe(false);
  });

  test('satu partisipan sudah dihitung sebagai hasil warga', () => {
    const hasil = siapkanGap([item('A', 5, 1, baru(1, true))]);
    expect(hasil.adaWarga).toBe(true);
    expect(hasil.sorotan?.kategori).toBe('A');
  });

  test('beberapa partisipan: jumlah diteruskan apa adanya', () => {
    expect(siapkanGap([item('A', 5, 1, baru(7, true))]).jumlahPartisipan).toBe(7);
  });

  test('persen warga nol yang valid tetap ada saat ada partisipan', () => {
    const hasil = siapkanGap([
      item('A', -10, 1, { ...baru(4, true), persen_warga: 0 }),
      item('B', 10, 1, baru(4, true)),
    ]);
    expect(hasil.adaWarga).toBe(true);
    expect(hasil.rows.find((row) => row.kategori === 'A')?.persen_warga).toBe(0);
  });

  test('data alokasi belum lengkap: kategori tanpa alokasi tetap ikut selama ada partisipan', () => {
    const hasil = siapkanGap([
      item('A', 5, 1, { ...baru(2, true), total_alokasi_warga: 200 }),
      item('B', -5, 1, { ...baru(2, true), total_alokasi_warga: 0, persen_warga: 0 }),
    ]);
    expect(hasil.adaWarga).toBe(true);
    expect(hasil.rows.length).toBe(2);
  });
});

describe('siapkanGap, database enam migrasi tanpa penanda verifikasi', () => {
  const lama = [item('A', 5, 1_000_000), item('B', -5, 2_000_000), item('C', 0, 0)];

  test('nominal positif tidak dianggap terverifikasi', () => {
    const hasil = siapkanGap(lama);
    expect(hasil.statusVerifikasiServer).toBe('tidak_diketahui');
    expect(hasil.rows.every((row) => !row.adaApbd)).toBe(true);
    expect(hasil.jumlahApbdTerverifikasi).toBe(0);
  });

  test('tidak ada sorotan resmi walau ada pilihan warga', () => {
    const hasil = siapkanGap(lama);
    expect(hasil.adaWarga).toBe(true);
    expect(hasil.teratas).toEqual([]);
    expect(hasil.sorotan).toBeUndefined();
  });

  test('jumlah partisipan tidak tersedia, bukan dianggap nol', () => {
    const hasil = siapkanGap(lama);
    expect(hasil.jumlahPartisipan).toBeUndefined();
    expect(hasil.apbdTersedia).toBeUndefined();
  });

  test('nominal kosong tetap tidak terverifikasi', () => {
    const hasil = siapkanGap([item('C', 0, 0)]);
    expect(hasil.rows[0]?.adaApbd).toBe(false);
  });
});

describe('siapkanGap, tujuh migrasi tanpa data terverifikasi', () => {
  test('apbd_tersedia salah: tidak ada kategori yang dibandingkan', () => {
    const hasil = siapkanGap([item('A', 0, 0, baru(5, false)), item('B', 0, 0, baru(5, false))]);
    expect(hasil.statusVerifikasiServer).toBe('tidak_ada');
    expect(hasil.jumlahApbdTerverifikasi).toBe(0);
    expect(hasil.sorotan).toBeUndefined();
  });

  test('nominal yang masih terbawa tidak dibandingkan bila server bilang tidak tersedia', () => {
    const hasil = siapkanGap([item('A', 9, 5_000, baru(5, false))]);
    expect(hasil.rows[0]?.adaApbd).toBe(false);
  });
});

describe('buatCsv', () => {
  const kolom = (csv: string, baris: number) => csv.trim().split('\n')[baris]?.split(',') ?? [];

  test('tidak memuat kolom nominal alokasi warga', () => {
    const csv = buatCsv(siapkanGap([item('A', 1, 1, baru(2, true))]).rows);
    expect(csv).not.toContain('total_alokasi_warga_rp');
    expect(csv.startsWith('\uFEFFkategori,')).toBe(true);
  });

  test('nol partisipan: warga dan selisih kosong, bukan 0 atau -100', () => {
    const ringkasan = siapkanGap([
      item('A', -100, 5_000, { ...baru(0, true), persen_warga: 0, persen_apbd: 100 }),
    ]);
    const baris = kolom(buatCsv(ringkasan.rows, ringkasan.adaWarga), 1);
    expect(baris[1]).toBe('');
    expect(baris[3]).toBe('');
    expect(baris[2]).toBe('100');
  });

  test('ada partisipan: selisih nol yang valid ditulis sebagai 0, bukan kosong', () => {
    const ringkasan = siapkanGap([item('A', 0, 5_000, baru(3, true))]);
    const baris = kolom(buatCsv(ringkasan.rows, ringkasan.adaWarga), 1);
    expect(baris[3]).toBe('0');
  });

  test('ada partisipan dan selisih negatif tetap ditulis apa adanya', () => {
    const ringkasan = siapkanGap([item('A', -20, 5_000, baru(3, true))]);
    expect(kolom(buatCsv(ringkasan.rows, ringkasan.adaWarga), 1)[3]).toBe('-20');
  });

  test('APBD tidak terverifikasi: porsi, selisih, dan nominal kosong', () => {
    const ringkasan = siapkanGap([item('A', 5, 9_000)]);
    const baris = kolom(buatCsv(ringkasan.rows, ringkasan.adaWarga), 1);
    expect(baris.slice(2)).toEqual(['', '', '', 'menyusul']);
  });
});
