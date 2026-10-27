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
