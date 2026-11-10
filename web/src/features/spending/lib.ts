import type { ProposalSpending } from '@musrenbang/shared';

/** Total pengeluaran satu usulan: jumlah semua catatan, koreksi (minus) ikut mengurangi. */
export function totalPengeluaran(catatan: readonly Pick<ProposalSpending, 'jumlah'>[]): number {
  return catatan.reduce((jumlah, item) => jumlah + item.jumlah, 0);
}

/** Persen `bagian` terhadap `pembanding`; kosong bila pembandingnya belum ada atau nol. */
export function persenDari(bagian: number, pembanding: number | null | undefined): number | null {
  if (!pembanding || pembanding <= 0) return null;
  return (bagian / pembanding) * 100;
}

/** Hanya angka dari ketikan admin, mis. "Rp 250.000.000" menjadi 250000000. */
export function angkaDariKetikan(teks: string): number {
  const angka = teks.replace(/\D/g, '');
  if (angka.length === 0) return 0;
  return Number.parseInt(angka, 10);
}

/** Rujukan berupa tautan web yang aman dibuka; selain itu ditampilkan sebagai teks biasa. */
export function sumberBerupaTautan(sumber: string): boolean {
  return /^https?:\/\/\S+$/i.test(sumber.trim());
}
