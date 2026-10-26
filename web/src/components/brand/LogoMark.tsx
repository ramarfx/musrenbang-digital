import { cn } from '@/lib/cn';
import { LOGO_B_PATH, LOGO_M_PATH, LOGO_STEM_PATH } from './logo-paths';

type LogoMarkProps = {
  className?: string;
  /** `brand` memakai tinta dan hijau logo; `current` mengikuti warna teks (untuk di dalam tombol). */
  tone?: 'brand' | 'current';
};

/**
 * Simbol logo (m dan b berbagi satu batang) tanpa tulisan. Dekoratif.
 * Bentuknya tidak pernah dipecah atau digeser saat memuat: yang bergerak
 * adalah elemen di sekitarnya, supaya tidak ada celah kosong di tengah logo.
 */
export function LogoMark({ className, tone = 'brand' }: LogoMarkProps) {
  const current = tone === 'current';
  return (
    <svg viewBox="8 20 244 206" aria-hidden="true" className={cn('block', className)}>
      <path fill={current ? 'currentColor' : 'var(--ink)'} fillRule="evenodd" d={LOGO_M_PATH} />
      <path fill={current ? 'currentColor' : 'var(--ink)'} fillRule="evenodd" d={LOGO_B_PATH} />
      <path fill={current ? 'currentColor' : 'var(--warga)'} d={LOGO_STEM_PATH} />
    </svg>
  );
}
