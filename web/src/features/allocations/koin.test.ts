import { describe, expect, test } from 'bun:test';
import { bagiRata, koinKeAlokasi, muatDariAlokasi, sisaKoin, totalKoin, ubahKoin } from './koin';

const semua = ['A', 'B', 'C', 'D', 'E'];

describe('bagiRata', () => {
  test('membagi sepuluh koin rata dan sisanya ke bidang pertama', () => {
    expect(bagiRata(['A', 'B', 'C'])).toEqual({ A: 4, B: 3, C: 3 });
    expect(totalKoin(bagiRata(['A', 'B']))).toBe(10);
  });
  test('tanpa pilihan tidak membagi apa pun', () => {
    expect(bagiRata([])).toEqual({});
  });
});

describe('ubahKoin', () => {
  test('tidak melewati sisa koin dan tidak di bawah nol', () => {
    const awal = { A: 4, B: 3, C: 3 };
    expect(ubahKoin(awal, 'A', 1).A).toBe(4);
    expect(ubahKoin(awal, 'A', -9).A).toBe(0);
    expect(sisaKoin(ubahKoin(awal, 'B', -2))).toBe(2);
  });
  test('koin yang dikurangi bisa ditambahkan ke bidang lain', () => {
    const kurang = ubahKoin({ A: 4, B: 3, C: 3 }, 'A', -1);
    expect(ubahKoin(kurang, 'B', 1)).toEqual({ A: 3, B: 4, C: 3 });
  });
});

describe('koinKeAlokasi', () => {
  test('total sama dengan anggaran, kelipatan terjaga, bidang lain nol', () => {
    const hasil = koinKeAlokasi(semua, { A: 5, B: 3, C: 2 }, 10_000_000, 100_000);
    expect(hasil.find((item) => item.kategori === 'A')?.jumlah).toBe(5_000_000);
    expect(hasil.find((item) => item.kategori === 'D')?.jumlah).toBe(0);
    expect(hasil.reduce((jumlah, item) => jumlah + item.jumlah, 0)).toBe(10_000_000);
    expect(hasil.every((item) => item.jumlah % 100_000 === 0)).toBe(true);
  });
  test('tanpa koin semua bidang bernilai nol', () => {
    expect(koinKeAlokasi(semua, {}, 10_000_000, 100_000).every((item) => item.jumlah === 0)).toBe(
      true,
    );
  });
});

describe('muatDariAlokasi', () => {
  test('mengubah alokasi tiga bidang jadi pilihan dan koin berjumlah sepuluh', () => {
    const hasil = muatDariAlokasi(
      [
        { kategori: 'B', jumlah: 3_000_000 },
        { kategori: 'A', jumlah: 5_000_000 },
        { kategori: 'C', jumlah: 2_000_000 },
      ],
      semua,
    );
    expect(hasil?.pilihan).toEqual(['A', 'B', 'C']);
    expect(hasil?.koin).toEqual({ A: 5, B: 3, C: 2 });
  });
  test('alokasi lama yang menyebar ke lebih dari tiga bidang dimulai dari awal', () => {
    const banyak = semua.slice(0, 4).map((kategori) => ({ kategori, jumlah: 1_000_000 }));
    expect(muatDariAlokasi(banyak, semua)).toBeNull();
  });
  test('tanpa alokasi tersimpan tidak ada yang dimuat', () => {
    expect(muatDariAlokasi([], semua)).toBeNull();
    expect(muatDariAlokasi([{ kategori: 'A', jumlah: 0 }], semua)).toBeNull();
  });
});
