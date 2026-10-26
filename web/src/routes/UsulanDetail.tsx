import { idSchema, type ProposalStatus } from '@musrenbang/shared';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/PageLoader';
import { Skeleton } from '@/components/ui/Skeleton';
import { CommentSection } from '@/features/comments/components/CommentSection';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';
import { StatusTimeline } from '@/features/proposals/components/StatusTimeline';
import { VotePanel } from '@/features/proposals/components/VotePanel';
import { useProposalQuery, useStatusHistoryQuery } from '@/features/proposals/queries';
import { formatRupiah, formatTanggal } from '@/lib/format';

export default function UsulanDetail() {
  const { id } = useParams();
  const proposalId = useMemo(() => {
    const parsed = idSchema.safeParse(id);
    return parsed.success ? parsed.data : null;
  }, [id]);

  const proposalQuery = useProposalQuery(proposalId);
  const historyQuery = useStatusHistoryQuery(proposalId);
  const proposal = proposalQuery.data ?? null;

  if (proposalId === null) {
    return (
      <EmptyState
        title="Usulan tidak ditemukan"
        description="Alamat usulan tidak valid."
        action={
          <Link to="/" className="text-sm font-medium text-emerald-800 underline">
            Kembali ke beranda
          </Link>
        }
      />
    );
  }

  if (proposalQuery.isPending) return <PageLoader label="Memuat usulan..." />;

  if (proposalQuery.isError) {
    return (
      <ErrorState
        message={proposalQuery.error.message}
        onRetry={() => {
          void proposalQuery.refetch();
        }}
      />
    );
  }

  if (!proposal) {
    return (
      <EmptyState
        title="Usulan tidak ditemukan"
        description="Usulan mungkin sudah dihapus atau belum pernah ada."
        action={
          <Link to="/" className="text-sm font-medium text-emerald-800 underline">
            Kembali ke beranda
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/" className="text-sm text-stone-500 hover:text-emerald-800">
            ← Kembali ke daftar usulan
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            {proposal.judul}
          </h1>
        </div>
        <StatusBadge status={proposal.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <p className="whitespace-pre-line text-stone-700">{proposal.deskripsi}</p>
            <dl className="mt-4 grid gap-2 border-t border-stone-100 pt-4 text-sm text-stone-600 sm:grid-cols-2">
              <div>
                <dt className="text-stone-400">Kategori</dt>
                <dd>{proposal.kategori}</dd>
              </div>
              <div>
                <dt className="text-stone-400">Estimasi biaya</dt>
                <dd>{formatRupiah(proposal.estimasi_biaya)}</dd>
              </div>
              <div>
                <dt className="text-stone-400">Lokasi</dt>
                <dd>{proposal.lokasi || 'Belum diisi'}</dd>
              </div>
              <div>
                <dt className="text-stone-400">Diusulkan</dt>
                <dd>
                  {proposal.pengusul_nama} · {formatTanggal(proposal.dibuat_pada)}
                </dd>
              </div>
            </dl>
          </Card>

          <VotePanel proposal={proposal} />
          <CommentSection proposalId={proposal.id} />
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="text-lg font-bold text-stone-900">Linimasa status</h2>
            <p className="mb-4 text-sm text-stone-500">Lima tahap dari diajukan sampai selesai.</p>
            {historyQuery.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <StatusTimeline
                status={proposal.status as ProposalStatus}
                history={historyQuery.data ?? []}
              />
            )}
            {historyQuery.isError && (
              <p className="mt-3 text-xs text-red-700">
                Riwayat gagal dimuat, tetapi status terkini tetap ditampilkan.
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
