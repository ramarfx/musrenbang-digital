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

const TAMPIL = 5;

/** Peringkat 1, 2, 3, ... menurut nilai terbesar; kategori tanpa nilai tidak diberi peringkat. */
function peringkat(nilai: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(nilai)
      .filter(([, angka]) => angka > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([kategori], index) => [kategori, index + 1]),
  );
}

/**
 * Layar sesudah warga menyimpan prioritas: urutannya dibanding urutan semua warga dan APBD,
 * lalu satu tombol ke langkah berikutnya. Kolom APBD hanya berisi kategori yang terverifikasi.
 */
export default function Hasilmu() {
  const { user } = useAuth();
  const allocationsQuery = useUserAllocationsQuery(user?.id ?? null);
  const gapQuery = useGapQuery();

  const ringkasan = useMemo(() => siapkanGap(gapQuery.data ?? []), [gapQuery.data]);
  const milikku = useMemo(
    () =>
      peringkat(
        Object.fromEntries((allocationsQuery.data ?? []).map((row) => [row.kategori, row.jumlah])),
      ),
    [allocationsQuery.data],
  );
  const warga = useMemo(
    () =>
      ringkasan.adaWarga
        ? peringkat(
            Object.fromEntries(ringkasan.rows.map((row) => [row.kategori, row.persen_warga])),
          )
        : {},
    [ringkasan],
  );
  const apbd = useMemo(
    () =>
      peringkat(
        Object.fromEntries(
          ringkasan.rows.filter((row) => row.adaApbd).map((row) => [row.kategori, row.persen_apbd]),
        ),
      ),
    [ringkasan],
  );
  const urutanku = Object.entries(milikku)
    .sort((a, b) => a[1] - b[1])
    .slice(0, TAMPIL)
    .map(([kategori]) => kategori);
  const adaApbd = Object.keys(apbd).length > 0;

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
  if (urutanku.length === 0) {
    return (
      <EmptyState
        title="Kamu belum mengurutkan prioritas"
        description="Urutkan bidang yang paling penting menurutmu, hasilnya muncul di sini."
        action={
          <Link to="/simulator" className={buttonClass('primary')}>
            Urutkan prioritas
          </Link>
        }
      />
    );
  }

  const nomorSatu = urutanku[0] as string;
  const samaDenganWarga = warga[nomorSatu] === 1;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-[-0.01em]">Pilihanmu tersimpan</h1>
        <p className="mt-1 text-muted">
          Nomor 1 pilihanmu: {nomorSatu}.
          {ringkasan.adaWarga &&
            (samaDenganWarga
              ? ' Sama dengan pilihan terbanyak warga.'
              : ` Warga lain menaruhnya di nomor ${warga[nomorSatu] ?? '-'}.`)}
        </p>
      </header>

      <Card>
        <table className="w-full text-[15px]">
          <caption className="sr-only">Urutanmu dibanding urutan warga dan APBD</caption>
          <thead>
            <tr className="text-left text-xs text-muted">
              <th scope="col" className="w-10 pb-2 font-normal">
                <span className="sr-only">Nomor</span>
              </th>
              <th scope="col" className="pb-2 font-normal">
                Bidang
              </th>
              <th scope="col" className="w-20 pb-2 text-right font-normal">
                Warga
              </th>
              <th scope="col" className="w-20 pb-2 text-right font-normal">
                APBD
              </th>
            </tr>
          </thead>
          <tbody>
            {urutanku.map((kategori, index) => (
              <tr key={kategori} className="border-t border-rule">
                <td className="py-3 font-bold tabular-nums">{index + 1}</td>
                <td className="py-3">
                  <span className={cn(index === 0 && 'rounded bg-hijau-terang px-1.5 text-hitam')}>
                    {kategori}
                  </span>
                </td>
                <td className="py-3 text-right tabular-nums">
                  {warga[kategori] ? `#${warga[kategori]}` : <span className="text-muted">-</span>}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {apbd[kategori] ? `#${apbd[kategori]}` : <span className="text-muted">-</span>}
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
        <p className="mt-0.5 text-sm">Dukung usulan warga yang cocok dengan prioritasmu.</p>
        <Link to="/usulan" className={buttonClass('primary', 'md', 'mt-4')}>
          Lanjut dukung usulan
        </Link>
      </div>

      <p className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link to="/bandingkan" className="font-semibold text-warga underline">
          Lihat perbandingan lengkap
        </Link>
        <Link to="/simulator" className="font-semibold text-warga underline">
          Ubah urutan
        </Link>
        <Link to="/metodologi" className="font-semibold text-warga underline">
          Cara menghitungnya
        </Link>
      </p>
    </div>
  );
}
