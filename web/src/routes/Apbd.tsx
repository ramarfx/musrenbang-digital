import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { ApbdPorsi } from '@/features/apbd/components/ApbdPorsi';
import { ApbdRingkasan } from '@/features/apbd/components/ApbdRingkasan';
import { ApbdTable } from '@/features/apbd/components/ApbdTable';
import { DokumenResmiKartu } from '@/features/apbd/components/DokumenResmiKartu';
import { porsiKategori } from '@/features/apbd/lib';
import { useApbdQuery } from '@/features/apbd/queries';
import { useCategoriesQuery } from '@/features/categories/queries';
import { useAppConfigQuery } from '@/features/config/queries';

export default function Apbd() {
  const apbdQuery = useApbdQuery();
  const configQuery = useAppConfigQuery();
  const categoriesQuery = useCategoriesQuery();
  const [tabelTerbuka, setTabelTerbuka] = useState(false);
  const items = apbdQuery.data ?? [];
  const porsi = useMemo(
    () =>
      porsiKategori(
        apbdQuery.data ?? [],
        categoriesQuery.data?.map((kategori) => kategori.nama) ?? [],
      ),
    [apbdQuery.data, categoriesQuery.data],
  );
  const kota = items[0]?.kota ?? configQuery.data?.kota ?? 'DKI Jakarta';
  const tahun = items[0]?.tahun ?? configQuery.data?.tahunAnggaran ?? 2025;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`APBD ${kota} ${tahun}`}
        description="Perbandingan di halaman Bandingkan hanya memakai angka yang sudah terverifikasi dan bertautan ke sumber resminya. Angka yang belum terverifikasi tetap tampil di sini dengan statusnya."
        actions={
          <Link to="/bandingkan" className={buttonClass('outline', 'sm')}>
            Bandingkan dengan pilihan warga
          </Link>
        }
      />

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

      {items.length > 0 && (
        <>
          <ApbdRingkasan porsi={porsi} kota={kota} tahun={tahun} />
          <ApbdPorsi porsi={porsi} />

          <div>
            <Button
              variant="outline"
              onClick={() => setTabelTerbuka((terbuka) => !terbuka)}
              aria-expanded={tabelTerbuka}
              aria-controls="daftar-angka-apbd"
              className="w-full sm:w-auto"
            >
              <Icon name="daftar" size={18} />
              {tabelTerbuka ? 'Sembunyikan angka dan sumber' : 'Lihat angka dan sumber'}
            </Button>
          </div>

          <div id="daftar-angka-apbd">{tabelTerbuka && <ApbdTable items={items} />}</div>
        </>
      )}

      <DokumenResmiKartu />
    </div>
  );
}
