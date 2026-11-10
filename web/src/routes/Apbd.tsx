import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import type { LangkahTur } from '@/components/tutorial/TurHalaman';
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

const TUR_APBD: readonly LangkahTur[] = [
  {
    target: 'ringkasan',
    judul: 'Total dan bidang terbesar',
    isi: 'Ringkasan anggaran daerah tahun ini dan bidang yang mendapat porsi paling besar.',
  },
  {
    target: 'porsi',
    judul: 'Porsi tiap bidang',
    isi: 'Setiap batang menunjukkan berapa persen APBD yang dialokasikan ke satu bidang.',
  },
  {
    target: 'angka',
    judul: 'Angka dan sumbernya',
    isi: 'Buka daftar lengkap angka per program, lengkap dengan status verifikasi dan tautan ke sumber resmi.',
  },
  {
    target: 'dokumen',
    judul: 'Dokumen resmi',
    isi: 'Unduhan dokumen APBD asli dari pemerintah daerah, untuk memeriksa angkanya sendiri.',
  },
  {
    target: 'bandingkan',
    judul: 'Bandingkan dengan pilihan warga',
    isi: 'Lihat seberapa jauh pilihan warga berbeda dari anggaran di halaman ini.',
  },
];

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
        tur={TUR_APBD}
        description="Perbandingan di halaman Bandingkan hanya memakai angka yang sudah terverifikasi dan bertautan ke sumber resminya. Angka yang belum terverifikasi tetap tampil di sini dengan statusnya."
        actions={
          <Link to="/bandingkan" data-tur="bandingkan" className={buttonClass('outline', 'sm')}>
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
          <div data-tur="ringkasan">
            <ApbdRingkasan porsi={porsi} kota={kota} tahun={tahun} />
          </div>
          <div data-tur="porsi">
            <ApbdPorsi porsi={porsi} />
          </div>

          <div>
            <Button
              variant="outline"
              data-tur="angka"
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

      <div data-tur="dokumen">
        <DokumenResmiKartu />
      </div>
    </div>
  );
}
