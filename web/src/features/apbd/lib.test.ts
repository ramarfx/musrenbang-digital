import { describe, expect, test } from 'bun:test';
import type { ApbdItem } from '@musrenbang/shared';
import { porsiKategori, rapikanSumber, statusData, statusKategori, sumberKategori } from './lib';

describe('statusData', () => {
  test('tanpa nominal berarti data belum ada, apa pun statusnya', () => {
    expect(
      statusData({
        nominal_rp: 0,
        status_verifikasi: 'verified_program',
        sumber_url: 'https://a.id',
      }),
    ).toBe('kosong');
  });

  test('terverifikasi hanya bila status verified_program dan ada tautan sumber', () => {
    expect(
      statusData({
        nominal_rp: 10,
        status_verifikasi: 'verified_program',
        sumber_url: 'https://a.id',
      }),
    ).toBe('terverifikasi');
    expect(
      statusData({ nominal_rp: 10, status_verifikasi: 'verified_program', sumber_url: null }),
    ).toBe('belum_terverifikasi');
  });

  test('perlu lampiran dengan angka tetap belum terverifikasi', () => {
    expect(
      statusData({ nominal_rp: 10, status_verifikasi: 'perlu_lampiran', sumber_url: null }),
    ).toBe('belum_terverifikasi');
  });
});

describe('rapikanSumber', () => {
  test('mengganti tanda strip panjang jadi koma', () => {
    expect(rapikanSumber('detiksatu.com (2025) \u2014 fungsi pendidikan')).toBe(
      'detiksatu.com (2025), fungsi pendidikan',
    );
  });

  test('isi kosong atau hanya tanda strip dianggap tidak ada', () => {
    expect(rapikanSumber('\u2014')).toBeNull();
    expect(rapikanSumber('  ')).toBeNull();
    expect(rapikanSumber(null)).toBeNull();
  });
});

describe('sumberKategori', () => {
  const baris = (id: number, tambahan: Partial<ApbdItem> = {}): ApbdItem => ({
    id,
    kategori: 'Pendidikan',
    nominal_rp: 100,
    tahun: 2026,
    kota: 'DKI Jakarta',
    sumber: `Sumber ${id}`,
    sumber_url: `https://contoh.id/${id}`,
    catatan_pemetaan: null,
    status_verifikasi: 'verified_program',
    dibuat_pada: '2026-10-26T00:00:00+07:00',
    diubah_pada: '2026-10-26T00:00:00+07:00',
    ...tambahan,
  });
  const konfigurasi = { kota: 'DKI Jakarta', tahun: 2026 };

  test('beberapa baris satu kategori: semuanya terverifikasi diambil, bukan hanya yang pertama', () => {
    const hasil = sumberKategori([baris(1), baris(2)], 'Pendidikan', konfigurasi);
    expect(hasil.terverifikasi.map((item) => item.id)).toEqual([1, 2]);
  });

  test('tahun berbeda tidak ikut agregat', () => {
    const hasil = sumberKategori([baris(1, { tahun: 2025 }), baris(2)], 'Pendidikan', konfigurasi);
    expect(hasil.terverifikasi.map((item) => item.id)).toEqual([2]);
  });

  test('kota berbeda tidak ikut agregat', () => {
    const hasil = sumberKategori(
      [baris(1, { kota: 'Bandung' }), baris(2)],
      'Pendidikan',
      konfigurasi,
    );
    expect(hasil.terverifikasi.map((item) => item.id)).toEqual([2]);
  });

  test('terverifikasi dan belum terverifikasi dipisahkan', () => {
    const hasil = sumberKategori(
      [baris(1), baris(2, { status_verifikasi: 'perlu_lampiran', sumber_url: null })],
      'Pendidikan',
      konfigurasi,
    );
    expect(hasil.terverifikasi.map((item) => item.id)).toEqual([1]);
    expect(hasil.belumTerverifikasi.map((item) => item.id)).toEqual([2]);
  });

  test('tidak ada sumber yang valid', () => {
    const hasil = sumberKategori([baris(1, { nominal_rp: 0 })], 'Pendidikan', konfigurasi);
    expect(hasil.terverifikasi).toEqual([]);
    expect(hasil.belumTerverifikasi).toEqual([]);
  });

  test('tanpa konfigurasi sumber tidak bisa dipastikan, jadi kosong', () => {
    const hasil = sumberKategori([baris(1)], 'Pendidikan', undefined);
    expect(hasil.terverifikasi).toEqual([]);
  });

  test('kategori lain diabaikan', () => {
    const hasil = sumberKategori([baris(1, { kategori: 'Kesehatan' })], 'Pendidikan', konfigurasi);
    expect(hasil.terverifikasi).toEqual([]);
  });
});

