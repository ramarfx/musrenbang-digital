import type { ApbdItem } from '@musrenbang/shared';

/** Alamat teks lengkap Pergub DKI Jakarta No. 44 Tahun 2025 di JDIH (hanya batang tubuh, tanpa lampiran). */
export const PERGUB_APBD_URL =
  'https://jdih.jakarta.go.id/dokumenPeraturanDirectory/0031/2025PERGUB003144.pdf';

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
