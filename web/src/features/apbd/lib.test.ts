import { describe, expect, test } from 'bun:test';
import { rapikanSumber, statusData } from './lib';

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
