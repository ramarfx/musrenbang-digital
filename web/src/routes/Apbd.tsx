import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { ApbdTable } from '@/features/apbd/components/ApbdTable';
import { useApbdQuery } from '@/features/apbd/queries';
import { PERGUB_APBD_URL } from '@/features/apbd/lib';
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
          <Link to="/bandingkan" className="font-semibold text-warga underline">
            halaman Gap
          </Link>
          .
        </p>
      </Card>

      <Card>
        <h2 className="text-lg font-bold">Dari mana angka ini</h2>
        <ul className="mt-3 max-w-[68ch] list-disc space-y-2 pl-5 text-sm text-ink">
          <li>
            <b>Dipetakan dari program</b>: nominal dijumlahkan dari program yang disebut pemberitaan
            tentang APBD {tahun} yang disahkan. Belum dicocokkan ke lampiran resmi.
          </li>
          <li>
            <b>Perlu lampiran</b>: tidak dirinci pemberitaan, jadi tampil &quot;data menyusul&quot;
            dan tidak dikarang.
          </li>
          <li>
            Total belanja daerah resmi Rp74.285.299.931.740 ada di{' '}
            <a
              href={PERGUB_APBD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-warga underline"
            >
              Pergub DKI Jakarta No. 44 Tahun 2025
            </a>
            . Rincian per urusan ada di lampiran yang belum kami dapat.{' '}
            <Link to="/metodologi" className="font-semibold text-warga underline">
              Lihat metodologi
            </Link>
            .
          </li>
        </ul>
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
