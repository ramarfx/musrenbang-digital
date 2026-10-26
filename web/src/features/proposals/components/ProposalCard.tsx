import type { Proposal } from '@musrenbang/shared';
import { formatAngka, formatRupiah, formatTanggal } from '@/lib/format';
import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  return (
    <Link
      to={`/usulan/${proposal.id}`}
      className="group flex flex-col rounded-3xl border border-border bg-surface p-5 transition-colors duration-150 ease-out hover:border-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-stone-900 group-hover:text-emerald-800">{proposal.judul}</h3>
        <StatusBadge status={proposal.status} />
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-stone-600">{proposal.deskripsi}</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-stone-500">
        <div>
          <dt className="sr-only">Kategori</dt>
          <dd>{proposal.kategori}</dd>
        </div>
        <div className="text-right">
          <dt className="sr-only">Estimasi biaya</dt>
          <dd>{formatRupiah(proposal.estimasi_biaya)}</dd>
        </div>
        <div>
          <dt className="sr-only">Jumlah suara</dt>
          <dd>{formatAngka(proposal.jumlah_suara)} suara</dd>
        </div>
        <div className="text-right">
          <dt className="sr-only">Tanggal diajukan</dt>
          <dd>{formatTanggal(proposal.dibuat_pada)}</dd>
        </div>
      </dl>
      <p className="mt-3 border-t border-stone-100 pt-2 text-xs text-stone-400">
        Diusulkan oleh {proposal.pengusul_nama}
      </p>
    </Link>
  );
}
