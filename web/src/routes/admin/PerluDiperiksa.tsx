import { useMemo } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { AntreanTinjau } from '@/features/admin/components/AntreanTinjau';
import { useProposalsQuery } from '@/features/proposals/queries';

/** Antrean kerja admin: hanya usulan yang belum disetujui atau ditolak. */
export default function PerluDiperiksa() {
  const proposalsQuery = useProposalsQuery();
  const proposals = proposalsQuery.data ?? [];

  const menunggu = useMemo(
    () =>
      proposals
        .filter((proposal) => proposal.moderasi === 'Menunggu')
        .sort((a, b) => new Date(a.dibuat_pada).getTime() - new Date(b.dibuat_pada).getTime()),
    [proposals],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Perlu diperiksa"
        description="Usulan baru yang belum diputuskan. Buka satu usulan untuk membaca isinya, lalu setujui atau tolak."
      />

      {proposalsQuery.isPending ? (
        <PageLoader label="Memuat usulan yang menunggu..." />
      ) : proposalsQuery.isError ? (
        <ErrorState
          message={proposalsQuery.error.message}
          onRetry={() => void proposalsQuery.refetch()}
        />
      ) : (
        <AntreanTinjau proposals={menunggu} />
      )}
    </div>
  );
}
