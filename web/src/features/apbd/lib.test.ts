import { describe, expect, test } from 'bun:test';
import type { ApbdItem } from '@musrenbang/shared';
import { rapikanSumber, statusData, sumberKategori } from './lib';

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
