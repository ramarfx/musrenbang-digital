import type { ApbdItem } from '@musrenbang/shared';

/** Berkas sumber angka APBD 2025 di PPID DKI Jakarta (zip berisi Perda dan lampirannya). */
export const SUMBER_APBD_URL =
  'https://ppid.jakarta.go.id/assets/zip/apbd-pemerintah-provinsi-dki-jakarta/2025/APBD%202025.zip';

export type DokumenResmi = {
  judul: string;
  penerbit: string;
  jenis: 'PDF' | 'Halaman web' | 'Berkas zip';
  /** Perkiraan ukuran berkas, hanya bila diketahui. */
  ukuran?: string;
  isi: string;
  url: string;
};

/**
 * Dokumen resmi yang menjadi rujukan angka APBD. Tautannya langsung ke situs pemerintah, bukan
 * salinan, supaya isinya selalu yang terbaru dan bisa dicek asalnya. Tautan ini sama dengan
 * `sumber_url` di data APBD.
 */
export const DOKUMEN_RESMI: DokumenResmi[] = [
  {
    judul: 'Perda DKI Jakarta No. 9 Tahun 2024 dan lampirannya (APBD 2025)',
    penerbit: 'PPID Pemprov DKI Jakarta',
    jenis: 'Berkas zip',
    isi: 'Angka tiap kategori diambil dari Lampiran 2, yaitu total belanja per urusan pemerintahan. Bukan per program, dan sepuluh kategori di aplikasi ini dipetakan dari urusan itu.',
    url: SUMBER_APBD_URL,
  },
];

/**
 * Tiga keadaan data APBD per kategori, sesuai kontrak backend:
 * - terverifikasi: status `verified_program` dan punya tautan sumber (satu-satunya yang masuk Bandingkan);
 * - belum terverifikasi: ada angka, tetapi belum terverifikasi, jadi bukan angka resmi;
 * - kosong: belum ada angka.
 */
export type StatusData = 'terverifikasi' | 'belum_terverifikasi' | 'kosong';

export function statusData(
  item: Pick<ApbdItem, 'status_verifikasi' | 'nominal_rp' | 'sumber_url'>,
): StatusData {
  if (item.nominal_rp <= 0) return 'kosong';
  return item.status_verifikasi === 'verified_program' && item.sumber_url
    ? 'terverifikasi'
    : 'belum_terverifikasi';
}

export const LABEL_STATUS_DATA: Record<StatusData, string> = {
  terverifikasi: 'Terverifikasi',
  belum_terverifikasi: 'Belum terverifikasi',
  kosong: 'Data belum ada',
};

/**
 * Merapikan teks sumber dari data untuk ditampilkan. Tanda strip panjang yang dipakai sebagai
 * pemisah di data diganti koma, dan isi yang hanya tanda strip dianggap kosong (null).
 */
export function rapikanSumber(sumber: string | null | undefined): string | null {
  const teks = (sumber ?? '').trim();
  if (teks === '' || /^[-–—\s]+$/.test(teks)) return null;
  return teks.replace(/\s*[–—]\s*/g, ', ');
}

export type SumberKategori = {
  /** Baris yang ikut agregat v_gap: kota dan tahun terpilih, `verified_program`, ada tautan. */
  terverifikasi: ApbdItem[];
  /** Baris pada kota dan tahun yang sama yang bernominal tetapi tidak ikut agregat. */
  belumTerverifikasi: ApbdItem[];
};

/**
 * Memilah baris APBD satu kategori sesuai filter v_gap (kota dan tahun dari config), supaya
 * sumber yang ditampilkan sama dengan baris pembentuk angka agregat, bukan baris pertama yang
 * kebetulan cocok kategorinya. Baris lain tahun atau kota diabaikan.
 */
