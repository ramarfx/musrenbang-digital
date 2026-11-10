import type { GapItem } from '@musrenbang/shared';

/** Baris gap dengan penanda apakah APBD untuk kategori itu sudah terisi. */
export type GapRow = GapItem & { adaApbd: boolean };

export type GapRingkasan = {
  /** Urutan kategori sama dengan simulator (PRD: urutan seragam di semua tampilan). */
  rows: GapRow[];
  /** Urut selisih terbesar dulu; kategori tanpa data APBD di paling bawah. */
  rowsSelisih: GapRow[];
  /** Tiga kategori dengan selisih terbesar. Kosong bila belum ada pilihan warga. */
  teratas: GapRow[];
  /** Kategori dengan selisih terbesar. Kosong bila belum ada pilihan warga. */
  sorotan: GapRow | undefined;
  /** Jumlah nominal APBD yang terpetakan, bukan total belanja daerah. */
  totalApbd: number;
  adaWarga: boolean;
  /** Selisih absolut terbesar, untuk skala bar (minimal 1). */
  maks: number;
  /** Jumlah warga yang sudah mengisi simulator. Kosong bila server belum menyediakannya. */
  jumlahPartisipan: number | undefined;
  /**
   * Apakah server membuktikan status verifikasi APBD. Pada database enam migration kolom
   * `apbd_tersedia` tidak ada: nominal positif di sana bukan bukti terverifikasi, jadi tidak
   * ada kategori yang dibandingkan dan angkanya tidak disebut resmi.
   */
  statusVerifikasiServer: 'terverifikasi' | 'tidak_ada' | 'tidak_diketahui';
  /**
   * Apakah ada data APBD terverifikasi sama sekali. Kosong bila server belum menyediakannya.
   * Nilai true bukan bukti semua kategori lengkap: lihat `jumlahApbdTerverifikasi`.
   */
  apbdTersedia: boolean | undefined;
  /** Berapa kategori yang punya angka APBD terverifikasi (ikut dibandingkan). */
  jumlahApbdTerverifikasi: number;
};

/**
 * Menyiapkan data v_gap untuk ditampilkan. Kategori yang nominal APBD-nya masih 0
 * ("data menyusul") tidak ikut dibandingkan: selisihnya hanya akan mencerminkan
 * data yang belum ada, bukan prioritas.
 */
