import { PROPOSAL_STATUSES, type ProposalStatus } from '@musrenbang/shared';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';

type StatusFilter = ProposalStatus | 'semua';

type ProposalFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  /** Jumlah usulan per status (sudah memperhitungkan kata kunci), dan `semua` untuk totalnya. */
  counts: Record<StatusFilter, number>;
  kategori: string;
  onKategoriChange: (value: string) => void;
  /** Kategori beserta jumlah usulan (sudah memperhitungkan kata kunci dan status). */
  daftarKategori: { nama: string; jumlah: number }[];
  urutan: 'terbaru' | 'terpopuler';
  onUrutanChange: (value: 'terbaru' | 'terpopuler') => void;
  resultCount: number;
  totalCount: number;
};

const OPTIONS: StatusFilter[] = ['semua', ...PROPOSAL_STATUSES];

export function ProposalFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  counts,
  kategori,
  onKategoriChange,
  daftarKategori,
  urutan,
  onUrutanChange,
  resultCount,
  totalCount,
}: ProposalFiltersProps) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(200px,280px)] sm:items-end">
        <div>
          <label htmlFor="cari-usulan" className="mb-1.5 block text-[13px] text-muted">
            Cari usulan
          </label>
          <Input
            id="cari-usulan"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Judul, deskripsi, kategori, atau nama pengusul"
          />
        </div>
        <div>
          <label htmlFor="filter-kategori" className="mb-1.5 block text-[13px] text-muted">
            Kategori
          </label>
          <Select
            id="filter-kategori"
            value={kategori}
            onChange={(event) => onKategoriChange(event.target.value)}
          >
            <option value="semua">Semua kategori</option>
            {daftarKategori.map((item) => (
              <option key={item.nama} value={item.nama}>
                {item.nama} ({item.jumlah})
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-4">
        <p id="label-status" className="mb-2 text-[13px] text-muted">
          Status
        </p>
        <div role="group" aria-labelledby="label-status" className="flex flex-wrap gap-2">
          {OPTIONS.map((option) => {
            const aktif = status === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={aktif}
                onClick={() => onStatusChange(option)}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-semibold transition-[scale,background-color,border-color,color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
                  aktif
                    ? 'border-ink bg-ink text-on-ink'
                    : 'border-border bg-surface text-ink hover:bg-active',
                )}
              >
                {option === 'semua' ? 'Semua' : option}
                <span
                  className={cn(
                    'rounded-md px-1.5 text-[12px] font-medium tabular-nums',
                    aktif ? 'bg-on-ink/20 text-on-ink' : 'bg-pasir text-ink',
                  )}
                >
                  {counts[option]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted" aria-live="polite">
          Menampilkan {resultCount} dari {totalCount} usulan
        </p>
        <div role="group" aria-label="Urutkan usulan" className="flex gap-1.5">
          {(['terbaru', 'terpopuler'] as const).map((pilihan) => (
            <button
              key={pilihan}
              type="button"
              aria-pressed={urutan === pilihan}
              onClick={() => onUrutanChange(pilihan)}
              className={cn(
                'h-8 rounded-lg px-3.5 text-[13px] font-semibold transition-[scale,background-color,color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
                urutan === pilihan
                  ? 'bg-ink text-on-ink'
                  : 'text-muted hover:bg-active hover:text-ink',
              )}
            >
              {pilihan === 'terbaru' ? 'Terbaru' : 'Terpopuler'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
