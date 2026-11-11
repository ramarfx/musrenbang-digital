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
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatPersen } from '@/lib/format';

const JARI = 42;
const KELILING = 2 * Math.PI * JARI;
/** Warna stabilo tiap bidang di cincin, urut dari porsi terbesar. */
const WARNA = ['#4FC79C', '#F6D98B', '#D9CCF0', '#A9E0DC', '#F5C79B'];

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

  const total = 100;
  let sudah = 0;
  const potongan = porsiku.map((baris, index) => {
    const panjang = (baris.persen / total) * KELILING;
    const potong = { ...baris, panjang, geser: -sudah, warna: WARNA[index % WARNA.length] as string };
    sudah += panjang;
    return potong;
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="mb-2">
        <h1 className="text-2xl font-bold tracking-[-0.01em]">Pilihanmu tersimpan</h1>
        <p className="mt-1 text-muted">Prioritas utamamu: {porsiku[0]?.kategori}.</p>
      </header>

      <Card>
        <div className="grid items-center gap-5 sm:grid-cols-[150px_1fr] sm:gap-6">
          <svg
            viewBox="0 0 120 120"
            role="img"
            aria-label="Pembagian porsi pilihanmu"
            className="mx-auto size-[150px]"
          >
            <g fill="none" strokeWidth={18} transform="rotate(-90 60 60)">
              {potongan.map((p) => (
                <circle
                  key={p.kategori}
                  cx={60}
                  cy={60}
                  r={JARI}
                  stroke={p.warna}
                  strokeDasharray={`${p.panjang} ${KELILING}`}
                  strokeDashoffset={p.geser}
                />
              ))}
            </g>
            <circle cx={60} cy={60} r={51} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
            <circle cx={60} cy={60} r={33} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
            <text x={60} y={58} textAnchor="middle" fontSize={20} fontWeight={800} fill="var(--ink)">
              10
            </text>
            <text x={60} y={73} textAnchor="middle" fontSize={9} fill="var(--muted)">
              koin
            </text>
          </svg>
          <div className="min-w-0">
            <p className="text-xs text-muted">Prioritas utamamu</p>
            <p className="mt-0.5 text-[24px] leading-tight font-extrabold tracking-[-0.02em]">
              <span className="rounded-md bg-hijau-terang px-1.5 text-hitam">{porsiku[0]?.kategori}</span>
            </p>
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {potongan.map((p) => (
                <li key={p.kategori} className="flex items-center gap-2">
                  <i className="size-2.5 flex-none rounded-[3px]" style={{ background: p.warna }} />
                  <span className="min-w-0 truncate">{p.kategori}</span>
                  <b className="ml-auto tabular-nums">{formatPersen(p.persen)}</b>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <table className="mt-5 w-full text-[14px]">
          <caption className="sr-only">Porsimu dibanding porsi APBD</caption>
          <thead>
            <tr className="text-right text-xs text-muted">
              <th scope="col" className="pb-2 text-left font-normal">
                Bidang
              </th>
              <th scope="col" className="pb-2 font-normal">
                Porsimu
              </th>
              <th scope="col" className="pb-2 font-normal">
                APBD
              </th>
              <th scope="col" className="pb-2 font-normal">
                Selisih
              </th>
            </tr>
          </thead>
          <tbody>
            {porsiku.map((baris) => {
              const apbd = persenApbd[baris.kategori];
              const selisih = apbd !== undefined ? baris.persen - apbd : undefined;
              return (
                <tr key={baris.kategori} className="border-t border-rule text-right tabular-nums">
                  <td className="py-2.5 text-left">{baris.kategori}</td>
                  <td className="py-2.5">{formatPersen(baris.persen)}</td>
                  <td className="py-2.5">
                    {apbd !== undefined ? formatPersen(apbd) : <span className="text-muted">-</span>}
                  </td>
                  <td
                    className={cn(
                      'py-2.5 font-bold',
                      selisih === undefined
                        ? 'font-normal text-muted'
                        : selisih >= 0
                          ? 'text-warga'
                          : 'text-mustard-tua',
                    )}
                  >
                    {selisih === undefined
                      ? '-'
                      : `${selisih >= 0 ? '+' : '−'}${Math.abs(selisih).toLocaleString('id-ID', { maximumFractionDigits: 1 })}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!adaApbd && (
          <p className="mt-3 text-xs text-muted">
            Data APBD masih diverifikasi, jadi kolom APBD belum terisi.
          </p>
        )}
      </Card>

      <section
        aria-labelledby="langkah-berikutnya"
        className="flex flex-col gap-4 rounded-3xl border-[1.5px] border-ink bg-mint-pucat p-5 shadow-[0_4px_0_var(--ink)] sm:flex-row sm:items-center"
      >
        <span className="grid size-12 flex-none place-items-center rounded-2xl border-[1.5px] border-ink bg-hijau-terang text-hitam">
          <Icon name="panah-atas" size={24} filled />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="langkah-berikutnya" className="font-bold text-mint-tua">
            Langkah berikutnya
          </h2>
          <p className="mt-0.5 text-sm text-mint-tua">
            Dukung usulan warga yang cocok dengan pilihanmu.
          </p>
        </div>
        <Link to="/usulan" className={buttonClass('primary', 'md', 'w-full flex-none sm:w-auto')}>
          Lanjut dukung usulan
        </Link>
      </section>

      <nav aria-label="Tautan lanjutan" className="grid gap-2.5 sm:grid-cols-3">
        {(
          [
            ['/bandingkan', 'bandingkan', 'Perbandingan lengkap'],
            ['/simulator', 'simulator', 'Ubah pilihan'],
            ['/metodologi', 'buku', 'Cara menghitungnya'],
          ] as const
        ).map(([tujuan, ikon, label]) => (
          <Link
            key={tujuan}
            to={tujuan}
            className="group flex items-center gap-3 rounded-2xl border-[1.5px] border-border bg-surface p-3.5 text-[14px] font-semibold transition-[scale,border-color,background-color] duration-150 ease-out hover:border-ink hover:bg-active active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
          >
            <span className="grid size-9 flex-none place-items-center rounded-xl border-[1.5px] border-ink bg-ground">
              <Icon name={ikon} size={18} />
            </span>
            <span className="min-w-0 flex-1">{label}</span>
            <span className="flex-none rotate-180 text-muted"><Icon name="panahKiri" size={16} /></span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
