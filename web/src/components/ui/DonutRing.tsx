import type { CSSProperties, ReactNode } from 'react';

export type RingSlice = { label: string; value: number; color: string };

/**
 * Sepuluh warna ring dana untuk latar hijau, tanpa biru dan tanpa gradasi. Tiap program
 * memegang satu warna tetap (urut abjad nama program), jadi warnanya tidak berpindah
 * saat urutan besar-kecilnya berubah.
 */
const RING_COLORS = [
  '#F7F4EF',
  '#F2C46D',
  '#A7F3D0',
  '#EE9F7F',
  '#D6E36B',
  '#F2B5C8',
  '#C98B3C',
  '#6FD3C0',
  '#E2674F',
  '#B9C7B0',
];

// Gabungan program kecil ("Lainnya") memakai abu hijau yang tidak sama dengan 10 warna di atas
// dan tidak mirip jalur kosong ring.
const RING_OTHER = '#8FA79B';

/**
 * Potongan ring per program bernilai di atas 0, urut dari yang terbesar. Warna program
 * tetap, sama di kartu dan di pop-up. Dengan `tampil`, hanya sebanyak itu program terbesar
 * yang ditampilkan dan sisanya digabung menjadi "Lainnya (n program)".
 */
export function buildRingSlices(
  data: { label: string; value: number }[],
  tampil?: number,
): RingSlice[] {
  const urutan = data.map((item) => item.label).sort((a, b) => a.localeCompare(b));
  const sorted: RingSlice[] = data
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((item) => ({
      ...item,
      color: RING_COLORS[urutan.indexOf(item.label) % RING_COLORS.length],
    }));
  if (tampil === undefined || sorted.length <= tampil + 1) return sorted;
  const rest = sorted.slice(tampil);
  return [
    ...sorted.slice(0, tampil),
    {
      label: `Lainnya (${rest.length} program)`,
      value: rest.reduce((sum, item) => sum + item.value, 0),
      color: RING_OTHER,
    },
  ];
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
