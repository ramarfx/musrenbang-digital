import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/PageLoader';
import { useUserAllocationsQuery } from '@/features/allocations/queries';
import { useAuth } from '@/features/auth';
import { siapkanGap } from '@/features/gap/lib';
import { useGapQuery } from '@/features/gap/queries';
import { cn } from '@/lib/cn';
import { formatPersen } from '@/lib/format';

/**
 * Layar sesudah warga mengirim pilihannya: porsi yang dia beri tiap bidang dibanding porsi APBD,
 * lalu satu tombol ke langkah berikutnya. Kolom APBD hanya berisi kategori yang terverifikasi.
 */
export default function Hasilmu() {
  const { user } = useAuth();
  const allocationsQuery = useUserAllocationsQuery(user?.id ?? null);
  const gapQuery = useGapQuery();

  const ringkasan = useMemo(() => siapkanGap(gapQuery.data ?? []), [gapQuery.data]);
  const persenApbd = useMemo(
    () =>
      Object.fromEntries(
        ringkasan.rows.filter((row) => row.adaApbd).map((row) => [row.kategori, row.persen_apbd]),
      ),
    [ringkasan],
  );
  const adaApbd = Object.keys(persenApbd).length > 0;

  const porsiku = useMemo(() => {
    const baris = (allocationsQuery.data ?? []).filter((row) => row.jumlah > 0);
    const total = baris.reduce((jumlah, row) => jumlah + row.jumlah, 0);
    return [...baris]
      .sort((a, b) => b.jumlah - a.jumlah || a.kategori.localeCompare(b.kategori))
      .map((row) => ({
        kategori: row.kategori,
        persen: total > 0 ? (row.jumlah / total) * 100 : 0,
      }));
  }, [allocationsQuery.data]);

  if (allocationsQuery.isPending || gapQuery.isPending) {
    return <PageLoader label="Menyiapkan hasilmu..." />;
  }
  if (allocationsQuery.isError || gapQuery.isError) {
    const error = allocationsQuery.error ?? gapQuery.error;
    return (
      <ErrorState
        message={error?.message ?? 'Hasil gagal dimuat.'}
        onRetry={() => {
          void allocationsQuery.refetch();
          void gapQuery.refetch();
        }}
      />
    );
  }
  if (porsiku.length === 0) {
    return (
      <EmptyState
        title="Kamu belum mengisi simulator"
        description="Pilih 3 bidang yang paling penting lalu bagi 10 koin, hasilnya muncul di sini."
        action={
          <Link to="/simulator" className={buttonClass('primary')}>
            Buka simulator
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-[-0.01em]">Pilihanmu tersimpan</h1>
        <p className="mt-1 text-muted">Prioritas utamamu: {porsiku[0]?.kategori}.</p>
      </header>

      <Card>
        <table className="w-full text-[15px]">
          <caption className="sr-only">Porsimu dibanding porsi APBD</caption>
          <thead>
            <tr className="text-left text-xs text-muted">
              <th scope="col" className="pb-2 font-normal">
                Bidang
              </th>
              <th scope="col" className="w-24 pb-2 text-right font-normal">
                Porsimu
              </th>
              <th scope="col" className="w-24 pb-2 text-right font-normal">
                APBD
              </th>
            </tr>
          </thead>
          <tbody>
            {porsiku.map((baris, index) => (
              <tr key={baris.kategori} className="border-t border-rule">
                <td className="py-3">
                  <span className={cn(index === 0 && 'rounded bg-hijau-terang px-1.5 text-hitam')}>
                    {baris.kategori}
                  </span>
                </td>
                <td className="py-3 text-right tabular-nums">{formatPersen(baris.persen)}</td>
                <td className="py-3 text-right tabular-nums">
                  {persenApbd[baris.kategori] !== undefined ? (
                    formatPersen(persenApbd[baris.kategori] ?? 0)
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!adaApbd && (
          <p className="mt-3 text-xs text-muted">
            Data APBD masih diverifikasi, jadi kolom APBD belum terisi.
          </p>
        )}
      </Card>

      <div className="rounded-2xl bg-mint-pucat p-5 text-mint-tua">
        <p className="font-bold">Langkah berikutnya</p>
        <p className="mt-0.5 text-sm">Dukung usulan warga yang cocok dengan pilihanmu.</p>
        <Link to="/usulan" className={buttonClass('primary', 'md', 'mt-4')}>
          Lanjut dukung usulan
        </Link>
      </div>

      <p className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link to="/bandingkan" className="font-semibold text-warga underline">
          Lihat perbandingan lengkap
        </Link>
        <Link to="/simulator" className="font-semibold text-warga underline">
          Ubah pilihan
        </Link>
        <Link to="/metodologi" className="font-semibold text-warga underline">
          Cara menghitungnya
        </Link>
      </p>
    </div>
  );
}
