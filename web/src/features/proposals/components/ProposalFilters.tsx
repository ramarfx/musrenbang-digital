import { PROPOSAL_STATUSES, type ProposalStatus } from '@musrenbang/shared';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

type ProposalFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  status: ProposalStatus | 'semua';
  onStatusChange: (value: ProposalStatus | 'semua') => void;
  resultCount: number;
  totalCount: number;
};

export function ProposalFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  resultCount,
  totalCount,
}: ProposalFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="min-w-52 flex-1">
        <label htmlFor="cari-usulan" className="mb-1 block text-sm font-medium text-stone-700">
          Cari usulan
        </label>
        <Input
          id="cari-usulan"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Judul, deskripsi, atau kategori..."
        />
      </div>
      <div className="w-48">
        <label htmlFor="filter-status" className="mb-1 block text-sm font-medium text-stone-700">
          Status
        </label>
        <Select
          id="filter-status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as ProposalStatus | 'semua')}
        >
          <option value="semua">Semua status</option>
          {PROPOSAL_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>
      <p className="ml-auto pb-2 text-sm text-stone-500">
        Menampilkan {resultCount} dari {totalCount} usulan
      </p>
    </div>
  );
}
