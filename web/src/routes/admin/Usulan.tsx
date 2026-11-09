import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { DaftarUsulanAdmin } from '@/features/admin/components/DaftarUsulanAdmin';
import { useProposalsQuery } from '@/features/proposals/queries';

/** Daftar seluruh usulan, dengan pencarian dan penyaring. */
export default function Usulan() {
  const proposalsQuery = useProposalsQuery();
  const proposals = proposalsQuery.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Semua usulan"
        description="Cari usulan berdasarkan judul, pengusul, kategori, persetujuan, atau tahap."
      />

      {proposalsQuery.isPending ? (
        <PageLoader label="Memuat semua usulan..." />
      ) : proposalsQuery.isError ? (
        <ErrorState
          message={proposalsQuery.error.message}
          onRetry={() => void proposalsQuery.refetch()}
        />
      ) : (
        <DaftarUsulanAdmin proposals={proposals} />
      )}
    </div>
  );
}