describe('statusKategori', () => {
  const baris = (id: number, tambahan: Partial<ApbdItem> = {}): ApbdItem => ({
    id,
    kategori: 'Pendidikan',
    nominal_rp: 100,
    tahun: 2026,
    kota: 'DKI Jakarta',
    sumber: `Sumber ${id}`,
    sumber_url: `https://contoh.id/${id}`,
    catatan_pemetaan: null,
    status_verifikasi: 'verified_program',
    dibuat_pada: '2026-10-26T00:00:00+07:00',
    diubah_pada: '2026-10-26T00:00:00+07:00',
    ...tambahan,
  });
  const belum = { status_verifikasi: 'perlu_lampiran' as const, sumber_url: null };
  const konfigurasi = { kota: 'DKI Jakarta', tahun: 2026 };

  test('hasil tidak bergantung pada urutan baris', () => {
    const a = statusKategori([baris(1), baris(2, belum)], 'Pendidikan', konfigurasi);
    const b = statusKategori([baris(2, belum), baris(1)], 'Pendidikan', konfigurasi);
    expect(a).toBe('sebagian');
    expect(b).toBe('sebagian');
  });

  test('satu baris terverifikasi tidak membuat kategori terverifikasi', () => {
    expect(statusKategori([baris(1), baris(2, belum)], 'Pendidikan', konfigurasi)).not.toBe(
      'terverifikasi',
    );
  });

  test('semua baris terverifikasi: terverifikasi', () => {
    expect(statusKategori([baris(1), baris(2)], 'Pendidikan', konfigurasi)).toBe('terverifikasi');
  });

  test('tidak ada baris terverifikasi: belum terverifikasi', () => {
    expect(statusKategori([baris(1, belum), baris(2, belum)], 'Pendidikan', konfigurasi)).toBe(
      'belum_terverifikasi',
    );
  });

  test('baris tahun atau kota lain diabaikan', () => {
    const lain = [baris(1, { tahun: 2025 }), baris(2, { kota: 'Bandung' }), baris(3, belum)];
    expect(statusKategori(lain, 'Pendidikan', konfigurasi)).toBe('belum_terverifikasi');
  });

  test('baris tanpa nominal tidak dihitung', () => {
    const hasil = statusKategori(
      [baris(1), baris(2, { nominal_rp: 0 })],
      'Pendidikan',
      konfigurasi,
    );
    expect(hasil).toBe('terverifikasi');
  });

  test('tanpa baris relevan atau tanpa konfigurasi: kosong', () => {
    expect(statusKategori([], 'Pendidikan', konfigurasi)).toBe('kosong');
    expect(statusKategori([baris(1)], 'Pendidikan', undefined)).toBe('kosong');
    expect(statusKategori([baris(1)], 'Kesehatan', konfigurasi)).toBe('kosong');
  });
});

describe('porsiKategori', () => {
  const baris = (
    id: number,
    kategori: string,
    nominal: number,
    tambahan: Partial<ApbdItem> = {},
  ): ApbdItem => ({
    id,
    kategori,
    nominal_rp: nominal,
    tahun: 2026,
    kota: 'DKI Jakarta',
    sumber: `Sumber ${id}`,
    sumber_url: `https://contoh.id/${id}`,
    catatan_pemetaan: null,
    status_verifikasi: 'verified_program',
    dibuat_pada: '2026-10-26T00:00:00+07:00',
    diubah_pada: '2026-10-26T00:00:00+07:00',
    ...tambahan,
  });
  const belum = { status_verifikasi: 'perlu_lampiran' as const, sumber_url: null };

  test('porsi dihitung dari nominal terverifikasi, urut terbesar, totalnya 100%', () => {
    const hasil = porsiKategori([baris(1, 'A', 300), baris(2, 'B', 100), baris(3, 'C', 600)]);
    expect(hasil.rows.map((row) => row.kategori)).toEqual(['C', 'A', 'B']);
    expect(hasil.total).toBe(1000);
    expect(hasil.rows.map((row) => row.persen)).toEqual([60, 30, 10]);
    expect(hasil.belum).toEqual([]);
  });

  test('kategori belum terverifikasi tidak dijumlahkan, tetapi tetap disebut', () => {
    const hasil = porsiKategori([baris(1, 'A', 400), baris(2, 'B', 900, belum)]);
    expect(hasil.rows.map((row) => row.kategori)).toEqual(['A']);
    expect(hasil.total).toBe(400);
    expect(hasil.rows[0]?.persen).toBe(100);
    expect(hasil.belum).toEqual(['B']);
  });

  test('baris tanpa nominal tidak muncul sebagai porsi', () => {
    const hasil = porsiKategori([baris(1, 'A', 0), baris(2, 'B', 0, belum)]);
    expect(hasil.rows).toEqual([]);
    expect(hasil.total).toBe(0);
    expect(hasil.belum).toEqual(['A', 'B']);
  });

  test('seri diurutkan menurut nama kategori supaya tampilannya tetap', () => {
    const hasil = porsiKategori([baris(1, 'B', 100), baris(2, 'A', 100)]);
    expect(hasil.rows.map((row) => row.kategori)).toEqual(['A', 'B']);
  });

  test('kategori resmi yang belum punya baris ikut disebut belum, bukan hilang', () => {
    const hasil = porsiKategori([baris(1, 'A', 100)], ['A', 'B', 'C']);
    expect(hasil.belum).toEqual(['B', 'C']);
  });
});
