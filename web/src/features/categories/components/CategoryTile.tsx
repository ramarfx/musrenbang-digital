import { cn } from '@/lib/cn';
import { getCategoryInfo } from '../info';

/** Kotak kode dua huruf kategori, mis. "Pd" untuk Pendidikan. Dekoratif. */
export function CategoryTile({ kategori, small = false }: { kategori: string; small?: boolean }) {
  const { kode, tone } = getCategoryInfo(kategori);
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid flex-none place-items-center font-bold',
        small ? 'size-8 rounded-[10px] text-[11px]' : 'size-10 rounded-[13px] text-xs',
        tone === 'hijau' ? 'bg-mint-pucat text-mint-tua' : 'bg-active text-ink',
      )}
    >
      {kode}
    </span>
  );
}
