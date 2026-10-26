import type { ReactNode } from 'react';

export type BagianRing = { label: string; nilai: number; warna: string };

/** Warna ring dana Desain 1: 4 program terbesar, lalu "Lainnya". */
export const WARNA_RING = ['#F7F4EF', '#F2C46D', '#A7F3D0', '#EE9F7F'];
export const WARNA_RING_LAINNYA = 'rgb(255 255 255 / 0.3)';

/**
 * Ambil 4 bagian terbesar, sisanya digabung jadi "Lainnya (n program)".
 * Bagian bernilai 0 dibuang.
 */
export function susunBagianRing(data: { label: string; nilai: number }[]): BagianRing[] {
  const urut = data.filter((d) => d.nilai > 0).sort((a, b) => b.nilai - a.nilai);
  const bagian: BagianRing[] = urut
    .slice(0, 4)
    .map((d, i) => ({ label: d.label, nilai: d.nilai, warna: WARNA_RING[i] }));
  const sisa = urut.slice(4);
  if (sisa.length > 0) {
    bagian.push({
      label: `Lainnya (${sisa.length} program)`,
      nilai: sisa.reduce((s, d) => s + d.nilai, 0),
      warna: WARNA_RING_LAINNYA,
    });
  }
  return bagian;
}

const R = 86;
const KELILING = 2 * Math.PI * R;
const CELAH = 3; // panjang celah antarbagian, dalam satuan keliling

/**
 * Ring dana untuk latar hijau. Digambar dengan lingkaran SVG
 * (stroke-dasharray), tanpa conic-gradient.
 */
export function Ring({
  bagian,
  total,
  label,
  children,
}: {
  bagian: BagianRing[];
  total: number;
  label: string;
  children: ReactNode;
}) {
  let posisi = 0;
  const pakaiCelah = bagian.length > 1;
  return (
    <div className="relative mx-auto size-[190px]" role="img" aria-label={label}>
      <svg viewBox="0 0 200 200" className="size-full -rotate-90">
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke="rgb(255 255 255 / 0.14)"
          strokeWidth="14"
        />
        {total > 0 &&
          bagian.map((b) => {
            const panjang = (b.nilai / total) * KELILING;
            const garis = Math.max(panjang - (pakaiCelah ? CELAH : 0), 0.5);
            const mulai = posisi + (pakaiCelah ? CELAH / 2 : 0);
            posisi += panjang;
            return (
              <circle
                key={b.label}
                cx="100"
                cy="100"
                r={R}
                fill="none"
                stroke={b.warna}
                strokeWidth="14"
                strokeDasharray={`${garis} ${KELILING}`}
                strokeDashoffset={-mulai}
              />
            );
          })}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="max-w-[130px] text-center">{children}</div>
      </div>
    </div>
  );
}
