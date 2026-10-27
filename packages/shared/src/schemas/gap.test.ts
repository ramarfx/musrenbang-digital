import { describe, expect, test } from 'bun:test';
import { gapItemSchema } from './gap';

describe('kontrak gap lintas versi migration', () => {
  test('membaca view remote enam migration sebelum kolom baru tersedia', () => {
    const parsed = gapItemSchema.parse({
      kategori: 'Pendidikan',
      persen_warga: '50',
      persen_apbd: '40',
      gap_poin_persen: '10',
      nominal_apbd: '1000000',
      total_alokasi_warga: '500000',
    });

    expect(parsed.jumlah_partisipan).toBeUndefined();
    expect(parsed.apbd_tersedia).toBeUndefined();
  });
});
