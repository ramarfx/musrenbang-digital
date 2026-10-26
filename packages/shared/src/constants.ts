/**
 * Konstanta domain yang dipakai bersama oleh frontend, seed, dan dokumen.
 * Nilai yang tersimpan di database (status, peran, status verifikasi) harus
 * selalu merujuk ke daftar di sini agar tidak ada string liar di kode.
 */

export const PROPOSAL_STATUSES = [
  'Diajukan',
  'Diverifikasi',
  'Masuk APBD',
  'Dikerjakan',
  'Selesai',
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const PROFILE_ROLES = ['warga', 'admin'] as const;

export type ProfileRole = (typeof PROFILE_ROLES)[number];

export const APBD_VERIFICATION_STATUSES = ['verified_program', 'perlu_lampiran'] as const;

export type ApbdVerificationStatus = (typeof APBD_VERIFICATION_STATUSES)[number];

export const APBD_VERIFICATION_LABEL: Record<ApbdVerificationStatus, string> = {
  verified_program: 'Terverifikasi',
  perlu_lampiran: 'Perlu lampiran',
};

export const DEFAULT_CATEGORIES = [
  'Infrastruktur dan Jalan',
  'Pendidikan',
  'Kesehatan',
  'Lingkungan dan Sampah',
  'Air Bersih dan Drainase',
  'Transportasi Publik',
  'Keamanan dan Penerangan',
  'Ekonomi dan UMKM',
  'Sosial dan Budaya',
  'Teknologi dan Layanan Digital',
] as const;

export const DEFAULT_VIRTUAL_BUDGET = 10_000_000;

export const ALLOCATION_STEP = 100_000;

export const TEXT_LIMITS = {
  judulMin: 8,
  judulMaks: 120,
  deskripsiMin: 20,
  deskripsiMaks: 2_000,
  lokasiMaks: 200,
  komentarMin: 3,
  komentarMaks: 1_000,
  namaMin: 2,
  namaMaks: 80,
  estimasiMaks: 100_000_000_000,
} as const;

export const APP_CONFIG_KEYS = {
  kota: 'kota',
  tahunAnggaran: 'tahun_anggaran',
  virtualBudgetPerWarga: 'virtual_budget_per_warga',
} as const;
