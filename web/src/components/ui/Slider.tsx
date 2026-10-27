import type { CSSProperties } from 'react';

type SliderProps = {
  id: string;
  label: string;
  value: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Teks yang dibacakan pembaca layar, mis. "Rp1.800.000". */
  valueText?: string;
};

/**
 * Slider dengan input range asli (keyboard dan pembaca layar tetap jalan).
 * Isinya elemen biasa di belakang input, bukan linear-gradient. Lebar isi
 * mengikuti pusat pegangan slider: 12px dari ujung kiri sampai 12px sebelum ujung kanan.
 */
export function Slider({ id, label, value, max, step, onChange, valueText }: SliderProps) {
  const ratio = max > 0 ? value / max : 0;
  return (
    <div className="relative h-7" style={{ '--slider-isi': 'var(--warga)' } as CSSProperties}>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-track">
        <div
          className="h-full rounded-full bg-warga"
          style={{ width: ratio > 0 ? `calc(${ratio} * (100% - 24px) + 12px)` : 0 }}
        />
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={valueText}
        onChange={(event) => onChange(Number(event.target.value))}
        className="slider-input relative block h-7 w-full"
      />
    </div>
  );
}
