import { PROPOSAL_STATUSES, type Proposal, type ProposalStatus } from '@musrenbang/shared';
import { Icon } from '@/components/ui/Icon';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { formatRupiahRingkas, formatTanggal } from '@/lib/format';
import { Link } from 'react-router-dom';
import { UpvoteButton } from './UpvoteButton';
import { StatusBadge } from './StatusBadge';

/** Lima batang kecil penanda tahap: hijau sampai tahap sekarang, abu sesudahnya. */
function Tahap({ status }: { status: string }) {
  const sekarang = PROPOSAL_STATUSES.indexOf(status as ProposalStatus);
  return (
    <div
      className="flex gap-1"
      role="img"
      aria-label={`Tahap ${sekarang + 1} dari ${PROPOSAL_STATUSES.length}: ${status}`}
    >
      {PROPOSAL_STATUSES.map((tahap, index) => (
        <i
          key={tahap}
          className={`h-1 flex-1 rounded-full ${index <= sekarang ? 'bg-hijau' : 'bg-track'}`}
        />
      ))}
    </div>
  );
}

/**
 * Kartu usulan. Judul adalah tautan yang meluas ke seluruh kartu (`after:inset-0`), jadi
 * kartu bisa diklik di mana saja; tombol dukung dan komentar berada di atasnya (`z-10`)
 * dan bisa dipakai tanpa membuka usulan.
 */
export function ProposalCard({ proposal }: { proposal: Proposal }) {
  return (
    <article className="group relative flex flex-col rounded-3xl border border-border bg-surface p-5 transition-[translate,border-color] duration-150 ease-out focus-within:border-ink/40 hover:-translate-y-0.5 hover:border-ink/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CategoryTile kategori={proposal.kategori} />
          <div className="min-w-0">
            <h3 className="font-bold text-ink transition-colors duration-150 group-hover:text-warga">
              <Link
                to={`/usulan/${proposal.id}`}
                className="after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-warga"
              >
                {proposal.judul}
              </Link>
            </h3>
            <p className="text-[13px] text-muted">{proposal.kategori}</p>
          </div>
        </div>
        <StatusBadge status={proposal.status} />
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-ink/80">{proposal.deskripsi}</p>

      <div className="mt-4">
        <Tahap status={proposal.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-rule pt-3 text-sm">
        <div>
          <dt className="text-[12.5px] text-muted">Estimasi</dt>
          <dd className="font-semibold">{formatRupiahRingkas(proposal.estimasi_biaya)}</dd>
        </div>
        <div className="text-right">
          <dt className="text-[12.5px] text-muted">Diajukan</dt>
          <dd className="font-semibold">{formatTanggal(proposal.dibuat_pada)}</dd>
        </div>
      </dl>

      <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
        <UpvoteButton proposalId={proposal.id} jumlah={proposal.jumlah_suara} />
        <Link
          to={`/usulan/${proposal.id}#komentar`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[13px] font-semibold text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
        >
          <Icon name="usulan" size={16} />
          Komentar
        </Link>
        <span className="ml-auto text-[12.5px] text-muted">oleh {proposal.pengusul_nama}</span>
      </div>
    </article>
  );
}
