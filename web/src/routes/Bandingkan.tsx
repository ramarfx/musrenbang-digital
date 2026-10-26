import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { useAppConfigQuery } from '@/features/config/queries';
import { GapChart } from '@/features/gap/components/GapChart';
import { GapHighlight } from '@/features/gap/components/GapHighlight';
import { GapTable } from '@/features/gap/components/GapTable';
import { useGapQuery } from '@/features/gap/queries';

export default function Bandingkan() {
  const gapQuery = useGapQuery();
  const configQuery = useAppConfigQuery();
  const items = gapQuery.data ?? [];
  const sorotan = items[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bandingkan: warga vs APBD"
        description="Persentase alokasi warga dibandingkan dengan persentase APBD per kategori. Gap positif berarti warga memprioritaskan kategori itu lebih tinggi daripada APBD; gap negatif berarti sebaliknya."
      />

      {configQuery.data && (
        <Card className="border-emerald-200 bg-emerald-50 text-sm text-emerald-900">
          Sumber APBD: {configQuery.data.kota} tahun anggaran {configQuery.data.tahunAnggaran}.{' '}
          <Link to="/apbd" className="font-semibold underline">
            Lihat rincian dan sumber tiap kategori
          </Link>
          . Angka kategori adalah hasil pemetaan dari pos APBD resmi, bukan total belanja daerah.
        </Card>
      )}

      {gapQuery.isPending && <PageLoader label="Memuat perbandingan..." />}

      {gapQuery.isError && (
        <ErrorState
          message={gapQuery.error.message}
          onRetry={() => {
            void gapQuery.refetch();
          }}
        />
      )}

      {gapQuery.isSuccess && items.length === 0 && (
        <EmptyState
          title="Belum ada data gap"
          description="Pastikan migrasi dan seed APBD sudah dimuat ke Supabase."
        />
      )}

      {gapQuery.isSuccess && items.length > 0 && (
        <>
          {sorotan && <GapHighlight item={sorotan} />}
          <GapChart items={items} />
          <GapTable items={items} />
          <p className="text-sm text-stone-500">
            Gap dihitung saat dibaca oleh view <code className="font-mono">v_gap</code>. Bila belum
            ada alokasi warga, persentase warga bernilai nol dan sisi APBD tetap ditampilkan.
          </p>
        </>
      )}
    </div>
  );
}
