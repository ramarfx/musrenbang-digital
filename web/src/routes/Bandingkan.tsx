import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { useApbdQuery } from '@/features/apbd/queries';
import { useAppConfigQuery } from '@/features/config/queries';
import { GapComparison } from '@/features/gap/components/GapComparison';
import { GapDetailDialog } from '@/features/gap/components/GapDetailDialog';
import { GapLead } from '@/features/gap/components/GapLead';
import { buatCsv, siapkanGap, type GapRow } from '@/features/gap/lib';
import { useGapQuery } from '@/features/gap/queries';

export default function Bandingkan() {
  const gapQuery = useGapQuery();
  const configQuery = useAppConfigQuery();
  const apbdQuery = useApbdQuery();
  const [dipilih, setDipilih] = useState<GapRow | null>(null);

  const ringkasan = useMemo(() => siapkanGap(gapQuery.data ?? []), [gapQuery.data]);
  const config = configQuery.data;

  const unduhCsv = () => {
    const blob = new Blob([buatCsv(ringkasan.rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const tautan = document.createElement('a');
    tautan.href = url;
    tautan.download = 'gap-warga-apbd.csv';
    tautan.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bandingkan dengan APBD"
        description={
          config
            ? `Pilihan warga dibanding belanja program APBD ${config.kota} ${config.tahunAnggaran}.`
            : 'Pilihan warga dibanding belanja program APBD.'
        }
        actions={
          gapQuery.isSuccess && ringkasan.rows.length > 0 ? (
            <Button variant="outline" size="sm" onClick={unduhCsv}>
              Unduh data (CSV)
            </Button>
          ) : undefined
        }
      />

      {gapQuery.isPending && <PageLoader label="Memuat perbandingan..." />}

      {gapQuery.isError && (
        <ErrorState
          message={gapQuery.error.message}
          onRetry={() => {
            void gapQuery.refetch();
          }}
        />
      )}

      {gapQuery.isSuccess && ringkasan.rows.length === 0 && (
        <EmptyState
          title="Belum ada data gap"
          description="Pastikan migrasi dan seed APBD sudah dimuat ke Supabase."
        />
      )}

      {gapQuery.isSuccess && ringkasan.rows.length > 0 && (
        <>
          <GapLead ringkasan={ringkasan} />
          <GapComparison ringkasan={ringkasan} onPilih={setDipilih} />
        </>
      )}

      <GapDetailDialog
        row={dipilih}
        onClose={() => setDipilih(null)}
        ringkasan={ringkasan}
        apbd={apbdQuery.data ?? []}
      />
    </div>
  );
}
