import { describe, expect, test } from 'bun:test';
import { angkaTengah, parseSaranBiaya, saranBiayaGalat } from './costHintContract';

const valid = {
  min: 80_000_000,
  max: 150_000_000,
  alasan: 'Perkiraan untuk pekerjaan skala kecil.',
  label: 'Perkiraan AI, bukan angka resmi.',
};

describe('saran biaya MusrenAI', () => {
  test('menerima rentang yang benar', () => {
    expect(parseSaranBiaya(valid)).toEqual(valid);
  });

  test('menolak rentang terbalik, sama, atau bukan bilangan bulat', () => {
    expect(() => parseSaranBiaya({ ...valid, min: 150_000_000, max: 80_000_000 })).toThrow();
    expect(() => parseSaranBiaya({ ...valid, min: 1_000_000, max: 1_000_000 })).toThrow();
    expect(() => parseSaranBiaya({ ...valid, min: 1.5 })).toThrow();
  });

  test('menolak respons kosong atau berisi galat', () => {
    expect(() => parseSaranBiaya({ error: 'Saran biaya sementara tidak tersedia.' })).toThrow();
    expect(() => parseSaranBiaya(null)).toThrow();
  });

  test('angka tengah dibulatkan ke ratusan ribu dan minimal 1', () => {
    expect(angkaTengah(valid)).toBe(115_000_000);
    expect(angkaTengah({ min: 100_000, max: 250_000 })).toBe(200_000);
    expect(angkaTengah({ min: 1, max: 2 })).toBe(1);
  });

  test('pesan galat tidak membocorkan detail server', () => {
    for (const status of [0, 400, 401, 403, 429, 500, 503]) {
      expect(saranBiayaGalat(status)).not.toMatch(/supabase|gemini|stack|undefined/i);
    }
  });
});
