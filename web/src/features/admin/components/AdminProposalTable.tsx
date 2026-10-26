import { PROPOSAL_STATUSES, type Proposal, type ProposalStatus } from '@musrenbang/shared';
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
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatAngka, formatRupiah, formatTanggal } from '@/lib/format';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';

type AdminProposalTableProps = {
  proposals: Proposal[];
  onStatusChange: (proposal: Proposal, status: ProposalStatus) => void;
  isUpdating: boolean;
};

const columnHelper = createColumnHelper<Proposal>();

export function AdminProposalTable({
  proposals,
  onStatusChange,
  isUpdating,
}: AdminProposalTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'dibuat_pada', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');

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
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => (
          <div className="space-y-1">
            <StatusBadge status={info.getValue()} />
            <Select
              aria-label={`Ubah status ${info.row.original.judul}`}
              value={info.getValue()}
              disabled={isUpdating}
              onChange={(event) =>
                onStatusChange(info.row.original, event.target.value as ProposalStatus)
              }
              className="min-w-36 py-1.5 text-xs"
            >
              {PROPOSAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
        ),
      }),
      columnHelper.accessor('dibuat_pada', {
        header: 'Diajukan',
        cell: (info) => formatTanggal(info.getValue()),
      }),
    ],
    [isUpdating, onStatusChange],
  );

  const table = useReactTable({
    data: proposals,
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
      <div className="max-w-sm">
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

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
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
        Menampilkan {table.getRowModel().rows.length} dari {proposals.length} usulan. Perubahan
        status dicatat otomatis di riwayat.
      </p>
    </div>
  );
}
