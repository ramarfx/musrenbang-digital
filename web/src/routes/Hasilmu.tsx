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
import { useMyRankingQuery } from '@/features/ranking/queries';
import { cn } from '@/lib/cn';
import { formatPersen } from '@/lib/format';

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
 * Layar sesudah warga menyimpan pilihannya. Dua bagian yang terpisah: pembagian anggaran
 * (utama, dibandingkan dengan APBD) dan urutan prioritas (tambahan). Urutan semua warga hanya
 * dirangkum untuk admin, jadi di sini hanya urutan milik sendiri. Kolom APBD hanya berisi
 * kategori yang terverifikasi.
 */
export default function Hasilmu() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const allocationsQuery = useUserAllocationsQuery(userId);
  const rankingQuery = useMyRankingQuery(userId);
  const gapQuery = useGapQuery();

  const ringkasan = useMemo(() => siapkanGap(gapQuery.data ?? []), [gapQuery.data]);
  const persenApbd = useMemo(
    () =>
      Object.fromEntries(
        ringkasan.rows.filter((row) => row.adaApbd).map((row) => [row.kategori, row.persen_apbd]),
      ),
    [ringkasan],
  );
  const urutanApbd = useMemo(() => peringkat(persenApbd), [persenApbd]);
  const adaApbd = Object.keys(persenApbd).length > 0;

  const porsiku = useMemo(() => {
    const baris = (allocationsQuery.data ?? []).filter((row) => row.jumlah > 0);
    const total = baris.reduce((jumlah, row) => jumlah + row.jumlah, 0);
    return baris
      .sort((a, b) => b.jumlah - a.jumlah || a.kategori.localeCompare(b.kategori))
      .slice(0, TAMPIL)
      .map((row) => ({
        kategori: row.kategori,
        persen: total > 0 ? (row.jumlah / total) * 100 : 0,
      }));
  }, [allocationsQuery.data]);

  const urutanku = useMemo(
    () =>
      [...(rankingQuery.data ?? [])]
        .sort((a, b) => a.posisi - b.posisi)
        .slice(0, TAMPIL)
        .map((row) => row.kategori),
    [rankingQuery.data],
  );

  if (allocationsQuery.isPending || rankingQuery.isPending || gapQuery.isPending) {
    return <PageLoader label="Menyiapkan hasilmu..." />;
  }
  if (allocationsQuery.isError || rankingQuery.isError || gapQuery.isError) {
    const error = allocationsQuery.error ?? rankingQuery.error ?? gapQuery.error;
    return (
      <ErrorState
        message={error?.message ?? 'Hasil gagal dimuat.'}
        onRetry={() => {
          void allocationsQuery.refetch();
          void rankingQuery.refetch();
          void gapQuery.refetch();
        }}
      />
    );
  }
  if (porsiku.length === 0 && urutanku.length === 0) {
    return (
      <EmptyState
        title="Kamu belum mengisi simulator"
        description="Bagi anggaran virtual ke sepuluh bidang, hasilnya muncul di sini."
        action={
          <Link to="/simulator" className={buttonClass('primary')}>
            Buka simulator
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-[-0.01em]">Pilihanmu tersimpan</h1>
        <p className="mt-1 text-muted">
          Pembagian anggaran dan urutan prioritas dihitung terpisah.
        </p>
      </header>

      <section aria-labelledby="judul-porsiku" className="space-y-3">
        <h2 id="judul-porsiku" className="text-lg font-bold">
          Bagi anggaran
        </h2>
        {porsiku.length > 0 ? (
          <Card>
            <table className="w-full text-[15px]">
              <caption className="sr-only">Porsi anggaranmu dibanding porsi APBD</caption>
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
                      <span
                        className={cn(index === 0 && 'rounded bg-hijau-terang px-1.5 text-hitam')}
                      >
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
            <p className="mt-3 text-sm">
              <Link to="/bandingkan" className="font-semibold text-warga underline">
                Lihat perbandingan lengkap
              </Link>
            </p>
          </Card>
        ) : (
          <div className="rounded-2xl bg-active p-5">
            <p className="font-bold">Kamu belum membagi anggaran</p>
            <p className="mt-0.5 text-sm text-muted">
              Ini cara utama yang dibandingkan dengan APBD di halaman Bandingkan.
            </p>
            <Link to="/simulator" className={buttonClass('primary', 'md', 'mt-4')}>
              Bagi anggaran
            </Link>
          </div>
        )}
      </section>

      <section aria-labelledby="judul-urutanku" className="space-y-3">
        <h2 id="judul-urutanku" className="text-lg font-bold">
          Urutan prioritas <span className="text-sm font-normal text-muted">(tambahan)</span>
        </h2>
        {urutanku.length > 0 ? (
          <Card>
            <table className="w-full text-[15px]">
              <caption className="sr-only">Urutan prioritasmu dan urutan porsi APBD</caption>
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th scope="col" className="w-10 pb-2 font-normal">
                    <span className="sr-only">Nomor</span>
                  </th>
                  <th scope="col" className="pb-2 font-normal">
                    Bidang
                  </th>
                  <th scope="col" className="w-28 pb-2 text-right font-normal">
                    Urutan APBD
                  </th>
                </tr>
              </thead>
              <tbody>
                {urutanku.map((kategori, index) => (
                  <tr key={kategori} className="border-t border-rule">
                    <td className="py-3 font-bold tabular-nums">{index + 1}</td>
                    <td className="py-3">
                      <span
                        className={cn(index === 0 && 'rounded bg-hijau-terang px-1.5 text-hitam')}
                      >
                        {kategori}
                      </span>
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {urutanApbd[kategori] ? (
                        `#${urutanApbd[kategori]}`
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted">
              Urutan semua warga dirangkum untuk admin, jadi tidak tampil di sini.
            </p>
            <p className="mt-3 text-sm">
              <Link to="/simulator?cara=prioritas" className="font-semibold text-warga underline">
                Ubah urutan
              </Link>
            </p>
          </Card>
        ) : (
          <div className="rounded-2xl bg-active p-5">
            <p className="font-bold">Mau menambahkan urutan prioritas?</p>
            <p className="mt-0.5 text-sm text-muted">
              Urutanmu membantu admin memilih mana yang didahulukan kalau dua program sama-sama jauh
              dari APBD.
            </p>
            <Link
              to="/simulator?cara=prioritas"
              className={buttonClass('outline', 'md', 'mt-4 border-edge')}
            >
              Urutkan prioritas
            </Link>
          </div>
        )}
      </section>

      <div className="rounded-2xl bg-mint-pucat p-5 text-mint-tua">
        <p className="font-bold">Langkah berikutnya</p>
        <p className="mt-0.5 text-sm">Dukung usulan warga yang cocok dengan pilihanmu.</p>
        <Link to="/usulan" className={buttonClass('primary', 'md', 'mt-4')}>
          Lanjut dukung usulan
        </Link>
      </div>

      <p className="text-sm">
        <Link to="/metodologi" className="font-semibold text-warga underline">
          Cara menghitungnya
        </Link>
      </p>
    </div>
  );
}
