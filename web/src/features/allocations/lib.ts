/**
 * Membagi anggaran menurut bobot (mis. porsi APBD), dalam kelipatan `step`.
 * Sisa pembulatan dibagikan ke bagian dengan pecahan terbesar, jadi total
 * selalu sama dengan anggaran (selama anggaran kelipatan `step`). Mengembalikan
 * null bila semua bobot nol, supaya pemanggil tidak menampilkan pembagian palsu.
 */
export function allocateByWeights(
  categories: readonly string[],
  weights: Readonly<Record<string, number>>,
  budget: number,
  step: number,
): Record<string, number> | null {
  const totalWeight = categories.reduce((sum, name) => sum + Math.max(0, weights[name] ?? 0), 0);
  if (totalWeight <= 0 || budget <= 0 || step <= 0) return null;

  const units = Math.floor(budget / step);
  const parts = categories.map((name) => {
    const exact = (Math.max(0, weights[name] ?? 0) / totalWeight) * units;
    return { name, whole: Math.floor(exact), fraction: exact - Math.floor(exact) };
  });

  let remaining = units - parts.reduce((sum, part) => sum + part.whole, 0);
  [...parts]
    .sort((a, b) => b.fraction - a.fraction)
    .forEach((part) => {
      if (remaining > 0 && part.fraction > 0) {
        part.whole += 1;
        remaining -= 1;
      }
    });

  const result = Object.fromEntries(parts.map((part) => [part.name, part.whole * step]));
  // Anggaran yang bukan kelipatan `step`: sisanya ke kategori berbobot terbesar.
  const leftover = budget - units * step;
  if (leftover > 0) {
    const biggest = [...categories].sort((a, b) => (weights[b] ?? 0) - (weights[a] ?? 0))[0];
    result[biggest] += leftover;
  }
  return result;
}

/**
 * Selisih bertanda dengan tanda minus sungguhan, mis. "+12,4" atau "−3,9".
 * Tanda ditentukan setelah dibulatkan ke satu desimal, jadi selisih yang nyaris nol
 * tampil "0,0" dan bukan "−0,0".
 */
export function formatSelisih(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
  return `${sign}${Math.abs(rounded).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
}
