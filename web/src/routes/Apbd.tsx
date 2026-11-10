import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { ApbdTable } from '@/features/apbd/components/ApbdTable';
import { DokumenResmiKartu } from '@/features/apbd/components/DokumenResmiKartu';
import { useApbdQuery } from '@/features/apbd/queries';
import { useAppConfigQuery } from '@/features/config/queries';

export default function Apbd() {
  const apbdQuery = useApbdQuery();
  const configQuery = useAppConfigQuery();
  const items = apbdQuery.data ?? [];
  const kota = items[0]?.kota ?? configQuery.data?.kota ?? 'DKI Jakarta';
  const tahun = items[0]?.tahun ?? configQuery.data?.tahunAnggaran ?? 2025;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`APBD ${kota} ${tahun}`}
        description="Perbandingan di halaman Bandingkan hanya memakai angka yang sudah terverifikasi dan bertautan ke sumber resminya. Angka yang belum terverifikasi tetap tampil di sini dengan statusnya."
      />

      <DokumenResmiKartu />

      {apbdQuery.isPending && <PageLoader label="Memuat data APBD..." />}

      {apbdQuery.isError && (
        <ErrorState
          message={apbdQuery.error.message}
          onRetry={() => {
            void apbdQuery.refetch();
          }}
        />
      )}

      {apbdQuery.isSuccess && items.length === 0 && (
        <EmptyState
          title="Data APBD belum tersedia"
          description="Belum ada baris APBD yang bisa ditampilkan sekarang. Coba lagi nanti."
        />
      )}

      {items.length > 0 && <ApbdTable items={items} />}
    </div>
  );
}
