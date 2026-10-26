import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { ApbdTable } from '@/features/apbd/components/ApbdTable';
import { useApbdQuery } from '@/features/apbd/queries';
import { useAppConfigQuery } from '@/features/config/queries';
import { formatRupiah } from '@/lib/format';

export default function Apbd() {
  const apbdQuery = useApbdQuery();
  const configQuery = useAppConfigQuery();
  const items = apbdQuery.data ?? [];
  const total = items.reduce((sum, item) => sum + item.nominal_rp, 0);
  const kota = items[0]?.kota ?? configQuery.data?.kota ?? 'DKI Jakarta';
  const tahun = items[0]?.tahun ?? configQuery.data?.tahunAnggaran ?? 2026;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`APBD ${kota} ${tahun}`}
        description="Angka kategori adalah hasil pemetaan dari pos APBD resmi. Total di bawah adalah total pos yang terisi di seed, bukan total belanja daerah resmi."
      />

      <Card>
        <p className="text-sm text-stone-500">Total pos yang terisi</p>
        <p className="text-2xl font-bold tabular-nums">{formatRupiah(total)}</p>
        <p className="mt-2 text-sm text-stone-500">
          Kategori dengan nominal nol ditampilkan sebagai “data menyusul” dan tidak dikarang.
          Bandingkan dengan prioritas warga di{' '}
          <Link to="/bandingkan" className="font-medium text-emerald-800 underline">
            halaman Gap
          </Link>
          .
        </p>
      </Card>

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
          title="Belum ada data APBD"
          description="Jalankan bun run seed dari root proyek setelah mengisi .env."
        />
      )}

      {items.length > 0 && <ApbdTable items={items} />}
    </div>
  );
}
