import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';
import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { getCategoryInfo } from '@/features/categories/info';
import { cn } from '@/lib/cn';
import { formatAngka, formatPersen } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { getRingkasanAspirasi } from '../ai-api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function useRingkasanAspirasi() {
  return useQuery({
    queryKey: queryKeys.adminAspiration,
    queryFn: getRingkasanAspirasi,
    staleTime: 30_000,
    retry: false,
  });
}

type Baris = Awaited<ReturnType<typeof getRingkasanAspirasi>>[number];

function urutkan(baris: Baris[], ambil: (item: Baris) => number) {
  return [...baris].sort(
    (a, b) => ambil(b) - ambil(a) || a.kategori.localeCompare(b.kategori, 'id'),
  );
}

function Angka({ nilai, label }: { nilai: string; label: string }) {
  return (
    <div className="min-w-0 rounded-2xl border-[1.5px] border-edge bg-surface px-4 py-3">
      <p className="text-2xl leading-tight font-bold tabular-nums [overflow-wrap:anywhere]">
        {nilai}
      </p>
      <p className="mt-0.5 text-[13px] text-muted">{label}</p>
    </div>
  );
}

/**
 * Laporan lengkap di halaman Laporan. Semua angka berasal dari view `v_aspiration_overview`:
 * tanpa AI, tanpa nama warga, dan hanya menghitung usulan yang sudah disetujui.
 */
export function RingkasanAspirasiLengkap() {
  const ringkasan = useRingkasanAspirasi();

  if (ringkasan.isPending) {
    return (
      <Card>
        <Skeleton className="h-6 w-52" />
        <Skeleton className="mt-4 h-16 w-full" />
        <Skeleton className="mt-3 h-24 w-full" />
      </Card>
    );
  }

  if (ringkasan.isError) {
    return (
      <ErrorState
        title="Laporan belum bisa dimuat"
        message={ringkasan.error.message}
        onRetry={() => void ringkasan.refetch()}
      />
    );
  }

  const baris = ringkasan.data ?? [];
  const totalUsulan = baris[0]?.total_usulan_disetujui ?? 0;

  if (baris.length === 0 || totalUsulan === 0) {
    return (
      <EmptyState
        title="Belum ada usulan disetujui"
        description="Laporan dihitung dari usulan yang sudah disetujui. Setujui usulan di halaman Perlu diperiksa agar laporan terisi."
        action={
          <Link to="/admin/perlu-diperiksa" className={buttonClass('primary', 'md')}>
            Periksa usulan
          </Link>
        }
      />
    );
  }

  const totalSuara = baris.reduce((jumlah, item) => jumlah + item.jumlah_suara, 0);
  const totalAlokasi = baris.reduce((jumlah, item) => jumlah + item.total_alokasi, 0);
  const teratas = urutkan(baris, (item) => item.jumlah_usulan)[0];

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-lg font-bold">Apa kata data</h2>
        <p className="mt-3 rounded-2xl border-[1.5px] border-edge bg-[#FFF6C9] px-4 py-3.5 text-[15.5px] leading-relaxed text-hitam">
          {baris[0]?.ringkasan ?? 'Ringkasan belum tersedia.'}
        </p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          <Angka nilai={formatAngka(totalUsulan)} label="usulan disetujui" />
          <Angka nilai={formatAngka(totalSuara)} label="dukungan pada usulan itu" />
          <Angka nilai={teratas?.kategori ?? '-'} label="bidang dengan usulan terbanyak" />
        </div>
      </Card>

      <GrafikAspirasi
        baris={baris}
        totalAlokasi={totalAlokasi}
        totalSuara={totalSuara}
        totalUsulan={totalUsulan}
      />

      <p className="text-[13px] text-muted">
        Hanya agregat per bidang yang ditampilkan, tanpa nama warga atau judul usulan.
      </p>
    </div>
  );
}

type Metrik = 'usulan' | 'suara' | 'alokasi';

const PILIHAN_METRIK: { nilai: Metrik; label: string; judul: string }[] = [
  { nilai: 'usulan', label: 'Usulan', judul: 'Usulan disetujui per bidang' },
  { nilai: 'suara', label: 'Suara', judul: 'Dukungan warga per bidang' },
  { nilai: 'alokasi', label: 'Alokasi', judul: 'Porsi anggaran menurut warga' },
];

/**
 * Satu grafik batang Chart.js untuk ketiga metrik aspirasi. Klik batang atau tombol bidangnya
 * untuk memilih bidang, lalu angka lengkap bidang itu tampil di panel samping. Daftar tombol
 * bidang disediakan karena kanvas grafik tidak bisa dipakai keyboard.
 */
