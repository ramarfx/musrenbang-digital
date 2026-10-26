/** 5 tahap status usulan, sama dengan CHECK di db/migrations/001_init.sql. */
export const TAHAP = ['Diajukan', 'Diverifikasi', 'Masuk APBD', 'Dikerjakan', 'Selesai'] as const;

export type Tahap = (typeof TAHAP)[number];

// Satu keluarga warna: pasir (baru), mustard (dicek), mint (masuk anggaran),
// hijau penuh (berjalan), tinta (tuntas).
export const WARNA_STATUS: Record<Tahap, string> = {
  Diajukan: 'bg-pasir text-ink',
  Diverifikasi: 'bg-mustard-pucat text-mustard-tua',
  'Masuk APBD': 'bg-mint-pucat text-mint-tua',
  Dikerjakan: 'bg-hijau text-white',
  Selesai: 'bg-ink text-ground',
};

export function warnaStatus(status: string): string {
  return WARNA_STATUS[status as Tahap] ?? 'bg-pasir text-ink';
}
