import { describe, expect, test } from 'bun:test';
import { adminStatsSchema, publicStatsSchema } from './stats';

describe('kontrak statistik', () => {
  test('membaca nilai bigint PostgREST dalam bentuk string', () => {
    const parsed = publicStatsSchema.parse({
      jumlah_usulan_disetujui: '8',
      jumlah_pemberi_suara: '12',
      jumlah_partisipan_alokasi: '4',
      total_alokasi_warga: '40000000',
    });

    expect(parsed.total_alokasi_warga).toBe(40_000_000);
  });

  test('memerlukan semua status tahap dan moderasi pada statistik admin', () => {
    const parsed = adminStatsSchema.parse({
      total_pengguna: '15',
      total_usulan: 9,
      usulan_per_status: {
        Diajukan: '3',
        Diverifikasi: 2,
        'Masuk APBD': 1,
        Dikerjakan: 2,
        Selesai: 1,
      },
      usulan_per_moderasi: {
        Menunggu: 4,
        Disetujui: 4,
        Ditolak: 1,
      },
      total_suara: 20,
      jumlah_partisipan_alokasi: 5,
      total_alokasi_warga: '50000000',
    });

    expect(parsed.total_pengguna).toBe(15);
    expect(parsed.usulan_per_status['Masuk APBD']).toBe(1);
  });

  test('menolak jumlah negatif dan objek status yang tidak lengkap', () => {
    expect(
      publicStatsSchema.safeParse({
        jumlah_usulan_disetujui: -1,
        jumlah_pemberi_suara: 0,
        jumlah_partisipan_alokasi: 0,
        total_alokasi_warga: 0,
      }).success,
    ).toBe(false);
    expect(
      adminStatsSchema.safeParse({
        total_pengguna: 0,
        total_usulan: 0,
        usulan_per_status: { Diajukan: 0 },
        usulan_per_moderasi: { Menunggu: 0 },
        total_suara: 0,
        jumlah_partisipan_alokasi: 0,
        total_alokasi_warga: 0,
      }).success,
    ).toBe(false);
  });
});