export function sumberKategori(
  items: readonly ApbdItem[],
  kategori: string,
  konfigurasi: { kota: string; tahun: number } | undefined,
): SumberKategori {
  const hasil: SumberKategori = { terverifikasi: [], belumTerverifikasi: [] };
  if (!konfigurasi) return hasil;
  for (const item of items) {
    if (item.kategori !== kategori) continue;
    if (item.kota !== konfigurasi.kota || item.tahun !== konfigurasi.tahun) continue;
    const status = statusData(item);
    if (status === 'terverifikasi') hasil.terverifikasi.push(item);
    else if (status === 'belum_terverifikasi') hasil.belumTerverifikasi.push(item);
  }
  return hasil;
}

export type PorsiKategori = {
  kategori: string;
  nominal: number;
  /** Bagian dari total APBD terverifikasi, dalam persen. */
  persen: number;
};

export type PorsiApbd = {
  /** Kategori terverifikasi, urut nominal terbesar. */
  rows: PorsiKategori[];
  /** Jumlah nominal seluruh baris terverifikasi. */
  total: number;
  /** Kategori yang ada barisnya tetapi angkanya belum terverifikasi atau masih kosong. */
  belum: string[];
};

/**
 * Menghitung porsi tiap kategori dari baris terverifikasi saja, jadi angkanya sama dengan
 * `persen_apbd` di v_gap. Kategori yang belum terverifikasi dipisah supaya tampilan bisa
 * menyebut apa yang belum masuk hitungan, bukan diam-diam menghitungnya nol. Bila daftar
 * kategori resmi diberikan, kategori yang belum punya baris sama sekali ikut disebut.
 */
export function porsiKategori(
  items: readonly ApbdItem[],
  kategoriResmi: readonly string[] = [],
): PorsiApbd {
  const perKategori = new Map<string, number>();
  for (const item of items) {
    if (statusData(item) !== 'terverifikasi') continue;
    perKategori.set(item.kategori, (perKategori.get(item.kategori) ?? 0) + item.nominal_rp);
  }
  const total = [...perKategori.values()].reduce((sum, nominal) => sum + nominal, 0);
  const rows = [...perKategori.entries()]
    .filter(([, nominal]) => nominal > 0)
    .map(([kategori, nominal]) => ({
      kategori,
      nominal,
      persen: (nominal / total) * 100,
    }))
    .sort((a, b) => b.nominal - a.nominal || a.kategori.localeCompare(b.kategori));
  const semua =
    kategoriResmi.length > 0 ? kategoriResmi : [...new Set(items.map((item) => item.kategori))];
  return {
    rows,
    total,
    belum: semua.filter((kategori) => !perKategori.has(kategori)),
  };
}

/** Status satu kategori dari semua baris relevannya; `sebagian` bila baris-barisnya berbeda status. */
export type StatusKategori = StatusData | 'sebagian';

/**
 * Status data APBD satu kategori pada kota dan tahun terpilih, dari seluruh baris bernominal.
 * Satu baris terverifikasi tidak membuat kategori disebut terverifikasi bila baris lain belum:
 * hasilnya `sebagian`. Baris lain tahun atau kota diabaikan; tanpa konfigurasi hasilnya `kosong`.
 */
export function statusKategori(
  items: readonly ApbdItem[],
  kategori: string,
  konfigurasi: { kota: string; tahun: number } | undefined,
): StatusKategori {
  if (!konfigurasi) return 'kosong';
  const relevan = items
    .filter(
      (item) =>
        item.kategori === kategori &&
        item.kota === konfigurasi.kota &&
        item.tahun === konfigurasi.tahun,
    )
    .map(statusData)
    .filter((status) => status !== 'kosong');
  if (relevan.length === 0) return 'kosong';
  const terverifikasi = relevan.filter((status) => status === 'terverifikasi').length;
  if (terverifikasi === relevan.length) return 'terverifikasi';
  return terverifikasi === 0 ? 'belum_terverifikasi' : 'sebagian';
}
