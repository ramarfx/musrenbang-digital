import { cn } from '@/lib/cn';
import { getCategoryInfo } from '../info';

const UKURAN = {
  kecil: { kotak: 'size-8 rounded-[10px]', ikon: 16 },
  sedang: { kotak: 'size-10 rounded-[13px]', ikon: 20 },
  besar: { kotak: 'size-[52px] rounded-2xl sm:size-[60px]', ikon: 28 },
} as const;

/** Kotak ikon kategori, mis. bus untuk Transportasi Publik. Dekoratif: nama kategori ditulis di sebelahnya. */
export function CategoryTile({
  kategori,
  small = false,
  ukuran = small ? 'kecil' : 'sedang',
}: {
  kategori: string;
  small?: boolean;
  ukuran?: keyof typeof UKURAN;
}) {
  const { ikon, tone } = getCategoryInfo(kategori);
  const gaya = UKURAN[ukuran];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid flex-none place-items-center',
        gaya.kotak,
        tone === 'hijau' ? 'bg-mint-pucat text-mint-tua' : 'bg-active text-ink',
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width={gaya.ikon}
        height={gaya.ikon}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={ikon} />
      </svg>
    </span>
  );
}
