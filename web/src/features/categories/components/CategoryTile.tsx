import { cn } from '@/lib/cn';
import { getCategoryInfo } from '../info';

const UKURAN = {
  kecil: { kotak: 'size-8 rounded-[10px]', ikon: 16, ikonPolos: 20 },
  sedang: { kotak: 'size-10 rounded-[13px]', ikon: 20, ikonPolos: 24 },
  besar: { kotak: 'size-[52px] rounded-2xl sm:size-[60px]', ikon: 28, ikonPolos: 32 },
} as const;

/**
 * Ikon kategori, mis. bus untuk Transportasi Publik. Dekoratif: nama kategori ditulis di sebelahnya.
 * `polos` (bawaan) hanya ikon bertinta tanpa kotak, untuk kartu dan daftar yang sudah ramai.
 * `cap` kotak putih 3D seperti tombol (tepi tinta, alas 4px, ikon berbayang warna kategori), untuk daftar yang bisa diatur
 * warga (simulator).
 */
export function CategoryTile({
  kategori,
  small = false,
  ukuran = small ? 'kecil' : 'sedang',
  gaya = 'polos',
}: {
  kategori: string;
  small?: boolean;
  ukuran?: keyof typeof UKURAN;
  gaya?: 'polos' | 'cap';
}) {
  const { ikon, warna } = getCategoryInfo(kategori);
  const ukur = UKURAN[ukuran];
  const cap = gaya === 'cap';
  const sisi = cap ? ukur.ikon : ukur.ikonPolos;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid flex-none place-items-center text-ink',
        ukur.kotak,
        cap &&
          'border-[1.5px] border-edge bg-surface shadow-[0_4px_0_var(--edge),inset_0_-3px_0_rgb(0_0_0/0.07)]',
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width={sisi}
        height={sisi}
        fill="none"
        stroke="currentColor"
        strokeWidth={cap ? 1.8 : 1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={cap ? { filter: `drop-shadow(0 2px 0 ${warna.kuat})` } : undefined}
      >
        <path d={ikon} />
      </svg>
    </span>
  );
}
