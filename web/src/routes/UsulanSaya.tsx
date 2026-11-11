import { PROPOSAL_STATUSES, type ProposalStatus } from '@musrenbang/shared';
import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth';
import { ProposalCard } from '@/features/proposals/components/ProposalCard';
import { useProposalsQuery } from '@/features/proposals/queries';
import { formatAngka } from '@/lib/format';

/**
 * Kartu angka ringkasan: ikon di kotak kiri, label dan angka di kanan. Warna kotak ikon hanya
 * bermakna untuk dua status (kuning menunggu, hijau masuk APBD), sama dengan warna status di
 * seluruh aplikasi; lainnya netral.
 */
function KartuAngka({
  ikon,
  warna,
  label,
  angka,
  catatan,
}: {
  ikon: IconName;
  warna: string;
  label: string;
  angka: number;
  catatan?: string;
}) {
  return (
    <Card className="flex items-center gap-3.5 p-3 max-sm:flex-col max-sm:items-start max-sm:gap-2 sm:p-5">
      <span
        aria-hidden="true"
        className="grid size-10 flex-none place-items-center rounded-xl border-[1.5px] border-ink text-[#14222B] sm:size-12 sm:rounded-[14px]"
        style={{ backgroundColor: warna }}
      >
        <Icon name={ikon} size={24} />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="text-2xl leading-tight font-bold tabular-nums">{formatAngka(angka)}</p>
        {catatan && <p className="mt-0.5 text-[13px] text-muted">{catatan}</p>}
      </div>
    </Card>
  );
}

/** Tahap "Masuk APBD" ke atas dihitung sebagai usulan yang sudah ditindaklanjuti. */
const TAHAP_TINDAK_LANJUT = PROPOSAL_STATUSES.indexOf('Masuk APBD');

/**
 * Halaman Usulan Saya (PRD FR-05): usulan milik pengguna beserta status dan upvote-nya.
 * Dibaca dari daftar usulan publik yang sama dengan Beranda, disaring menurut pembuatnya.
 * Usulan baru berstatus Menunggu sampai admin menyetujui; usulan yang ditolak tetap terlihat di
 * sini beserta alasannya.
 */
export default function UsulanSaya() {
  const { user } = useAuth();
  const proposalsQuery = useProposalsQuery();
  const milikku = (proposalsQuery.data ?? []).filter(
    (proposal) => user !== null && proposal.pengusul_id === user.id,
  );
  const menunggu = milikku.filter((proposal) => proposal.moderasi === 'Menunggu').length;
  const ditolak = milikku.filter((proposal) => proposal.moderasi === 'Ditolak').length;
  const totalUpvote = milikku.reduce((sum, proposal) => sum + proposal.jumlah_suara, 0);
  const sudahDitindaklanjuti = milikku.filter(
    (proposal) =>
      PROPOSAL_STATUSES.indexOf(proposal.status as ProposalStatus) >= TAHAP_TINDAK_LANJUT,
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usulan saya"
        description="Usulan yang kamu buat, beserta persetujuan admin, statusnya, dan jumlah upvote dari warga."
        actions={
          <Link to="/usulan/baru" className={buttonClass('primary', 'md')}>
            Buat usulan
          </Link>
        }
      />

      {proposalsQuery.isPending && <ListSkeleton />}

      {proposalsQuery.isError && (
        <ErrorState
          message={proposalsQuery.error.message}
          onRetry={() => {
            void proposalsQuery.refetch();
          }}
        />
      )}

      {proposalsQuery.isSuccess && milikku.length === 0 && (
        <EmptyState
          title="Kamu belum membuat usulan"
          description="Usulkan satu program pembangunan untuk lingkunganmu dan tandai lokasinya di peta. Setelah admin menyetujuinya, usulanmu tampil publik dan bisa di-upvote warga lain."
          action={
            <Link to="/usulan/baru" className={buttonClass('primary', 'md')}>
              Buat usulan pertama
            </Link>
          }
        />
      )}

      {milikku.length > 0 && (
        <>
          <section
            className="stagger grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4"
            aria-label="Ringkasan usulanmu"
          >
            <KartuAngka ikon="usulan" warna="#E4DDCF" label="Usulanmu" angka={milikku.length} />
            <KartuAngka
              ikon="jam"
              warna="#F6D98B"
              label="Menunggu persetujuan"
              angka={menunggu}
              catatan={ditolak > 0 ? `${formatAngka(ditolak)} ditolak` : undefined}
            />
            <KartuAngka ikon="panah-atas" warna="#E4DDCF" label="Upvote terkumpul" angka={totalUpvote} />
            <KartuAngka
              ikon="apbd"
              warna="#4FC79C"
              label="Sudah masuk APBD atau lebih"
              angka={sudahDitindaklanjuti}
            />
          </section>

          <div className="grid auto-rows-fr gap-2.5 min-[350px]:grid-cols-2 md:gap-5">
            {[...milikku]
              .sort((a, b) => new Date(b.dibuat_pada).getTime() - new Date(a.dibuat_pada).getTime())
              .map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
