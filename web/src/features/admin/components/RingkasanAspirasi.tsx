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
import { Select } from '@/components/ui/Select';
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

/** Satu dari tiga angka di bawah grafik: angka tebal, keterangan, dan batang kecil porsinya. */
function AngkaBidang({
  label,
  nilai,
  keterangan,
  persen,
  warna,
}: {
  label: string;
  nilai: string;
  keterangan?: string;
  persen: number;
  warna: string;
}) {
  return (
    <div className="px-4 py-3">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="mt-0.5">
        <span className="text-[22px] leading-tight font-extrabold tracking-[-0.03em] tabular-nums">
          {nilai}
        </span>
        {keterangan && <span className="ml-1.5 text-[13px] text-muted">{keterangan}</span>}
        <span aria-hidden="true" className="mt-2 block h-2 overflow-hidden rounded-[3px] bg-track">
          <span
            className="block h-full"
            style={{ width: `${Math.min(100, Math.max(0, persen))}%`, backgroundColor: warna }}
          />
        </span>
      </dd>
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
        {/* Di HP tiga tombol metrik menumpuk, jadi diganti satu pilihan turun. */}
        <Select
          aria-label="Pilih metrik grafik"
          className="w-full sm:hidden"
          value={metrik}
          onChange={(event) => setMetrik(event.target.value as Metrik)}
        >
          {PILIHAN_METRIK.map((item) => (
            <option key={item.nilai} value={item.nilai}>
              {item.label}
            </option>
          ))}
        </Select>
        <div
          role="group"
          aria-label="Pilih metrik grafik"
          className="hidden flex-wrap gap-1.5 sm:flex"
        >
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
        <div className="mt-4">
          <div className="min-w-0">
            <div
              className="h-56 sm:h-64"
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
              Klik batang atau pilih bidang untuk melihat angka lengkapnya.
            </p>
          </div>

          <section aria-label={`Rincian ${aktif ?? 'bidang'}`} aria-live="polite" className="mt-4">
            {barisAktif ? (
              <>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span
                    className="rounded-[3px] px-1.5 py-px text-[15px] font-bold text-hitam [overflow-wrap:anywhere]"
                    style={{ backgroundColor: getCategoryInfo(barisAktif.kategori).warna.latar }}
                  >
                    {barisAktif.kategori}
                  </span>
                  <span className="text-[13px] text-muted">
                    peringkat {peringkatAktif} dari {formatAngka(terurut.length)} untuk metrik{' '}
                    {pilihan.label.toLowerCase()}
                  </span>
                  <select
                    aria-label="Pilih bidang"
                    value={barisAktif.kategori}
                    onChange={(event) => setTerpilih(event.target.value)}
                    className="min-h-11 rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga sm:ml-auto"
                  >
                    {terurut.map((item) => (
                      <option key={item.kategori} value={item.kategori}>
                        {item.kategori}
                      </option>
                    ))}
                  </select>
                </div>
                <dl className="mt-3 grid divide-y-[1.5px] divide-ink overflow-hidden rounded-2xl border-[1.5px] border-ink sm:grid-cols-3 sm:divide-x-[1.5px] sm:divide-y-0">
                  <AngkaBidang
                    label="usulan disetujui"
                    nilai={formatAngka(barisAktif.jumlah_usulan)}
                    keterangan={`dari ${formatAngka(totalUsulan)}`}
                    persen={totalUsulan > 0 ? (barisAktif.jumlah_usulan / totalUsulan) * 100 : 0}
                    warna={getCategoryInfo(barisAktif.kategori).warna.kuat}
                  />
                  <AngkaBidang
                    label="dukungan warga"
                    nilai={formatAngka(barisAktif.jumlah_suara)}
                    keterangan={`dari ${formatAngka(totalSuara)}`}
                    persen={totalSuara > 0 ? (barisAktif.jumlah_suara / totalSuara) * 100 : 0}
                    warna={getCategoryInfo(barisAktif.kategori).warna.kuat}
                  />
                  <AngkaBidang
                    label="porsi anggaran"
                    nilai={
                      totalAlokasi > 0 ? formatPersen(barisAktif.persen_alokasi) : 'Belum ada data'
                    }
                    persen={totalAlokasi > 0 ? barisAktif.persen_alokasi : 0}
                    warna={getCategoryInfo(barisAktif.kategori).warna.kuat}
                  />
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
