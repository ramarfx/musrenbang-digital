import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/PageLoader';
import { CatatanDialog } from '@/features/admin/components/CatatanDialog';
import { DialogHapusUsulan } from '@/features/admin/components/DialogHapusUsulan';
import { DialogUbahStatusUsulan } from '@/features/admin/components/DialogUbahStatusUsulan';
import { RincianUsulan } from '@/features/admin/components/RincianUsulan';
import { useModerateProposalMutation } from '@/features/admin/queries';
import { useProposalQuery, useStatusHistoryQuery } from '@/features/proposals/queries';

type Aksi = 'setujui' | 'tolak' | 'status' | 'hapus' | null;

/** Halaman rincian satu usulan untuk admin: baca isinya, lihat riwayat, lalu putuskan. */
export default function UsulanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const lokasi = useLocation();
  const proposalId = Number(id);
  const valid = Number.isInteger(proposalId) && proposalId > 0;

  const proposalQuery = useProposalQuery(valid ? proposalId : null);
  const historyQuery = useStatusHistoryQuery(valid ? proposalId : null);
  const moderationMutation = useModerateProposalMutation();

  const [aksi, setAksi] = useState<Aksi>(null);

  const proposal = proposalQuery.data ?? null;
  const history = historyQuery.data ?? [];

  const bukaSetujui = () => {
    moderationMutation.reset();
    setAksi('setujui');
  };

  const bukaTolak = () => {
    moderationMutation.reset();
    setAksi('tolak');
  };

  const bukaUbahStatus = () => {
    setAksi('status');
  };

  const bukaHapus = () => {
    setAksi('hapus');
  };

  const setujui = () => {
    if (!proposal) return;
    moderationMutation.mutate(
      { proposalId: proposal.id, moderasi: 'Disetujui' },
      {
        onSuccess: () => {
          toast.success('Usulan disetujui dan tampil publik.');
          setAksi(null);
        },
      },
    );
  };

  const kirimTolak = (catatan: string) => {
    if (!proposal) return;
    moderationMutation.mutate(
      { proposalId: proposal.id, moderasi: 'Ditolak', catatan },
      {
        onSuccess: () => {
          toast.success('Usulan ditolak. Alasannya terlihat oleh pembuatnya.');
          setAksi(null);
        },
      },
    );
  };

  if (!valid) {
    return (
      <EmptyState
        title="Usulan tidak ditemukan"
        description="Alamat halaman ini tidak memuat nomor usulan yang valid."
        action={
          <Link to="/admin/usulan" className={buttonClass('outline', 'md')}>
            Kembali ke semua usulan
          </Link>
        }
      />
    );
  }

  if (proposalQuery.isPending) {
    return <PageLoader label="Memuat usulan..." />;
  }

  if (proposalQuery.isError) {
    return (
      <ErrorState
        message={proposalQuery.error.message}
        onRetry={() => void proposalQuery.refetch()}
      />
    );
  }

  if (!proposal) {
    return (
      <EmptyState
        title="Usulan tidak ditemukan"
        description="Usulan ini mungkin sudah dihapus."
        action={
          <Link to="/admin/usulan" className={buttonClass('outline', 'md')}>
            Kembali ke semua usulan
          </Link>
        }
      />
    );
  }

  // Daftar asal membawa penyaringnya di alamat (?tahap=Dikerjakan), jadi kembali ke alamat itu
  // persis, bukan ke daftar kosong. Hanya alamat admin yang dipercaya.
  const dari = (lokasi.state as { dari?: unknown } | null)?.dari;
  const kembali =
    typeof dari === 'string' && dari.startsWith('/admin/')
      ? dari
      : proposal.moderasi === 'Menunggu'
        ? '/admin/perlu-diperiksa'
        : '/admin/usulan';
  const labelKembali = proposal.moderasi === 'Menunggu' ? 'Perlu diperiksa' : 'Semua usulan';

  return (
    <div className="space-y-5">
      <Link
        to={kembali}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-warga hover:underline"
      >
        <Icon name="kembali" size={18} />
        Kembali ke {labelKembali}
      </Link>

      <RincianUsulan
        proposal={proposal}
        history={history}
        historyMemuat={historyQuery.isPending}
        historyGalat={historyQuery.isError}
        onMuatUlangRiwayat={() => void historyQuery.refetch()}
        onSetujui={bukaSetujui}
        onTolak={bukaTolak}
        onUbahStatus={bukaUbahStatus}
        onHapus={bukaHapus}
      />

      <Modal
        open={aksi === 'setujui'}
        onClose={() => setAksi(null)}
        labelledBy="judul-setujui-usulan"
        className="w-[min(520px,calc(100vw-24px))]"
      >
        <div className="p-5 sm:p-6">
          <h2 id="judul-setujui-usulan" className="text-xl font-bold">
            Setujui usulan ini?
          </h2>
          <p className="mt-2 text-sm font-semibold [overflow-wrap:anywhere]">{proposal.judul}</p>
          <p className="mt-2 text-sm text-muted">
            Usulan akan tampil di halaman publik dan bisa didukung warga. Kamu masih bisa menolaknya
            nanti bila perlu.
          </p>
          {moderationMutation.isError && (
            <div className="mt-3">
              <ErrorState title="Gagal menyetujui" message={moderationMutation.error.message} />
            </div>
          )}
          <div className="mt-5 flex flex-wrap justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAksi(null)}
              disabled={moderationMutation.isPending}
            >
              Batal
            </Button>
            <Button type="button" isLoading={moderationMutation.isPending} onClick={setujui}>
              Setujui usulan
            </Button>
          </div>
        </div>
      </Modal>

      <CatatanDialog
        open={aksi === 'tolak'}
        onClose={() => setAksi(null)}
        judul="Tolak usulan"
        keterangan={`${proposal.judul}. Alasan ini terlihat oleh pembuat usulan di halaman Usulan saya.`}
        labelCatatan="Alasan penolakan"
        kirim="Tolak usulan"
        isPending={moderationMutation.isPending}
        errorMessage={moderationMutation.error?.message}
        onSubmit={kirimTolak}
      />

      {aksi === 'status' && (
        <DialogUbahStatusUsulan proposal={proposal} onClose={() => setAksi(null)} />
      )}

      {aksi === 'hapus' && (
        <DialogHapusUsulan
          proposal={proposal}
          onClose={() => setAksi(null)}
          onDeleted={() => navigate('/admin/usulan')}
        />
      )}
    </div>
  );
}
