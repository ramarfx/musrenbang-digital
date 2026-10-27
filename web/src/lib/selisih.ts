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
