import { describe, expect, test } from 'bun:test';
import {
  proposalInputSchema,
  proposalModerationInputSchema,
  proposalModerationSchema,
  proposalStatusSchema,
} from './proposal';

const usulanValid = {
  judul: 'Perbaikan trotoar Jl. Melati',
  deskripsi: 'Trotoar rusak dan berlubang sehingga pejalan kaki berisiko jatuh saat musim hujan.',
  kategori: 'Infrastruktur dan Jalan',
  lokasi: 'Jl. Melati, Jakarta Selatan',
  latitude: -6.2,
  longitude: 106.8,
  estimasi_biaya: 150_000_000,
};

describe('proposalInputSchema', () => {
  test('menerima usulan lengkap', () => {
    const result = proposalInputSchema.safeParse(usulanValid);
    expect(result.success).toBe(true);
  });

  test('menolak judul terlalu pendek', () => {
    const result = proposalInputSchema.safeParse({ ...usulanValid, judul: 'Pendek' });
    expect(result.success).toBe(false);
  });

  test('menolak koordinat yang hanya diisi sebagian', () => {
    const result = proposalInputSchema.safeParse({ ...usulanValid, longitude: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('latitude'))).toBe(true);
    }
  });

  test('menerima usulan tanpa titik lokasi', () => {
    const result = proposalInputSchema.safeParse({
      ...usulanValid,
      latitude: null,
      longitude: null,
    });
    expect(result.success).toBe(true);
  });

  test('menolak estimasi negatif', () => {
    const result = proposalInputSchema.safeParse({ ...usulanValid, estimasi_biaya: -1 });
    expect(result.success).toBe(false);
  });
});

describe('proposalStatusSchema', () => {
  test('hanya menerima lima tahap resmi', () => {
    expect(proposalStatusSchema.safeParse('Diverifikasi').success).toBe(true);
    expect(proposalStatusSchema.safeParse('Dibatalkan').success).toBe(false);
  });
});

describe('moderasi usulan', () => {
  test('moderasi terpisah dari tahapan kemajuan', () => {
    for (const moderasi of ['Menunggu', 'Disetujui', 'Ditolak']) {
      expect(proposalModerationSchema.safeParse(moderasi).success).toBe(true);
      expect(proposalStatusSchema.safeParse(moderasi).success).toBe(false);
    }
    expect(proposalModerationSchema.safeParse('Selesai').success).toBe(false);
  });

  test('penolakan memerlukan alasan yang bukan spasi', () => {
    for (const catatan of [undefined, null, '', '   ']) {
      expect(
        proposalModerationInputSchema.safeParse({ proposalId: 1, moderasi: 'Ditolak', catatan })
          .success,
      ).toBe(false);
    }
    expect(
      proposalModerationInputSchema.parse({
        proposalId: 1,
        moderasi: 'Ditolak',
        catatan: '  Usulan duplikat.  ',
      }).catatan,
    ).toBe('Usulan duplikat.');
  });

  test('persetujuan tidak wajib catatan dan menolak catatan terlalu panjang', () => {
    expect(
      proposalModerationInputSchema.safeParse({ proposalId: 1, moderasi: 'Disetujui' }).success,
    ).toBe(true);
    expect(
      proposalModerationInputSchema.safeParse({
        proposalId: 1,
        moderasi: 'Disetujui',
        catatan: 'a'.repeat(2_001),
      }).success,
    ).toBe(false);
  });
});
