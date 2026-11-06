import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useUserAllocationsQuery } from '@/features/allocations/queries';
import { useAuth } from '@/features/auth';
import { useCategoriesQuery } from '@/features/categories/queries';
import { siapkanGap } from '@/features/gap/lib';
import { useGapQuery } from '@/features/gap/queries';
import { pilihTeratas } from '@/features/proposals/components/TopProposals';
import { UpvoteButton } from '@/features/proposals/components/UpvoteButton';
import { useMyVotesQuery, useProposalsQuery } from '@/features/proposals/queries';
import { cn } from '@/lib/cn';
import { formatAngka, formatPersen } from '@/lib/format';
import { kalimatTahap, TAHAP_MUSRENBANG, tahapSekarang } from '@/lib/jadwal';

const TARGET_DUKUNGAN = 3;

/** Empat tahap Musrenbang: yang sudah lewat bertinta, yang berjalan distabilo. */
function JadwalMusrenbang() {
  const sekarang = tahapSekarang(new Date());
  return (
    <Card>
      <h2 className="text-base font-bold">Musrenbang tahun ini</h2>
      <ol className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {TAHAP_MUSRENBANG.map((tahap, index) => (
          <li
            key={tahap.nama}
            aria-current={index === sekarang ? 'step' : undefined}
            className={cn(
              'rounded-xl px-3 py-2.5',
              index < sekarang && 'bg-ink text-on-ink',
              index === sekarang && 'bg-hijau-terang text-hitam',
              index > sekarang && 'bg-active',
            )}
          >
            <span className={cn('block text-xs', index > sekarang && 'text-muted')}>
              {index === sekarang ? 'Sekarang' : tahap.bulan}
            </span>
            <span className={cn('block text-sm', index === sekarang && 'font-bold')}>
              {tahap.nama}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted">
        Jadwal umum tiap tahun. Tanggal pastinya diumumkan pemerintah daerah.
      </p>
    </Card>
  );
}

type Langkah = {
  ikon: IconName;
  label: string;
  keterangan?: string;
  selesai: boolean;
  ke: string;
  aksi: string;
};

/** Tiga langkah warga, dicentang dari data asli: pembagian anggaran, dukungan, dan usulan milik sendiri. */
function LangkahMu() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const allocationsQuery = useUserAllocationsQuery(userId);
  const votesQuery = useMyVotesQuery(userId);
  const proposalsQuery = useProposalsQuery();

  const sudahUrut = (allocationsQuery.data ?? []).some((row) => row.jumlah > 0);
  const jumlahDukungan = votesQuery.data?.length ?? 0;
  const punyaUsulan = (proposalsQuery.data ?? []).some(
    (proposal) => userId !== null && proposal.pengusul_id === userId,
  );
  const daftar: Langkah[] = [
    {
      ikon: 'simulator',
      label: 'Bagi anggaran virtualmu',
      selesai: sudahUrut,
      ke: '/simulator',
      aksi: sudahUrut ? 'Ubah' : 'Mulai',
    },
    {
      ikon: 'panah-atas',
      label: `Dukung ${TARGET_DUKUNGAN} usulan`,
      keterangan: user
        ? `${Math.min(jumlahDukungan, TARGET_DUKUNGAN)} dari ${TARGET_DUKUNGAN}`
        : undefined,
      selesai: jumlahDukungan >= TARGET_DUKUNGAN,
      ke: '/usulan',
      aksi: 'Lihat usulan',
    },
    {
      ikon: 'lokasi',
      label: 'Buat usulanmu',
      selesai: punyaUsulan,
      ke: punyaUsulan ? '/usulan-saya' : '/usulan/baru',
      aksi: punyaUsulan ? 'Pantau' : 'Tulis',
    },
  ];
  const jumlahSelesai = daftar.filter((item) => item.selesai).length;

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold">Langkahmu</h2>
        <span className="text-sm text-muted tabular-nums">
          {jumlahSelesai} dari {daftar.length} selesai
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-track" aria-hidden="true">
        <div
          className="h-full rounded-full bg-hijau-terang transition-[width] duration-500 ease-out"
          style={{ width: `${(jumlahSelesai / daftar.length) * 100}%` }}
        />
      </div>
      <ol className="mt-2">
        {daftar.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-3 border-t border-rule py-3 first:border-t-0"
          >
            <span
              className={cn(
                'grid size-9 flex-none place-items-center rounded-full border-2 border-ink',
                item.selesai && 'bg-hijau-terang text-hitam',
              )}
            >
              {item.selesai ? (
                <svg
                  viewBox="0 0 24 24"
                  width={18}
                  height={18}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : (
                <Icon name={item.ikon} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block text-[15px] font-semibold', item.selesai && 'text-muted')}>
                {item.label}
              </span>
              {item.keterangan && (
                <span className="block text-xs text-muted tabular-nums">{item.keterangan}</span>
              )}
              <span className="sr-only">{item.selesai ? ', selesai' : ', belum'}</span>
            </span>
            <Link
              to={user ? item.ke : '/login'}
              className={buttonClass(item.selesai ? 'outline' : 'primary', 'sm')}
            >
              {user ? item.aksi : 'Masuk'}
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** Tiga usulan dengan dukungan terbanyak, bisa langsung didukung dari sini. */
function PalingDidukung() {
  const proposalsQuery = useProposalsQuery();
  const teratas = useMemo(
    () =>
      pilihTeratas(
        (proposalsQuery.data ?? []).filter((proposal) => proposal.moderasi === 'Disetujui'),
        3,
      ),
    [proposalsQuery.data],
  );

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold">Paling didukung</h2>
        <Link to="/usulan" className="text-sm font-semibold text-warga underline">
          Semua usulan
        </Link>
      </div>
      {proposalsQuery.isPending ? (
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : proposalsQuery.isError ? (
        <ErrorState
          message={proposalsQuery.error.message}
          onRetry={() => {
            void proposalsQuery.refetch();
          }}
        />
      ) : teratas.length === 0 ? (
        <p className="mt-3 rounded-xl bg-active p-4 text-sm text-muted">
          Belum ada usulan yang didukung.{' '}
          <Link to="/usulan" className="font-semibold text-ink underline">
            Jadi pendukung pertama
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-2">
          {teratas.map((proposal) => (
            <li
              key={proposal.id}
              className="flex items-center gap-3 border-t border-rule py-3 first:border-t-0"
            >
              <span className="min-w-0 flex-1">
                <Link
                  to={`/usulan/${proposal.id}`}
                  className="block truncate text-[15px] font-semibold hover:underline"
                >
                  {proposal.judul}
                </Link>
                <span className="block truncate text-xs text-muted">{proposal.kategori}</span>
              </span>
              <UpvoteButton proposalId={proposal.id} jumlah={proposal.jumlah_suara} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * Lima bidang pilihan warga terbanyak. Garis APBD hanya untuk kategori yang APBD-nya sudah
 * terverifikasi, sama dengan aturan halaman Bandingkan.
 */
function PilihanWarga() {
  const gapQuery = useGapQuery();
  const categoriesQuery = useCategoriesQuery();
  const ringkasan = useMemo(
    () => siapkanGap(gapQuery.data ?? [], categoriesQuery.data?.map((item) => item.nama) ?? []),
    [gapQuery.data, categoriesQuery.data],
  );
  const lima = [...ringkasan.rows].sort((a, b) => b.persen_warga - a.persen_warga).slice(0, 5);
  const skala = Math.max(
    1,
    ...lima.flatMap((row) => [row.persen_warga, row.adaApbd ? row.persen_apbd : 0]),
  );
  const adaApbd = lima.some((row) => row.adaApbd);

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-base font-bold">Pilihan warga{adaApbd ? ' dan porsi APBD' : ''}</h2>
        <Link to="/bandingkan" className="text-sm font-semibold text-warga underline">
          Lihat perbandingan lengkap
        </Link>
      </div>
      {gapQuery.isPending ? (
        <Skeleton className="mt-4 h-48 w-full rounded-xl" />
      ) : gapQuery.isError ? (
        <ErrorState
          message={gapQuery.error.message}
          onRetry={() => {
            void gapQuery.refetch();
          }}
        />
      ) : !ringkasan.adaWarga ? (
        <div className="mt-3 rounded-xl bg-active p-4 text-sm">
          <p className="text-muted">Belum ada warga yang membagi anggaran.</p>
          <Link to="/simulator" className={buttonClass('primary', 'sm', 'mt-3')}>
            Jadi yang pertama
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            {ringkasan.jumlahPartisipan !== undefined
              ? `Dari ${formatAngka(ringkasan.jumlahPartisipan)} warga yang sudah membagi anggaran.`
              : 'Dari semua warga yang sudah membagi anggaran.'}
            {ringkasan.sorotan &&
              ` Selisih terbesar dengan APBD ada di ${ringkasan.sorotan.kategori}.`}
          </p>
          {adaApbd && (
            <p className="mt-3 flex items-center gap-4 text-xs text-muted" aria-hidden="true">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-hijau-terang" /> Warga
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-0.5 bg-ink" /> APBD
              </span>
            </p>
          )}
          <ul className="mt-3 space-y-2.5">
            {lima.map((row) => (
              <li
                key={row.kategori}
                className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3.5rem] items-center gap-3"
              >
                <span className="truncate text-sm">{row.kategori}</span>
                <span className="relative h-3.5 rounded-[4px] bg-track">
                  <span
                    className="bar-in absolute inset-y-0 left-0 rounded-[4px] bg-hijau-terang"
                    style={{ width: `${(row.persen_warga / skala) * 100}%` }}
                  />
                  {row.adaApbd && (
                    <span
                      className="absolute -top-1 -bottom-1 w-0.5 bg-ink"
                      style={{ left: `${(row.persen_apbd / skala) * 100}%` }}
                      title={`APBD ${formatPersen(row.persen_apbd)}`}
                    />
                  )}
                </span>
                <span className="text-right text-sm tabular-nums">
                  {formatPersen(row.persen_warga)}
                </span>
              </li>
            ))}
          </ul>
          {!adaApbd && (
            <p className="mt-3 text-xs text-muted">
              Data APBD masih diverifikasi, jadi porsinya belum ditampilkan di sini.
            </p>
          )}
        </>
      )}
    </Card>
  );
}

/**
 * Beranda warga: posisi Musrenbang tahun ini, tiga langkah yang dicentang dari data asli,
 * usulan paling didukung, dan pilihan warga dibanding APBD. Daftar lengkap ada di Usulan warga.
 */
export default function Beranda() {
  const { user, profile } = useAuth();
  const nama = profile?.nama?.split(' ')[0];

  return (
    <div className="space-y-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-[-0.01em]">
          {user && nama ? `Halo, ${nama}` : 'Beranda'}
        </h1>
        <p className="mt-1 text-muted">{kalimatTahap(new Date())}</p>
      </header>
      <JadwalMusrenbang />
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <LangkahMu />
        <PalingDidukung />
      </div>
      <PilihanWarga />
    </div>
  );
}
