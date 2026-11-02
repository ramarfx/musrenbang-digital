import type { ApbdItem } from '@musrenbang/shared';

/** Alamat teks lengkap Pergub DKI Jakarta No. 44 Tahun 2025 di JDIH (hanya batang tubuh, tanpa lampiran). */
export const PERGUB_APBD_URL =
  'https://jdih.jakarta.go.id/dokumenPeraturanDirectory/0031/2025PERGUB003144.pdf';

/** Lampiran I Perda DKI Jakarta No. 4 Tahun 2025: ringkasan APBD 2026 menurut kelompok dan jenis. */
export const LAMPIRAN_PERDA_URL =
  'https://apbd.jakarta.go.id/doc/publik/6.%20APBD/APBD%202026/PENETAPAN/PERDA/Lampiran%201%20Perda%20APBD%202026.pdf';

/** Artikel BPKD DKI Jakarta tentang postur APBD 2026 beserta infografisnya. */
export const ARTIKEL_BPKD_URL = 'https://bpkd.jakarta.go.id/artikel/detail/862';

export type DokumenResmi = {
  judul: string;
  penerbit: string;
  jenis: 'PDF' | 'Halaman web';
  /** Perkiraan ukuran berkas, hanya untuk PDF. */
  ukuran?: string;
  isi: string;
  url: string;
};

/**
 * Dokumen resmi yang menjadi rujukan angka APBD. Tautannya langsung ke situs pemerintah, bukan
 * salinan, supaya isinya selalu yang terbaru dan bisa dicek asalnya. Ketiganya terakhir dibuka
 * dan dicocokkan pada 2 November 2026.
 */
export const DOKUMEN_RESMI: DokumenResmi[] = [
  {
    judul: 'Pergub DKI Jakarta No. 44 Tahun 2025',
    penerbit: 'JDIH Pemprov DKI Jakarta',
    jenis: 'PDF',
    ukuran: '0,4 MB',
    isi: 'Memuat total pendapatan dan belanja daerah 2026 (Pasal 3 dan Pasal 9). Hanya batang tubuh, tanpa lampiran.',
    url: PERGUB_APBD_URL,
  },
  {
    judul: 'Lampiran I Perda DKI Jakarta No. 4 Tahun 2025',
    penerbit: 'apbd.jakarta.go.id',
    jenis: 'PDF',
    ukuran: '1,5 MB',
    isi: 'Ringkasan APBD 2026 menurut kelompok dan jenis belanja: pegawai, barang dan jasa, modal, bansos, dan lainnya. Bukan per bidang seperti sepuluh kategori di aplikasi ini.',
    url: LAMPIRAN_PERDA_URL,
  },
  {
    judul: 'Postur APBD 2026 dan infografisnya',
    penerbit: 'BPKD DKI Jakarta',
    jenis: 'Halaman web',
    isi: 'Penjelasan resmi postur anggaran, termasuk porsi infrastruktur pelayanan publik, dan keterangan pimpinan BPKD.',
    url: ARTIKEL_BPKD_URL,
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
