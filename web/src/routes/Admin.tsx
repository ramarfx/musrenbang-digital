import { PROPOSAL_STATUSES, type Proposal, type ProposalStatus } from '@musrenbang/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { Select } from '@/components/ui/Select';
import { AdminProposalTable } from '@/features/admin/components/AdminProposalTable';
import { CatatanDialog } from '@/features/admin/components/CatatanDialog';
import { AntreanTinjau } from '@/features/admin/components/AntreanTinjau';
import { RincianUsulan } from '@/features/admin/components/RincianUsulan';
import {
  useAdminStatsQuery,
  useModerateProposalMutation,
  useUpdateProposalStatusMutation,
} from '@/features/admin/queries';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';
import { useProposalsQuery } from '@/features/proposals/queries';
import { formatAngka } from '@/lib/format';

function Angka({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="min-w-0 flex-1 basis-32 px-4 py-3 first:pl-0 last:pr-0 sm:border-l sm:border-rule sm:first:border-l-0">
      <p className="truncate text-[13px] text-muted">{label}</p>
      <p className="text-xl font-bold tabular-nums">{formatAngka(nilai)}</p>
    </div>
  );
}

export default function Admin() {
  const proposalsQuery = useProposalsQuery();
  const statsQuery = useAdminStatsQuery(true);
  const statusMutation = useUpdateProposalStatusMutation();
  const moderasiMutation = useModerateProposalMutation();
  const proposals = proposalsQuery.data ?? [];

  const [terpilihId, setTerpilihId] = useState<number | null>(null);
  const [ubahStatus, setUbahStatus] = useState<Proposal | null>(null);
  const [statusBaru, setStatusBaru] = useState<ProposalStatus>('Diverifikasi');
  const [tolak, setTolak] = useState<Proposal | null>(null);
  const [sedangDiproses, setSedangDiproses] = useState<number | null>(null);

  const stats = statsQuery.data ?? null;
  // Cadangan kalau view statistik belum ada di server: hitung dari daftar usulan yang terbaca.
  const hitungStatus = (status: ProposalStatus) =>
    stats?.usulan_per_status[status] ??
    proposals.filter((proposal) => proposal.status === status).length;
  const menungguModerasi =
    stats?.usulan_per_moderasi.Menunggu ??
    proposals.filter((proposal) => proposal.moderasi === 'Menunggu').length;

  const bukaUbahStatus = (proposal: Proposal) => {
    statusMutation.reset();
    const lain = PROPOSAL_STATUSES.filter((status) => status !== proposal.status);
    const berikutnya = PROPOSAL_STATUSES[PROPOSAL_STATUSES.indexOf(proposal.status) + 1];
    setStatusBaru(berikutnya ?? lain[0] ?? proposal.status);
    setUbahStatus(proposal);
  };

  const kirimStatus = (catatan: string) => {
    if (!ubahStatus) return;
    statusMutation.mutate(
      { proposalId: ubahStatus.id, status: statusBaru, catatan },
      {
        onSuccess: () => {
          toast.success(`Status "${ubahStatus.judul}" diubah menjadi ${statusBaru}.`);
          setUbahStatus(null);
        },
      },
    );
  };

  const setujui = (proposal: Proposal) => {
    setSedangDiproses(proposal.id);
    moderasiMutation.mutate(
      { proposalId: proposal.id, moderasi: 'Disetujui' },
      {
        onSuccess: () => toast.success(`"${proposal.judul}" disetujui dan tampil publik.`),
        onError: (error) => toast.error(error.message),
        onSettled: () => setSedangDiproses(null),
      },
    );
  };

  const bukaTolak = (proposal: Proposal) => {
    moderasiMutation.reset();
    setTolak(proposal);
  };

  const kirimTolak = (catatan: string) => {
    if (!tolak) return;
    moderasiMutation.mutate(
      { proposalId: tolak.id, moderasi: 'Ditolak', catatan },
      {
        onSuccess: () => {
          toast.success(`"${tolak.judul}" ditolak. Alasannya terlihat oleh pembuatnya.`);
          setTolak(null);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin: kelola usulan"
        description="Setujui atau tolak usulan baru, lalu perbarui status kemajuannya. Setiap perubahan status wajib memakai catatan dan tercatat di riwayat."
      />

      <Card as="section" aria-label="Ringkasan" className="anim-page">
        <div className="flex flex-wrap">
          {stats ? (
            <>
              <Angka label="Pengguna terdaftar" nilai={stats.total_pengguna} />
              <Angka label="Usulan" nilai={stats.total_usulan} />
              <Angka label="Upvote" nilai={stats.total_suara} />
              <Angka label="Warga yang mengurutkan" nilai={stats.jumlah_partisipan_alokasi} />
            </>
          ) : (
            <>
              <Angka label="Usulan terbaca" nilai={proposals.length} />
              <Angka label="Menunggu persetujuan" nilai={menungguModerasi} />
            </>
          )}
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule pt-3 text-[13px] text-muted">
          <span>Status kemajuan:</span>
          {PROPOSAL_STATUSES.map((status) => (
            <span key={status}>
              {status} <b className="text-ink tabular-nums">{formatAngka(hitungStatus(status))}</b>
            </span>
          ))}
        </p>
        {!stats && !statsQuery.isPending && (
          <p className="mt-2 text-[13px] text-muted">
            Statistik lengkap (pengguna, upvote, peserta simulator) belum tersedia di server, jadi
            angka di atas dihitung dari daftar usulan yang terbaca.
          </p>
        )}
      </Card>

      {proposalsQuery.isPending && <PageLoader label="Memuat usulan..." />}

      {proposalsQuery.isError && (
        <ErrorState
          message={proposalsQuery.error.message}
          onRetry={() => {
            void proposalsQuery.refetch();
          }}
        />
      )}

      {proposalsQuery.isSuccess && proposals.length === 0 && (
        <Card>
          <p className="text-ink/80">Belum ada usulan untuk dikelola.</p>
        </Card>
      )}

      {proposals.length > 0 && (
        <>
          <div className="stagger grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <AntreanTinjau
              proposals={proposals}
              terpilihId={terpilihId}
              onPilih={setTerpilihId}
              sedangDiproses={sedangDiproses}
              onSetujui={setujui}
            />
            <RincianUsulan
              proposal={proposals.find((proposal) => proposal.id === terpilihId) ?? null}
              sedangDiproses={sedangDiproses}
              onSetujui={setujui}
              onTolak={bukaTolak}
              onUbahStatus={bukaUbahStatus}
            />
          </div>

          <section aria-labelledby="judul-semua-usulan" className="space-y-3">
            <h2 id="judul-semua-usulan" className="text-lg font-bold">
              Semua usulan
            </h2>
            <AdminProposalTable proposals={proposals} onUbahStatus={bukaUbahStatus} />
          </section>
        </>
      )}

      <CatatanDialog
        open={ubahStatus !== null}
        onClose={() => setUbahStatus(null)}
        judul="Ubah status usulan"
        keterangan={
          ubahStatus && (
            <>
              {ubahStatus.judul}. Status sekarang <StatusBadge status={ubahStatus.status} />
            </>
          )
        }
        labelCatatan="Catatan perubahan"
        kirim="Simpan status"
        bisaKirim={ubahStatus !== null && statusBaru !== ubahStatus.status}
        isPending={statusMutation.isPending}
        errorMessage={statusMutation.error?.message}
        onSubmit={kirimStatus}
        tambahan={
          <div className="space-y-1.5">
            <label htmlFor="status-baru" className="block text-sm font-medium">
              Status baru
            </label>
            <Select
              id="status-baru"
              value={statusBaru}
              onChange={(event) => setStatusBaru(event.target.value as ProposalStatus)}
            >
              {PROPOSAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      <CatatanDialog
        open={tolak !== null}
        onClose={() => setTolak(null)}
        judul="Tolak usulan"
        keterangan={
          tolak && `${tolak.judul}. Alasan ini terlihat oleh pembuat usulan di halaman Usulan saya.`
        }
        labelCatatan="Alasan penolakan"
        kirim="Tolak usulan"
        isPending={moderasiMutation.isPending}
        errorMessage={moderasiMutation.error?.message}
        onSubmit={kirimTolak}
      />
    </div>
  );
}
