import { cn } from '@/lib/cn';

/** Dua huruf awal nama untuk avatar; "W" (warga) bila nama kosong. */
export function inisial(nama: string): string {
  const kata = nama.trim().split(/\s+/);
  return ((kata[0]?.[0] ?? '') + (kata[1]?.[0] ?? '')).toUpperCase() || 'W';
}

const UKURAN = {
  kecil: 'size-7 text-[11px]',
  sedang: 'size-8 text-xs',
  besar: 'size-10 text-sm',
} as const;

/** Lingkaran hijau stabilo berisi inisial. Dekoratif: nama ditulis di sebelahnya. */
export function Avatar({
  nama,
  ukuran = 'sedang',
  className,
}: {
  nama: string;
  ukuran?: keyof typeof UKURAN;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid flex-none place-items-center rounded-full bg-hijau-terang font-bold text-hitam',
        UKURAN[ukuran],
        className,
      )}
    >
      {inisial(nama)}
    </span>
  );
}
