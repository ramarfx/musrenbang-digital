import type { CSSProperties } from 'react';

type Props = {
  id: string;
  label: string;
  nilai: number;
  maks: number;
  langkah: number;
  onUbah: (nilai: number) => void;
  /** Teks yang dibacakan pembaca layar, mis. "Rp1.800.000". */
  teksNilai?: string;
  warnaIsi?: string;
};

/**
 * Slider dengan input range asli (keyboard dan pembaca layar tetap jalan).
 * Isinya elemen biasa di belakang input, bukan linear-gradient. Lebar isi
 * mengikuti pusat jempol: 12px di ujung kiri sampai 12px sebelum ujung kanan.
 */
export function Slider({ id, label, nilai, maks, langkah, onUbah, teksNilai, warnaIsi }: Props) {
  const rasio = maks > 0 ? nilai / maks : 0;
  const warna = warnaIsi ?? 'var(--warga)';
  return (
    <div className="relative h-7" style={{ '--slider-isi': warna } as CSSProperties}>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-track">
        <div
          className="h-full rounded-full"
          style={{
            width: rasio > 0 ? `calc(${rasio} * (100% - 24px) + 12px)` : 0,
            background: warna,
          }}
        />
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={maks}
        step={langkah}
        value={nilai}
        aria-label={label}
        aria-valuetext={teksNilai}
        onChange={(e) => onUbah(Number(e.target.value))}
        className="slider-input relative block h-7 w-full"
      />
    </div>
  );
}
