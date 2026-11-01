import { describe, expect, test } from 'bun:test';
import { kalimatTahap, tahapSekarang } from './jadwal';

const tanggal = (bulan: number) => new Date(2026, bulan, 15);

describe('tahapSekarang', () => {
  test('Januari sampai April mengikuti tahap Musrenbang', () => {
    expect(tahapSekarang(tanggal(0))).toBe(0);
    expect(tahapSekarang(tanggal(1))).toBe(1);
    expect(tahapSekarang(tanggal(2))).toBe(2);
    expect(tahapSekarang(tanggal(3))).toBe(2);
  });

  test('Mei sampai Desember masuk pembahasan APBD', () => {
    expect(tahapSekarang(tanggal(4))).toBe(3);
    expect(tahapSekarang(tanggal(10))).toBe(3);
    expect(tahapSekarang(tanggal(11))).toBe(3);
  });
});

describe('kalimatTahap', () => {
  test('menyebut tahun APBD berikutnya', () => {
    expect(kalimatTahap(tanggal(1))).toBe('Musrenbang kecamatan untuk APBD 2027 sedang berjalan.');
    expect(kalimatTahap(tanggal(10))).toContain('APBD 2027');
  });
});
