import { PROPOSAL_STATUSES, type Proposal } from '@musrenbang/shared';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ModerationBadge } from '@/features/proposals/components/ModerationBadge';
import { formatAngka, formatRupiah, formatTanggal } from '@/lib/format';
import { cn } from '@/lib/cn';

type AdminProposalTableProps = {
  proposals: Proposal[];
  /** Membuka pop-up ubah status; catatan wajib diisi di sana. */
  onUbahStatus: (proposal: Proposal) => void;
  /** Membuka konfirmasi hapus; usulan hilang permanen. */
  onHapus: (proposal: Proposal) => void;
};

const columnHelper = createColumnHelper<Proposal>();

export function AdminProposalTable({ proposals, onUbahStatus, onHapus }: AdminProposalTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'dibuat_pada', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [saringStatus, setSaringStatus] = useState<Proposal['status'] | 'semua'>('semua');
  const jumlahStatus = useMemo(() => {
    const hasil: Record<string, number> = {};
    for (const proposal of proposals) hasil[proposal.status] = (hasil[proposal.status] ?? 0) + 1;
    return hasil;
  }, [proposals]);
  const data = useMemo(
    () =>
      saringStatus === 'semua'
        ? proposals
        : proposals.filter((proposal) => proposal.status === saringStatus),
    [proposals, saringStatus],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('judul', {
        header: 'Usulan',
        cell: (info) => (
          <div>
            <Link
              to={`/usulan/${info.row.original.id}`}
              className="font-medium text-emerald-800 hover:underline"
            >
              {info.getValue()}
            </Link>
            <p className="text-xs text-stone-500">{info.row.original.pengusul_nama}</p>
          </div>
        ),
      }),
      columnHelper.accessor('kategori', {
        header: 'Kategori',
      }),
      columnHelper.accessor('estimasi_biaya', {
        header: 'Estimasi',
        cell: (info) => formatRupiah(info.getValue()),
      }),
      columnHelper.accessor('jumlah_suara', {
        header: 'Suara',
        cell: (info) => formatAngka(info.getValue()),
      }),
      columnHelper.accessor('moderasi', {
        header: 'Moderasi',
        cell: (info) => <ModerationBadge moderasi={info.getValue()} />,
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const tahap = PROPOSAL_STATUSES.indexOf(info.getValue());
          return (
            <div className="space-y-2">
              <div className="flex gap-1" aria-hidden="true">
                {PROPOSAL_STATUSES.map((nama, index) => (
                  <span
                    key={nama}
                    className={cn(
                      'h-1.5 w-6 rounded-full',
                      index <= tahap ? 'bg-hijau-terang' : 'bg-track',
                    )}
                  />
                ))}
              </div>
              <p className="text-[12.5px] whitespace-nowrap text-muted">
                <StatusBadge status={info.getValue()} /> · tahap {tahap + 1} dari{' '}
                {PROPOSAL_STATUSES.length}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => onUbahStatus(info.row.original)}
                  aria-label={`Ubah status ${info.row.original.judul}`}
                  className="block h-8 rounded-lg border border-border bg-surface px-3 text-[13px] font-semibold transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
                >
                  Ubah status
                </button>
                <button
                  type="button"
                  onClick={() => onHapus(info.row.original)}
                  aria-label={`Hapus usulan ${info.row.original.judul}`}
                  title="Hapus usulan"
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-ink transition-[scale,background-color,color,border-color] duration-150 ease-out hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
                >
                  <Icon name="sampah" size={16} />
                </button>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('dibuat_pada', {
        header: 'Diajukan',
        cell: (info) => formatTanggal(info.getValue()),
      }),
    ],
    [onUbahStatus, onHapus],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-sm">
          <label htmlFor="cari-admin" className="mb-1 block text-sm font-medium text-stone-700">
            Cari usulan
          </label>
          <Input
            id="cari-admin"
            type="search"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Cari judul, kategori, atau pengusul..."
          />
        </div>
        <div className="w-full max-w-[220px]">
          <label htmlFor="saring-status" className="mb-1 block text-sm font-medium text-stone-700">
            Status
          </label>
          <Select
            id="saring-status"
            value={saringStatus}
            onChange={(event) =>
              setSaringStatus(event.target.value as Proposal['status'] | 'semua')
            }
          >
            <option value="semua">Semua status ({proposals.length})</option>
            {PROPOSAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status} ({jumlahStatus[status] ?? 0})
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Daftar usulan untuk dikelola admin</caption>
          <thead className="bg-stone-100 text-stone-700">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 font-semibold whitespace-nowrap">
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className={
                          header.column.getCanSort()
                            ? 'inline-flex items-center gap-1 hover:text-emerald-800'
                            : 'cursor-default'
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-stone-100 align-top">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {table.getRowModel().rows.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-stone-500">
            Tidak ada usulan yang cocok.
          </p>
        )}
      </div>

      <p className="text-xs text-stone-500">
        Menampilkan {table.getRowModel().rows.length} dari {data.length} usulan. Setiap perubahan
        status memakai catatan dan tercatat di riwayat.
      </p>
    </div>
  );
}