export function siapkanGap(
  items: readonly GapItem[],
  /** Urutan kategori di simulator. Kalau kosong, baris diurutkan menurut selisih. */
  urutanKategori: readonly string[] = [],
): GapRingkasan {
  const apbdTersedia = items[0]?.apbd_tersedia;
  const jumlahPartisipan = items[0]?.jumlah_partisipan;
  // Hanya server migrasi 7 yang membatasi APBD ke item terverifikasi, dan menandainya lewat
  // `apbd_tersedia`. Tanpa penanda itu, nominal positif tidak boleh dianggap terverifikasi.
  const apbdTerbukti = apbdTersedia === true;
  const semua: GapRow[] = items.map((item) => ({
    ...item,
    adaApbd: apbdTerbukti && item.nominal_apbd > 0,
  }));
  const berdata = semua
    .filter((row) => row.adaApbd)
    .sort((a, b) => Math.abs(b.gap_poin_persen) - Math.abs(a.gap_poin_persen));
  const menyusul = semua.filter((row) => !row.adaApbd);
  // Nol partisipan berarti belum ada hasil agregasi, bukan warga memilih nol persen.
  const adaWarga =
    jumlahPartisipan !== undefined
      ? jumlahPartisipan > 0
      : semua.some((row) => row.total_alokasi_warga > 0);
  const rowsSelisih = [...berdata, ...menyusul];
  const posisi = (kategori: string) => {
    const index = urutanKategori.indexOf(kategori);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  const rows =
    urutanKategori.length > 0
      ? [...rowsSelisih].sort(
          (a, b) => posisi(a.kategori) - posisi(b.kategori) || a.kategori.localeCompare(b.kategori),
        )
      : rowsSelisih;
  const teratas = adaWarga ? berdata.slice(0, 3) : [];
  return {
    rows,
    rowsSelisih,
    teratas,
    sorotan: teratas[0],
    totalApbd: semua.reduce((sum, row) => sum + row.nominal_apbd, 0),
    adaWarga,
    maks: Math.max(1, ...berdata.map((row) => Math.abs(row.gap_poin_persen))),
    jumlahPartisipan,
    statusVerifikasiServer:
      apbdTersedia === undefined ? 'tidak_diketahui' : apbdTersedia ? 'terverifikasi' : 'tidak_ada',
    apbdTersedia,
    jumlahApbdTerverifikasi: berdata.length,
  };
}

/** Rupiah yang setara dengan selisih poin terhadap APBD yang terpetakan. */
export function setaraRupiah(item: GapItem, totalApbd: number): number {
  return (Math.abs(item.gap_poin_persen) / 100) * totalApbd;
}

/** CSV untuk diunduh. Diawali BOM supaya Excel membaca UTF-8 dengan benar. */
export function buatCsv(rows: readonly GapRow[], adaWarga = true): string {
  const kepala = [
    'kategori',
    'warga_persen',
    'apbd_persen',
    'selisih_poin',
    'nominal_apbd_rp',
    'data_apbd',
  ];
  const baris = rows.map((row) =>
    [
      `"${row.kategori.replace(/"/g, '""')}"`,
      // Belum ada partisipan: kosongkan, jangan menulis 0 yang terbaca sebagai hasil.
      adaWarga ? row.persen_warga : '',
      row.adaApbd ? row.persen_apbd : '',
      // Selisih hanya bermakna bila kedua sisi ada. Kosong (bukan 0 atau -100) bila belum ada
      // partisipan atau APBD terverifikasi; nol yang valid tetap ditulis sebagai 0.
      row.adaApbd && adaWarga ? row.gap_poin_persen : '',
      row.adaApbd ? row.nominal_apbd : '',
      row.adaApbd ? 'ada' : 'menyusul',
    ].join(','),
  );
  return `﻿${[kepala.join(','), ...baris].join('\n')}\n`;
}

export type PotretPrioritas = {
  /** Tiga bidang dengan porsi warga terbesar. */
  warga: GapRow[];
  /** Tiga bidang dengan porsi APBD terbesar. */
  apbd: GapRow[];
  /** Berapa bidang yang masuk tiga teratas di kedua sisi. */
  sama: number;
};

/**
 * Membandingkan tiga bidang teratas tiap sisi. Hanya bidang yang APBD-nya terverifikasi ikut
 * dihitung, supaya urutan warga tidak terlihat cocok hanya karena sisi APBD kosong. Seri
 * diurutkan menurut nama kategori agar hasilnya sama setiap kali halaman dibuka.
 */
export function potretPrioritas(rows: readonly GapRow[], batas = 3): PotretPrioritas {
  const dasar = rows.filter((row) => row.adaApbd);
  const urut = (nilai: (row: GapRow) => number) => (a: GapRow, b: GapRow) =>
    nilai(b) - nilai(a) || a.kategori.localeCompare(b.kategori);
  const warga = [...dasar].sort(urut((row) => row.persen_warga)).slice(0, batas);
  const apbd = [...dasar].sort(urut((row) => row.persen_apbd)).slice(0, batas);
  const namaApbd = new Set(apbd.map((row) => row.kategori));
  return { warga, apbd, sama: warga.filter((row) => namaApbd.has(row.kategori)).length };
}

/** Selisih di bawah ini (dalam poin persentase) dianggap hampir pas. */
export const AMBANG_PAS = 2;

/** Warna stabilo untuk tiga arah selisih, sama gayanya dengan label status usulan. */
export const WARNA_ARAH = { tambah: '#4FC79C', pas: '#E4DDCF', kurang: '#F5C79B' } as const;

export type ArahSelisih = { kunci: keyof typeof WARNA_ARAH; label: string; warna: string };

/** Menerjemahkan selisih poin jadi label yang mudah dibaca warga. */
export function arahSelisih(selisihPoin: number): ArahSelisih {
  const dibulatkan = Math.round(selisihPoin * 10) / 10;
  const kunci = Math.abs(dibulatkan) < AMBANG_PAS ? 'pas' : dibulatkan > 0 ? 'tambah' : 'kurang';
  const label = { tambah: 'Perlu ditambah', pas: 'Hampir pas', kurang: 'Kurang jadi prioritas' }[
    kunci
  ];
  return { kunci, label, warna: WARNA_ARAH[kunci] };
}
