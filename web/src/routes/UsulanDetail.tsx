import { idSchema, type ProposalStatus } from '@musrenbang/shared';
import { useEffect, useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/PageLoader';
import { Skeleton } from '@/components/ui/Skeleton';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { LokasiUsulan } from '@/components/map/LokasiUsulan';
import { CommentSection } from '@/features/comments/components/CommentSection';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';
import { StatusTimeline } from '@/features/proposals/components/StatusTimeline';
import { VotePanel } from '@/features/proposals/components/VotePanel';
import { useProposalQuery, useStatusHistoryQuery } from '@/features/proposals/queries';
import { formatRupiah, formatTanggal, formatTanggalWaktu } from '@/lib/format';

export default function UsulanDetail() {
  const { id } = useParams();
  const { hash } = useLocation();
  const proposalId = useMemo(() => {
    const parsed = idSchema.safeParse(id);
    return parsed.success ? parsed.data : null;
  }, [id]);

  const proposalQuery = useProposalQuery(proposalId);
  const historyQuery = useStatusHistoryQuery(proposalId);
  const proposal = proposalQuery.data ?? null;

  // Dari tombol Komentar di kartu: gulir ke kolom komentar begitu usulan termuat.
  useEffect(() => {
    if (hash === '#komentar' && proposal) {
      document.getElementById('komentar')?.scrollIntoView({ block: 'start' });
    }
  }, [hash, proposal]);

  if (proposalId === null) {
    return (
      <EmptyState
        title="Usulan tidak ditemukan"
        description="Alamat usulan tidak valid."
        action={
          <Link to="/" className="text-sm font-semibold text-warga underline">
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
          <Link to="/" className="text-sm font-semibold text-warga underline">
            Kembali ke beranda
          </Link>
        }
      />
    );
  }

  const history = historyQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/"
          className="inline-flex text-[13px] text-muted transition-colors duration-150 hover:text-ink"
        >
          ← Kembali ke daftar usulan
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <CategoryTile kategori={proposal.kategori} />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink sm:text-[28px]">
                {proposal.judul}
              </h1>
              <p className="text-sm text-muted">{proposal.kategori}</p>
            </div>
          </div>
          <StatusBadge status={proposal.status} />
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-bold text-ink">Perjalanan usulan</h2>
        <p className="mb-5 text-sm text-muted">Lima tahap dari diajukan sampai selesai.</p>
        {historyQuery.isPending ? (
          <div className="grid gap-3 sm:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <StatusTimeline status={proposal.status as ProposalStatus} history={history} />
        )}
        {historyQuery.isError && (
          <p className="mt-3 text-xs text-red-700">
            Riwayat gagal dimuat, tetapi status terkini tetap ditampilkan.
          </p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <p className="whitespace-pre-line text-ink">{proposal.deskripsi}</p>
            <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-rule pt-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[13px] text-muted">Estimasi biaya</dt>
                <dd className="mt-0.5 text-lg font-semibold tracking-[-0.01em]">
                  {formatRupiah(proposal.estimasi_biaya)}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">Lokasi</dt>
                <dd className="mt-0.5 font-semibold">{proposal.lokasi || 'Belum diisi'}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">Diusulkan oleh</dt>
                <dd className="mt-0.5 font-semibold">{proposal.pengusul_nama}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">Tanggal diajukan</dt>
                <dd className="mt-0.5 font-semibold">{formatTanggal(proposal.dibuat_pada)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-bold">Lokasi</h2>
            <LokasiUsulan proposal={proposal} />
          </Card>

          <div id="komentar" className="scroll-mt-6 lg:scroll-mt-28">
            <CommentSection proposalId={proposal.id} />
          </div>
        </div>

        <aside className="stagger space-y-6 lg:sticky lg:top-6 lg:self-start">
          <VotePanel proposal={proposal} />
          <Card>
            <h2 className="text-lg font-bold text-ink">Riwayat perubahan</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Belum ada perubahan status tercatat.</p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {[...history].reverse().map((item) => (
                  <li
                    key={item.id}
                    className="border-t border-rule pt-3 first:border-t-0 first:pt-0"
                  >
                    <p className="text-sm font-semibold">{item.status_baru}</p>
                    <p className="text-[12.5px] text-muted">
                      {formatTanggalWaktu(item.diubah_pada)} · {item.diubah_oleh_nama ?? 'Sistem'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
