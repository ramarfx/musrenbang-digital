import { PROPOSAL_STATUSES, type Proposal, type ProposalStatus } from '@musrenbang/shared';
import { useState, type CSSProperties } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
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
import { cn } from '@/lib/cn';
import { formatAngka } from '@/lib/format';

function Angka({ ikon, label, nilai }: { ikon: IconName; label: string; nilai: number }) {
  return (
    <div className="kartu-cap flex items-center gap-3 rounded-2xl bg-surface p-3.5">
      <span
        aria-hidden="true"
        className="grid size-10 flex-none place-items-center rounded-[13px] border-[1.5px] border-edge bg-surface text-ink shadow-[0_3px_0_var(--edge)]"
      >
        <Icon name={ikon} size={20} />
      </span>
      <span className="min-w-0">
        <b className="block text-xl font-bold tabular-nums">{formatAngka(nilai)}</b>
        <span className="block truncate text-[13px] text-muted">{label}</span>
      </span>
    </div>
  );
}

/** Warna batang tiap tahap kemajuan, dari Diajukan sampai Selesai. */
const WARNA_TAHAP = ['#F6D98B', '#A9E0DC', '#4FC79C', '#F5C79B', '#D9CCF0'] as const;

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
  const terbanyak = Math.max(0, ...PROPOSAL_STATUSES.map((status) => hitungStatus(status)));
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

      <section aria-label="Ringkasan" className="space-y-3">
        <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats ? (
            <>
              <Angka ikon="profil" label="Pengguna terdaftar" nilai={stats.total_pengguna} />
              <Angka ikon="usulan" label="Usulan" nilai={stats.total_usulan} />
              <Angka ikon="panah-atas" label="Upvote" nilai={stats.total_suara} />
              <Angka
                ikon="simulator"
                label="Warga yang mengurutkan"
                nilai={stats.jumlah_partisipan_alokasi}
              />
            </>
          ) : (
            <>
              <Angka ikon="usulan" label="Usulan terbaca" nilai={proposals.length} />
              <Angka ikon="lonceng" label="Menunggu persetujuan" nilai={menungguModerasi} />
            </>
          )}
        </div>
        <ol
          aria-label="Usulan per status kemajuan"
          className="kartu-cap grid h-[148px] grid-cols-5 gap-3 rounded-2xl bg-surface px-4 pt-3 pb-3"
        >
          {PROPOSAL_STATUSES.map((status, index) => {
            const jumlah = hitungStatus(status);
            // Tinggi batang mengikuti jumlah terbanyak, jadi ukuran kartunya tidak pernah berubah.
            const persen = terbanyak > 0 ? (jumlah / terbanyak) * 100 : 0;
            return (
              <li
                key={status}
                style={{ '--urutan': index } as CSSProperties}
                className="flex min-w-0 flex-col text-center"
              >
                <b className="text-base font-bold tabular-nums">{formatAngka(jumlah)}</b>
                <span className="flex min-h-0 flex-1 items-end justify-center pt-1.5">
                  <span
                    aria-hidden="true"
                    style={{
                      height: jumlah > 0 ? `max(${persen}%, 10px)` : '3px',
                      backgroundColor: jumlah > 0 ? WARNA_TAHAP[index] : undefined,
                    }}
                    className={cn(
                      'batang-tahap w-full max-w-9 rounded-t-md',
                      jumlah > 0 ? 'border-[1.5px] border-b-0 border-edge' : 'bg-track',
                    )}
                  />
                </span>
                <span
                  className={cn(
                    'mt-2 block truncate border-t-2 border-ink pt-1.5 text-[13px]',
                    jumlah > 0 ? 'font-semibold text-ink' : 'text-muted',
                  )}
                >
                  {status}
                </span>
              </li>
            );
          })}
        </ol>
        {!stats && !statsQuery.isPending && (
          <p className="text-[13px] text-muted">
            Statistik lengkap (pengguna, upvote, peserta simulator) belum tersedia di server, jadi
            angka di atas dihitung dari daftar usulan yang terbaca.
          </p>
        )}
      </section>

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
              onTolak={bukaTolak}
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