function GrafikAspirasi({
  baris,
  totalAlokasi,
  totalSuara,
  totalUsulan,
}: {
  baris: Baris[];
  totalAlokasi: number;
  totalSuara: number;
  totalUsulan: number;
}) {
  const [metrik, setMetrik] = useState<Metrik>('usulan');
  const terurut = urutkan(baris, (item) =>
    metrik === 'usulan'
      ? item.jumlah_usulan
      : metrik === 'suara'
        ? item.jumlah_suara
        : item.persen_alokasi,
  );
  const [terpilih, setTerpilih] = useState<string | null>(terurut[0]?.kategori ?? null);
  const aktif = terpilih ?? terurut[0]?.kategori ?? null;
  const barisAktif = baris.find((item) => item.kategori === aktif) ?? null;
  const peringkatAktif = terurut.findIndex((item) => item.kategori === aktif) + 1;
  const pilihan = PILIHAN_METRIK.find((item) => item.nilai === metrik)!;

  const nilai = (item: Baris) =>
    metrik === 'usulan'
      ? item.jumlah_usulan
      : metrik === 'suara'
        ? item.jumlah_suara
        : item.persen_alokasi;
  const label = (item: Baris) =>
    metrik === 'alokasi' ? formatPersen(item.persen_alokasi) : formatAngka(nilai(item));

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{pilihan.judul}</h2>
        <div role="group" aria-label="Pilih metrik grafik" className="flex flex-wrap gap-1.5">
          {PILIHAN_METRIK.map((item) => (
            <button
              key={item.nilai}
              type="button"
              aria-pressed={metrik === item.nilai}
              onClick={() => setMetrik(item.nilai)}
              className={cn(
                'inline-flex min-h-11 items-center rounded-xl border px-3.5 text-sm font-semibold transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
                metrik === item.nilai
                  ? 'border-ink bg-ink text-on-ink'
                  : 'border-border bg-surface text-ink hover:bg-active',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {metrik === 'alokasi' && totalAlokasi === 0 ? (
        <p className="mt-3 rounded-2xl bg-active px-4 py-3 text-sm text-ink">
          Belum ada warga yang membagi anggaran di simulator, jadi porsi per bidang belum bisa
          dihitung.
        </p>
      ) : (
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
          <div className="min-w-0">
            <div
              className="h-72 sm:h-80"
              role="img"
              aria-label={`Grafik batang ${pilihan.judul}. Klik batang untuk memilih bidang.`}
            >
              <Bar
                data={{
                  labels: terurut.map((item) => item.kategori),
                  datasets: [
                    {
                      data: terurut.map((item) => nilai(item)),
                      backgroundColor: terurut.map((item) =>
                        item.kategori === aktif
                          ? getCategoryInfo(item.kategori).warna.kuat
                          : `${getCategoryInfo(item.kategori).warna.kuat}55`,
                      ),
                      borderColor: terurut.map((item) =>
                        item.kategori === aktif
                          ? getCategoryInfo(item.kategori).warna.kuat
                          : 'transparent',
                      ),
                      borderWidth: terurut.map((item) => (item.kategori === aktif ? 2 : 0)),
                      borderRadius: 6,
                    },
                  ],
                }}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  onClick: (_event, elements) => {
                    const indeks = elements[0]?.index;
                    if (indeks !== undefined && terurut[indeks]) {
                      setTerpilih(terurut[indeks].kategori);
                    }
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const item = terurut[context.dataIndex];
                          return item ? `${item.kategori}: ${label(item)}` : '';
                        },
                      },
                    },
                  },
                  scales: {
                    x: { beginAtZero: true, grid: { color: 'rgba(20,34,43,0.08)' } },
                    y: { grid: { display: false } },
                  },
                }}
              />
            </div>
            <p className="mt-2 text-[13px] text-muted">
              Klik batang atau nama bidang untuk melihat angka lengkapnya.
            </p>
            <ul aria-label="Pilih bidang" className="mt-3 flex flex-wrap gap-1.5">
              {terurut.map((item) => (
                <li key={item.kategori}>
                  <button
                    type="button"
                    aria-pressed={item.kategori === aktif}
                    onClick={() => setTerpilih(item.kategori)}
                    className={cn(
                      'inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
                      item.kategori === aktif
                        ? 'border-ink bg-ink text-on-ink'
                        : 'border-border bg-surface text-ink hover:bg-active',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: getCategoryInfo(item.kategori).warna.kuat }}
                    />
                    {item.kategori}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <section
            aria-label={`Rincian ${aktif ?? 'bidang'}`}
            aria-live="polite"
            className="rounded-2xl border-[1.5px] border-edge bg-surface px-4 py-4"
          >
            {barisAktif ? (
              <>
                <h3 className="font-bold [overflow-wrap:anywhere]">{barisAktif.kategori}</h3>
                <p className="mt-0.5 text-[13px] text-muted">
                  Peringkat {peringkatAktif} dari {formatAngka(terurut.length)} bidang untuk metrik{' '}
                  {pilihan.label.toLowerCase()}.
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted">Usulan disetujui</dt>
                    <dd className="font-bold tabular-nums">
                      {formatAngka(barisAktif.jumlah_usulan)} dari {formatAngka(totalUsulan)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted">Dukungan warga</dt>
                    <dd className="font-bold tabular-nums">
                      {formatAngka(barisAktif.jumlah_suara)} dari {formatAngka(totalSuara)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted">Porsi anggaran</dt>
                    <dd className="font-bold tabular-nums">
                      {totalAlokasi > 0
                        ? formatPersen(barisAktif.persen_alokasi)
                        : 'Belum ada data'}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="text-sm text-muted">Pilih bidang untuk melihat angkanya.</p>
            )}
          </section>
        </div>
      )}
    </Card>
  );
}
