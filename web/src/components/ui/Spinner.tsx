import { LoadingDots } from '@/components/brand/LogoLoader';
import { cn } from '@/lib/cn';

type SpinnerProps = {
  className?: string;
  label?: string;
};

/**
 * Pemuat kecil di dalam tombol atau teks: tiga titik yang sama dengan pemuat
 * halaman, mengikuti warna teks di sekitarnya.
 */
export function Spinner({ className, label = 'Memuat' }: SpinnerProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)} role="status">
      <LoadingDots tone="current" className="gap-1 [&>i]:size-1.5" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
