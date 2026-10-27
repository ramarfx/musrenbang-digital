import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { BudgetSimulator } from '@/features/allocations/components/BudgetSimulator';
import { PrioritasSimulator } from '@/features/allocations/components/PrioritasSimulator';
import { useAppConfigQuery } from '@/features/config/queries';
import { cn } from '@/lib/cn';
import { formatRupiah } from '@/lib/format';

type Cara = 'prioritas' | 'anggaran';

const PILIHAN: { nilai: Cara; label: string }[] = [
  { nilai: 'prioritas', label: 'Urutan prioritas' },
  { nilai: 'anggaran', label: 'Bagi anggaran' },
];

/**
 * Dua cara mengisi simulator untuk dibandingkan: mengurutkan program 1 sampai 10, atau membagi
 * anggaran virtual dengan slider. Keduanya menyimpan ke tabel alokasi yang sama, jadi urutan
 * dan pembagian yang tersimpan terakhir yang dipakai halaman Bandingkan.
 */
export default function Simulator() {
  const [params, setParams] = useSearchParams();
  const cara: Cara = params.get('cara') === 'anggaran' ? 'anggaran' : 'prioritas';
  const configQuery = useAppConfigQuery();
  const budget = configQuery.data?.virtualBudgetPerWarga ?? 10_000_000;

  return (
    <div className="space-y-6">
      <PageHeader
        title={cara === 'prioritas' ? 'Simulator prioritas' : 'Simulator anggaran virtual'}
        description={
          cara === 'prioritas'
            ? 'Urutkan program dari yang paling penting (nomor 1) sampai yang paling tidak. Setiap nomor hanya dipakai sekali. Urutan semua warga digabung dan dibandingkan dengan APBD di halaman Bandingkan.'
            : `Setiap warga mendapat anggaran virtual ${formatRupiah(budget)} untuk dibagikan ke seluruh kategori. Ini bukan uang nyata; agregat semua warga tampil di halaman Bandingkan.`
        }
      />

      <div
        role="group"
        aria-label="Cara mengisi simulator"
        className="inline-flex rounded-xl border border-border bg-surface p-0.5"
      >
        {PILIHAN.map((pilihan) => (
          <button
            key={pilihan.nilai}
            type="button"
            aria-pressed={cara === pilihan.nilai}
            onClick={() =>
              setParams(pilihan.nilai === 'prioritas' ? {} : { cara: pilihan.nilai }, {
                replace: true,
              })
            }
            className={cn(
              'h-9 rounded-[10px] px-3.5 text-[13px] font-semibold transition-[scale,background-color,color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
              cara === pilihan.nilai
                ? 'bg-ink text-white'
                : 'text-muted hover:bg-active hover:text-ink',
            )}
          >
            {pilihan.label}
          </button>
        ))}
      </div>

      {/* Kunci per cara: berpindah tab memulai komponen baru yang memuat data tersimpannya sendiri. */}
      {cara === 'prioritas' ? (
        <PrioritasSimulator key="prioritas" />
      ) : (
        <BudgetSimulator key="anggaran" />
      )}
    </div>
  );
}
