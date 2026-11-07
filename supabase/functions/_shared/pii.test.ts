import { describe, expect, test } from 'bun:test';
import { containsPersonalData, redact } from './pii';

describe('pii', () => {
  const pribadi = [
    'hubungi saya@example.com',
    'hubungi +62 812-3456-7890',
    'hubungi saya di +6281234567890 ya',
    'nomor saya 0812-3456-7890',
    'nomor saya 0812 3456 7890',
    'nomor saya 081234567890',
    'NIK 3171 0123 4567 8901',
    'nomor 3171012345678901',
    'ktp: 12345',
  ];
  test('mengenali dan menyamarkan format umum', () => {
    for (const teks of pribadi) {
      expect(containsPersonalData(teks)).toBe(true);
      expect(containsPersonalData(redact(teks))).toBe(false);
    }
  });
  test('tidak menyentuh angka biasa', () => {
    for (const teks of [
      'Biaya Rp 450.000.000',
      'RW 05 Tebet',
      'tahun 2025',
      'sepanjang 1,2 km',
      '0,8 juta',
    ]) {
      expect(containsPersonalData(teks)).toBe(false);
      expect(redact(teks)).toBe(teks);
    }
  });
  test('aman dipanggil berulang (tanpa status regex global)', () => {
    expect(containsPersonalData('0812-3456-7890')).toBe(true);
    expect(containsPersonalData('0812-3456-7890')).toBe(true);
  });
});
