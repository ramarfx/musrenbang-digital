import type { GapItem } from '../schemas/gap';

export type GapDirection = 'warga_lebih_tinggi' | 'apbd_lebih_tinggi' | 'seimbang';

export function gapDirection(item: GapItem): GapDirection {
  if (item.gap_poin_persen > 0) return 'warga_lebih_tinggi';
  if (item.gap_poin_persen < 0) return 'apbd_lebih_tinggi';
  return 'seimbang';
}

/** Urutkan kategori dengan selisih absolut terbesar lebih dulu. */
export function sortGapByMagnitude(items: readonly GapItem[]): GapItem[] {
  return [...items].sort((a, b) => Math.abs(b.gap_poin_persen) - Math.abs(a.gap_poin_persen));
}

function persen(value: number): string {
  return `${value.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;
}

function poin(value: number): string {
  return Math.abs(value).toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

/**
 * Penjelasan teks otomatis untuk halaman Bandingkan. Memakai template tetap
 * agar angka yang tampil selalu bisa ditelusuri ke view v_gap.
 */
export function describeGap(item: GapItem): string {
  const arah = gapDirection(item);
  if (arah === 'seimbang') {
    return `Warga dan APBD sama-sama mengalokasikan ${persen(item.persen_warga)} untuk ${item.kategori}. Tidak ada selisih prioritas.`;
  }
  const pembanding =
    arah === 'warga_lebih_tinggi' ? 'lebih tinggi daripada APBD' : 'lebih rendah daripada APBD';
  return `Warga mengalokasikan ${persen(item.persen_warga)} untuk ${item.kategori}, sementara APBD mengalokasikan ${persen(item.persen_apbd)}. Prioritas warga ${pembanding}, dengan selisih ${poin(item.gap_poin_persen)} poin persen.`;
}
