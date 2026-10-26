import type { CSSProperties, ReactNode } from 'react';

export type RingSlice = { label: string; value: number; color: string };

/** Warna ring dana Desain 1: 4 program terbesar, lalu "Lainnya". */
const RING_COLORS = ['#F7F4EF', '#F2C46D', '#A7F3D0', '#EE9F7F'];
// "Lainnya" memakai hijau terang logo, bukan putih transparan: putih transparan nyaris sama
// dengan jalur kosong ring sehingga potongan 60% terbaca seperti bagian yang belum terisi.
const RING_OTHER = '#4FC79C';

/**
 * Ambil 4 bagian terbesar, sisanya digabung jadi "Lainnya (n program)".
 * Bagian bernilai 0 dibuang.
 */
export function buildRingSlices(data: { label: string; value: number }[]): RingSlice[] {
  const sorted = data.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
  const slices: RingSlice[] = sorted
    .slice(0, 4)
    .map((item, index) => ({ ...item, color: RING_COLORS[index] }));
  const rest = sorted.slice(4);
  if (rest.length > 0) {
    slices.push({
      label: `Lainnya (${rest.length} program)`,
      value: rest.reduce((sum, item) => sum + item.value, 0),
      color: RING_OTHER,
    });
  }
  return slices;
}

const RADIUS = 86;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 3; // panjang celah antarbagian, dalam satuan keliling

/**
 * Ring dana untuk latar hijau. Digambar dengan lingkaran SVG
 * (stroke-dasharray), tanpa conic-gradient.
 */
export function DonutRing({
  slices,
  total,
  label,
  size = 'size-[190px]',
  drawIn = false,
  instant = false,
  children,
}: {
  slices: RingSlice[];
  total: number;
  label: string;
  /** Kelas ukuran Tailwind, bawaan 190px. */
  size?: string;
  /** Potongan tergambar bergiliran saat pop-up pemilik cincin ini dibuka. */
  drawIn?: boolean;
  /** Tanpa transisi halus: dipakai saat nilai sudah dianimasikan dari luar (per bingkai). */
  instant?: boolean;
  children: ReactNode;
}) {
  let position = 0;
  const useGap = slices.length > 1;
  return (
    <div className={`relative mx-auto ${size}`} role="img" aria-label={label}>
      <svg viewBox="0 0 200 200" className="size-full -rotate-90">
        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke="rgb(255 255 255 / 0.14)"
          strokeWidth="14"
        />
        {total > 0 &&
          slices.map((slice, index) => {
            const length = (slice.value / total) * CIRCUMFERENCE;
            const dash = Math.max(length - (useGap ? GAP : 0), 0.5);
            const start = position + (useGap ? GAP / 2 : 0);
            position += length;
            return (
              <circle
                key={slice.label}
                cx="100"
                cy="100"
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth="14"
                strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
                strokeDashoffset={-start}
                style={drawIn ? ({ '--i': index } as CSSProperties) : undefined}
                className={`${instant ? '' : 'transition-[stroke-dasharray,stroke-dashoffset,stroke] duration-200 ease-out'}${drawIn ? ' ring-draw' : ''}`}
              />
            );
          })}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">{children}</div>
      </div>
    </div>
  );
}
