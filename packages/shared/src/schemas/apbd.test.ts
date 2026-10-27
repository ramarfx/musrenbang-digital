import { describe, expect, test } from 'bun:test';
import { apbdInputSchema, apbdItemSchema, apbdSeedSchema } from './apbd';

const itemValid = {
  kategori: 'Pendidikan',
  nominal_rp: 1_000_000,
  tahun: 2026,
  kota: 'DKI Jakarta',
  sumber: 'Lampiran resmi APBD',
  status_verifikasi: 'verified_program' as const,
  sumber_url: 'https://example.go.id/apbd-2026.pdf',
  catatan_pemetaan: 'Rincian program dipetakan ke Pendidikan.',
};

describe('kontrak provenance APBD', () => {
  test('membaca row lama sebelum kolom provenance tersedia', () => {
    const legacyRow = {
      id: 1,
      kategori: itemValid.kategori,
      nominal_rp: itemValid.nominal_rp,
      tahun: itemValid.tahun,
      kota: itemValid.kota,
      sumber: itemValid.sumber,
      status_verifikasi: itemValid.status_verifikasi,
      dibuat_pada: '2026-10-27T00:00:00.000Z',
      diubah_pada: '2026-10-27T00:00:00.000Z',
    };
    const parsed = apbdItemSchema.parse(legacyRow);
    expect(parsed.sumber_url).toBeNull();
    expect(parsed.catatan_pemetaan).toBeNull();
  });

  test('menerima item terverifikasi jika sumber tertaut', () => {
    expect(apbdInputSchema.safeParse(itemValid).success).toBe(true);
  });

  test('item terverifikasi wajib memiliki tautan sumber dan sumber teks', () => {
    expect(apbdInputSchema.safeParse({ ...itemValid, sumber_url: null }).success).toBe(false);
    expect(apbdInputSchema.safeParse({ ...itemValid, sumber: '   ' }).success).toBe(false);
  });

  test('item yang perlu lampiran boleh belum memiliki URL sumber', () => {
    expect(
      apbdInputSchema.safeParse({
        ...itemValid,
        status_verifikasi: 'perlu_lampiran',
        sumber_url: null,
      }).success,
    ).toBe(true);
  });

  test('seed mempertahankan catatan pemetaan yang ada di CSV', () => {
    const parsed = apbdSeedSchema.parse({
      ...itemValid,
      status_verifikasi: 'perlu_lampiran',
      sumber_url: null,
    });
    expect(parsed.catatan_pemetaan).toBe(itemValid.catatan_pemetaan);
  });
});
