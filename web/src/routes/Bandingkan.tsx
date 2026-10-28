import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { statusKategori } from '@/features/apbd/lib';
import { useApbdQuery } from '@/features/apbd/queries';
import { useCategoriesQuery } from '@/features/categories/queries';
import { useAppConfigQuery } from '@/features/config/queries';
import { GapCatatanData } from '@/features/gap/components/GapCatatanData';
import { GapComparison } from '@/features/gap/components/GapComparison';
import { GapDetailDialog } from '@/features/gap/components/GapDetailDialog';
import { GapLead } from '@/features/gap/components/GapLead';
import { buatCsv, siapkanGap, type GapRow } from '@/features/gap/lib';
import { useGapQuery } from '@/features/gap/queries';

export default function Bandingkan() {
  const gapQuery = useGapQuery();
  const configQuery = useAppConfigQuery();
  const apbdQuery = useApbdQuery();
  const categoriesQuery = useCategoriesQuery();
  const [dipilih, setDipilih] = useState<GapRow | null>(null);

  // Urutan kategori mengikuti simulator (daftar kategori dari database).
  const urutanKategori = useMemo(
    () => categoriesQuery.data?.map((kategori) => kategori.nama) ?? [],
    [categoriesQuery.data],
  );
  const config = configQuery.data;
  // Status per kategori dari semua barisnya pada kota dan tahun terpilih, bukan dari baris terakhir.
  const statusApbd = useMemo(() => {
    const konfigurasi = config && { kota: config.kota, tahun: config.tahunAnggaran };
    const kategori = new Set((apbdQuery.data ?? []).map((item) => item.kategori));
    return Object.fromEntries(
      [...kategori].map((nama) => [nama, statusKategori(apbdQuery.data ?? [], nama, konfigurasi)]),
    );
  }, [apbdQuery.data, config]);
  const ringkasan = useMemo(
    () => siapkanGap(gapQuery.data ?? [], urutanKategori),
    [gapQuery.data, urutanKategori],
  );
  const unduhCsv = () => {
    const blob = new Blob([buatCsv(ringkasan.rows, ringkasan.adaWarga)], {
      type: 'text/csv;charset=utf-8',
    });
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
          title="Perbandingan belum tersedia"
          description="Data perbandingan belum tersedia atau masih dalam proses verifikasi."
        />
      )}

      {gapQuery.isSuccess && ringkasan.rows.length > 0 && (
        <>
          <GapCatatanData ringkasan={ringkasan} />
          <GapLead ringkasan={ringkasan} />
          <GapComparison ringkasan={ringkasan} onPilih={setDipilih} statusApbd={statusApbd} />
        </>
      )}

      <GapDetailDialog
        row={dipilih}
        statusKategoriApbd={
          apbdQuery.isSuccess && config && dipilih
            ? (statusApbd[dipilih.kategori] ?? 'kosong')
            : undefined
        }
        onClose={() => setDipilih(null)}
        ringkasan={ringkasan}
        apbd={apbdQuery.data ?? []}
        konfigurasi={config}
      />
    </div>
  );
}
