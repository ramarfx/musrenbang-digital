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
import { ModerationQueue } from '@/features/admin/components/ModerationQueue';
import {
  useAdminStatsQuery,
  useModerateProposalMutation,
  useUpdateProposalStatusMutation,
} from '@/features/admin/queries';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';
import { useProposalsQuery } from '@/features/proposals/queries';
import { cn } from '@/lib/cn';
import { formatAngka } from '@/lib/format';

type Tab = 'moderasi' | 'status';

function Angka({ label, nilai }: { label: string; nilai: number }) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{formatAngka(nilai)}</p>
    </Card>
  );
}

export default function Admin() {
  const proposalsQuery = useProposalsQuery();
  const statsQuery = useAdminStatsQuery(true);
  const statusMutation = useUpdateProposalStatusMutation();
  const moderasiMutation = useModerateProposalMutation();
  const proposals = proposalsQuery.data ?? [];

  const [tab, setTab] = useState<Tab>('moderasi');
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

      <section className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Ringkasan">
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
      </section>
      {!stats && !statsQuery.isPending && (
        <p className="text-[13px] text-muted">
          Statistik lengkap (pengguna, upvote, peserta simulator) belum tersedia di server, jadi
          angka di atas dihitung dari daftar usulan yang terbaca.
        </p>
      )}

      <section
        className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        aria-label="Usulan per status kemajuan"
      >
        {PROPOSAL_STATUSES.map((status) => (
          <Card key={status}>
            <p className="text-sm text-muted">{status}</p>
            <p className="text-xl font-bold tabular-nums">{formatAngka(hitungStatus(status))}</p>
          </Card>
        ))}
      </section>

      <div
        role="group"
        aria-label="Bagian admin"
        className="inline-flex rounded-xl border border-border bg-surface p-0.5"
      >
        {(
          [
            ['moderasi', `Moderasi (${menungguModerasi} menunggu)`],
            ['status', 'Status kemajuan'],
          ] as const
        ).map(([nilai, label]) => (
          <button
            key={nilai}
            type="button"
            aria-pressed={tab === nilai}
            onClick={() => setTab(nilai)}
            className={cn(
              'h-9 rounded-[10px] px-3.5 text-[13px] font-semibold transition-[scale,background-color,color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
              tab === nilai ? 'bg-ink text-white' : 'text-muted hover:bg-active hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>

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

      {proposals.length > 0 && tab === 'moderasi' && (
        <ModerationQueue
          proposals={proposals}
          sedangDiproses={sedangDiproses}
          onSetujui={setujui}
          onTolak={bukaTolak}
        />
      )}

      {proposals.length > 0 && tab === 'status' && (
        <AdminProposalTable proposals={proposals} onUbahStatus={bukaUbahStatus} />
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
