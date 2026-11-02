import { idSchema, type ProposalStatus } from '@musrenbang/shared';
import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/PageLoader';
import { Skeleton } from '@/components/ui/Skeleton';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { KeteranganWilayah, LokasiUsulan } from '@/components/map/LokasiUsulan';
import { wilayahDariTitik } from '@/lib/wilayah';
import { CommentSection } from '@/features/comments/components/CommentSection';
import { ModerationBadge } from '@/features/proposals/components/ModerationBadge';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';
import { StatusTimeline } from '@/features/proposals/components/StatusTimeline';
import { VotePanel } from '@/features/proposals/components/VotePanel';
import { useProposalQuery, useStatusHistoryQuery } from '@/features/proposals/queries';
import { formatRupiah, formatTanggal, formatTanggalWaktu } from '@/lib/format';

export default function UsulanDetail() {
  const { id } = useParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  // Kembali ke halaman asal (daftar, Usulanku, Beranda). Kalau usulan dibuka langsung dari
  // tautan tanpa riwayat, jatuh ke daftar usulan warga.
  const kembali = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/usulan');
  };
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
          <Link to="/beranda" className="text-sm font-semibold text-warga underline">
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
          <Link to="/beranda" className="text-sm font-semibold text-warga underline">
            Kembali ke beranda
          </Link>
        }
      />
    );
  }

  const history = historyQuery.data ?? [];
  const disetujui = proposal.moderasi === 'Disetujui';

  const kartuRiwayat = (
    <Card>
      <h2 className="text-lg font-bold text-ink">Riwayat perubahan</h2>
      {history.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Belum ada perubahan status tercatat.</p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {[...history].reverse().map((item) => (
            <li key={item.id} className="border-t border-rule pt-3 first:border-t-0 first:pt-0">
              <p className="text-sm font-semibold">{item.status_baru}</p>
              <p className="text-[12.5px] text-muted">
                {formatTanggalWaktu(item.diubah_pada)} · {item.diubah_oleh_nama ?? 'Sistem'}
              </p>
              {item.catatan && <p className="mt-1 text-[13px] text-ink">Catatan: {item.catatan}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={kembali}
          aria-label="Kembali ke halaman sebelumnya"
          title="Kembali"
          className="group/kembali grid size-10 place-items-center rounded-xl border border-border bg-surface text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
        >
          <span className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/kembali:-translate-x-0.5 motion-reduce:transition-none">
            <Icon name="kembali" size={20} />
          </span>
        </button>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <CategoryTile kategori={proposal.kategori} />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink sm:text-[28px] [overflow-wrap:anywhere]">
                {proposal.judul}
              </h1>
              <p className="text-sm text-muted">{proposal.kategori}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!disetujui && <ModerationBadge moderasi={proposal.moderasi} />}
            <StatusBadge status={proposal.status} />
          </div>
        </div>
      </div>

      {!disetujui && (
        <p
          role="status"
          className="rounded-2xl bg-mustard-pucat px-4 py-3 text-sm text-mustard-tua"
        >
          {proposal.moderasi === 'Menunggu'
            ? 'Usulan ini menunggu persetujuan admin. Sampai disetujui, hanya kamu dan admin yang bisa melihatnya, dan belum bisa di-upvote atau dikomentari.'
            : `Usulan ini ditolak${proposal.catatan_moderasi ? `: ${proposal.catatan_moderasi}` : '.'} Hanya kamu dan admin yang bisa melihatnya.`}
        </p>
      )}

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
          <StatusTimeline
            status={proposal.status as ProposalStatus}
            history={history}
            moderasi={proposal.moderasi}
          />
        )}
        {historyQuery.isError && (
          <p className="mt-3 text-xs text-red-700">
            Riwayat gagal dimuat, tetapi status terkini tetap ditampilkan.
          </p>
        )}
      </Card>

      {/* Baris berpasangan: tiap baris dua kartu setinggi sama, jadi tidak ada kolom yang lebih
          panjang dan menyisakan ruang kosong. Di layar sempit semuanya menumpuk berurutan. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <p className="whitespace-pre-line text-ink [overflow-wrap:anywhere]">
            {proposal.deskripsi}
          </p>
          <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-rule pt-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[13px] text-muted">Estimasi biaya</dt>
              <dd className="mt-0.5 text-lg font-semibold tracking-[-0.01em]">
                {formatRupiah(proposal.estimasi_biaya)}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">Lokasi</dt>
              <dd className="mt-0.5 font-semibold [overflow-wrap:anywhere]">
                {proposal.lokasi || 'Belum diisi'}
              </dd>
              {proposal.latitude !== null && proposal.longitude !== null && (
                <dd className="mt-1">
                  <KeteranganWilayah
                    wilayah={wilayahDariTitik(proposal.latitude, proposal.longitude)}
                  />
                </dd>
              )}
            </div>
            <div>
              <dt className="text-[13px] text-muted">Diusulkan oleh</dt>
              <dd className="mt-0.5 font-semibold [overflow-wrap:anywhere]">
                {proposal.pengusul_nama}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">Tanggal diajukan</dt>
              <dd className="mt-0.5 font-semibold">{formatTanggal(proposal.dibuat_pada)}</dd>
            </div>
          </dl>
        </Card>

        {disetujui ? <VotePanel proposal={proposal} /> : kartuRiwayat}

        <Card className={disetujui ? undefined : 'lg:col-span-2'}>
          <h2 className="mb-3 text-lg font-bold">Lokasi</h2>
          <LokasiUsulan proposal={proposal} />
        </Card>

        {disetujui && kartuRiwayat}

        <div id="komentar" className="scroll-mt-6 lg:col-span-2 lg:scroll-mt-28">
          {disetujui && <CommentSection proposalId={proposal.id} />}
        </div>
      </div>
    </div>
  );
}
