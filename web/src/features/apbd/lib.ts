import type { ApbdVerificationStatus } from '@musrenbang/shared';

/** Alamat teks lengkap Pergub DKI Jakarta No. 44 Tahun 2025 di JDIH (hanya batang tubuh, tanpa lampiran). */
export const PERGUB_APBD_URL =
  'https://jdih.jakarta.go.id/dokumenPeraturanDirectory/0031/2025PERGUB003144.pdf';

/**
 * Label status data APBD untuk ditampilkan. `verified_program` berarti nominal dijumlahkan dari
 * program yang disebut pemberitaan; belum dicocokkan ke lampiran Pergub, jadi tidak ditulis
 * "Terverifikasi" supaya tidak terbaca sebagai angka resmi per kategori.
 */
export function labelVerifikasi(status: ApbdVerificationStatus): string {
  return status === 'verified_program' ? 'Dipetakan dari program' : 'Perlu lampiran';
}

/**
 * Merapikan teks sumber dari data untuk ditampilkan. Tanda strip panjang yang dipakai sebagai
 * pemisah di data diganti koma, dan isi yang hanya tanda strip dianggap kosong (null).
 */
export function rapikanSumber(sumber: string | null | undefined): string | null {
  const teks = (sumber ?? '').trim();
  if (teks === '' || /^[-–—\s]+$/.test(teks)) return null;
  return teks.replace(/\s*[–—]\s*/g, ', ');
}
