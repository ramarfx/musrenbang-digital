import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { BudgetSimulator } from '@/features/allocations/components/BudgetSimulator';
import { PrioritasSimulator } from '@/features/allocations/components/PrioritasSimulator';
import { cn } from '@/lib/cn';

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
  const [slotAksi, setSlotAksi] = useState<HTMLDivElement | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulator"
        description="Pilih cara mengisi: mengurutkan program atau membagi anggaran virtual. Hasil semua warga digabung dan dibandingkan dengan APBD di halaman Bandingkan."
        actions={
          <Link to="/apbd#dokumen-resmi" className={buttonClass('outline', 'sm')}>
            Asal angka APBD
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Cara mengisi simulator"
          className="relative grid w-[min(100%,340px)] grid-cols-2 rounded-xl border border-border bg-surface p-0.5"
        >
          <span
            aria-hidden="true"
            className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-[10px] bg-ink transition-transform duration-[260ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
            style={{ transform: cara === 'prioritas' ? 'translateX(0)' : 'translateX(100%)' }}
          />
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
                'relative h-9 rounded-[10px] px-3.5 text-[13px] font-semibold transition-[scale,color] duration-200 ease-out active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
                cara === pilihan.nilai ? 'text-on-ink' : 'text-muted hover:text-ink',
              )}
            >
              {pilihan.label}
            </button>
          ))}
        </div>
        <div ref={setSlotAksi} className="ml-auto flex flex-wrap items-center gap-2" />
      </div>

      {/* Kunci per cara: berpindah tab memulai komponen baru yang memuat data tersimpannya sendiri. */}
      {cara === 'prioritas' ? (
        <PrioritasSimulator key="prioritas" slotAksi={slotAksi} />
      ) : (
        <BudgetSimulator key="anggaran" slotAksi={slotAksi} />
      )}
    </div>
  );
}
