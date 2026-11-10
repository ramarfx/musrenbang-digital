import { describe, expect, test } from 'bun:test';
import { hitungUkuran } from './gambar';

describe('hitungUkuran', () => {
  test('foto yang sudah kecil tidak diperbesar', () => {
    expect(hitungUkuran(800, 600, 1280)).toEqual({ lebar: 800, tinggi: 600 });
  });

  test('foto lebar dikecilkan dengan perbandingan tetap', () => {
    expect(hitungUkuran(4000, 3000, 1280)).toEqual({ lebar: 1280, tinggi: 960 });
  });

  test('foto tegak memakai sisi tingginya', () => {
    expect(hitungUkuran(3000, 4000, 1280)).toEqual({ lebar: 960, tinggi: 1280 });
  });
});
