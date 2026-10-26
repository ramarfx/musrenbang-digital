import { cn } from '@/lib/cn';
import { LogoMark } from './LogoMark';

/**
 * Tiga titik yang naik-turun bergiliran. `current` = ikut warna teks
 * (untuk di dalam tombol); `brand` = hijau logo.
 */
export function LoadingDots({
  tone = 'brand',
  className,
}: {
  tone?: 'brand' | 'current';
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={cn('inline-flex gap-1.5', className)}>
      {[0, 1, 2].map((i) => (
        <i
          key={i}
          className={cn(
            'load-dot block size-2 rounded-full',
            tone === 'current' ? 'bg-current' : 'bg-warga',
          )}
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </span>
  );
}

type LogoLoaderProps = {
  /** Dibacakan pembaca layar; tidak tampil di layar. */
  label?: string;
};

/**
 * Pemuat halaman: bentuk logo terisi warna dari bawah ke atas (air naik), dengan
 * tiga titik di bawahnya. Logo tidak pernah dipecah. Baru terlihat setelah 400ms
 * (kelas `load-late`), jadi kalau data datang lebih cepat, seperti pada refresh,
 * tidak ada yang berkedip. Ruangnya tetap dipesan, jadi halaman tidak bergeser.
 */
export function LogoLoader({ label = 'Memuat' }: LogoLoaderProps) {
  return (
    <div role="status" className="flex min-h-48 items-center justify-center">
      <div className="load-late flex flex-col items-center gap-5">
        <div className="relative w-16">
          <LogoMark className="h-auto w-full opacity-15" />
          <LogoMark className="load-air absolute inset-0 h-auto w-full" />
        </div>
        <LoadingDots />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
