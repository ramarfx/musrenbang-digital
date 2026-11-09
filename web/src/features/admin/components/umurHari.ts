/** Sudah berapa hari usulan menunggu, dibulatkan ke bawah dan tidak pernah negatif. */
export function umurHari(dibuatPada: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dibuatPada).getTime()) / 86_400_000));
}
