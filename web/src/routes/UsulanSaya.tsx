import { PROPOSAL_STATUSES, type ProposalStatus } from '@musrenbang/shared';
import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth';
import { ProposalCard } from '@/features/proposals/components/ProposalCard';
import { useProposalsQuery } from '@/features/proposals/queries';
import { formatAngka } from '@/lib/format';

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
            className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Ringkasan usulanmu"
          >
            <Card>
              <p className="text-sm text-muted">Usulanmu</p>
              <p className="text-2xl font-bold tabular-nums">{formatAngka(milikku.length)}</p>
            </Card>
            <Card>
              <p className="text-sm text-muted">Menunggu persetujuan</p>
              <p className="text-2xl font-bold tabular-nums">{formatAngka(menunggu)}</p>
              {ditolak > 0 && (
                <p className="mt-0.5 text-[13px] text-muted">{formatAngka(ditolak)} ditolak</p>
              )}
            </Card>
            <Card>
              <p className="text-sm text-muted">Upvote terkumpul</p>
              <p className="text-2xl font-bold tabular-nums">{formatAngka(totalUpvote)}</p>
            </Card>
            <Card>
              <p className="text-sm text-muted">Sudah masuk APBD atau lebih</p>
              <p className="text-2xl font-bold tabular-nums">{formatAngka(sudahDitindaklanjuti)}</p>
            </Card>
          </section>

          <div className="stagger grid gap-4 md:grid-cols-2">
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
