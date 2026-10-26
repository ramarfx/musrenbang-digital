import type { GapItem } from '@musrenbang/shared';

/** Baris gap dengan penanda apakah APBD untuk kategori itu sudah terisi. */
export type GapRow = GapItem & { adaApbd: boolean };

export type GapRingkasan = {
  /** Urut selisih terbesar dulu; kategori tanpa data APBD di paling bawah. */
  rows: GapRow[];
  /** Kategori dengan selisih terbesar. Kosong bila belum ada pilihan warga. */
  sorotan: GapRow | undefined;
  /** Jumlah nominal APBD yang terpetakan, bukan total belanja daerah. */
  totalApbd: number;
  adaWarga: boolean;
  /** Selisih absolut terbesar, untuk skala bar (minimal 1). */
  maks: number;
};

/**
 * Menyiapkan data v_gap untuk ditampilkan. Kategori yang nominal APBD-nya masih 0
 * ("data menyusul") tidak ikut dibandingkan: selisihnya hanya akan mencerminkan
 * data yang belum ada, bukan prioritas.
 */
export function siapkanGap(items: readonly GapItem[]): GapRingkasan {
  const rows: GapRow[] = items.map((item) => ({ ...item, adaApbd: item.nominal_apbd > 0 }));
  const berdata = rows
    .filter((row) => row.adaApbd)
    .sort((a, b) => Math.abs(b.gap_poin_persen) - Math.abs(a.gap_poin_persen));
  const menyusul = rows.filter((row) => !row.adaApbd);
  const adaWarga = rows.some((row) => row.total_alokasi_warga > 0);
  return {
    rows: [...berdata, ...menyusul],
    sorotan: adaWarga ? berdata[0] : undefined,
    totalApbd: rows.reduce((sum, row) => sum + row.nominal_apbd, 0),
    adaWarga,
    maks: Math.max(1, ...berdata.map((row) => Math.abs(row.gap_poin_persen))),
  };
}

/** Nilai rupiah yang setara dengan selisih poin terhadap APBD yang terpetakan. */
export function setaraRupiah(item: GapItem, totalApbd: number): number {
  return (Math.abs(item.gap_poin_persen) / 100) * totalApbd;
}

/** Rupiah besar dalam satuan yang mudah dibaca, mis. "Rp3,5 T" atau "Rp820 M". */
export function formatBesarSingkat(nilai: number): string {
  if (nilai >= 1e12)
    return `Rp${(nilai / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 1 })} T`;
  if (nilai >= 1e9)
    return `Rp${(nilai / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  if (nilai >= 1e6)
    return `Rp${(nilai / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  return `Rp${Math.round(nilai).toLocaleString('id-ID')}`;
}

/** Versi panjang untuk kalimat, mis. "Rp3,5 triliun". */
export function formatBesarPanjang(nilai: number): string {
  return formatBesarSingkat(nilai)
    .replace(' T', ' triliun')
    .replace(' M', ' miliar')
    .replace(' jt', ' juta');
}

/** CSV untuk diunduh. Diawali BOM supaya Excel membaca UTF-8 dengan benar. */
export function buatCsv(rows: readonly GapRow[]): string {
  const kepala = [
    'kategori',
    'warga_persen',
    'apbd_persen',
    'selisih_poin',
    'nominal_apbd_rp',
    'total_alokasi_warga_rp',
    'data_apbd',
  ];
  const baris = rows.map((row) =>
    [
      `"${row.kategori.replace(/"/g, '""')}"`,
      row.persen_warga,
      row.persen_apbd,
      row.adaApbd ? row.gap_poin_persen : '',
      row.nominal_apbd,
      row.total_alokasi_warga,
      row.adaApbd ? 'ada' : 'menyusul',
    ].join(','),
  );
  return `﻿${[kepala.join(','), ...baris].join('\n')}\n`;
}
