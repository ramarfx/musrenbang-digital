import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useUserAllocationsQuery } from '@/features/allocations/queries';
import { useAuth } from '@/features/auth';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { useCategoriesQuery } from '@/features/categories/queries';
import { arahSelisih, siapkanGap } from '@/features/gap/lib';
import { useGapQuery } from '@/features/gap/queries';
import { pilihTeratas } from '@/features/proposals/components/TopProposals';
import { UpvoteButton } from '@/features/proposals/components/UpvoteButton';
import { useMyVotesQuery, useProposalsQuery } from '@/features/proposals/queries';
import { cn } from '@/lib/cn';
import { formatAngka, formatPersen } from '@/lib/format';
import { TAHAP_MUSRENBANG, tahapSekarang } from '@/lib/jadwal';

const TARGET_DUKUNGAN = 3;

/**
 * Kartu sambutan ramah warga awam: sapaan jelas, ringkasan tahap berjalan, dan opsi lihat jadwal.
 */
function SambutanWarga() {
  const { user, profile } = useAuth();
  const [bukaJadwal, setBukaJadwal] = useState(false);
  const sekarang = tahapSekarang(new Date());
  const tahapAktif = TAHAP_MUSRENBANG[sekarang];
  const namaPanggilan = profile?.nama?.trim().split(/\s+/)[0];

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-warga">
            Portal Musrenbang Warga
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {user && namaPanggilan
              ? `Selamat Datang, ${profile?.nama}`
              : 'Selamat Datang di Musrenbang Digital'}
          </h1>
          <p className="mt-1 max-w-2xl text-base text-muted">
            Sampaikan usulan, beri dukungan, dan bagi anggaran virtual. Lihat sendiri seberapa jauh
            prioritas warga dengan anggaran daerah (APBD).
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-active/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge tone="emerald" className="px-3 py-1 text-[13px] font-bold bg-warga">
              Tahap Aktif: {tahapAktif.nama}
            </Badge>
            <span className="text-sm font-semibold text-ink sm:text-base">
              ({tahapAktif.bulan})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setBukaJadwal((prev) => !prev)}
            className="text-sm font-bold text-warga underline hover:text-ink focus-visible:outline-warga"
          >
            {bukaJadwal ? 'Tutup rincian tahapan' : 'Lihat tahapan tahun ini'}
          </button>
        </div>

        {bukaJadwal && (
          <div className="mt-4 border-t border-border pt-4 anim-page">
            <p className="text-xs font-semibold text-muted">Alur 4 Tahap Musrenbang Tahunan:</p>
            <ol className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TAHAP_MUSRENBANG.map((tahap, index) => (
                <li
                  key={tahap.nama}
                  className={cn(
                    'rounded-xl p-3 text-center sm:text-left',
                    index === sekarang
                      ? 'bg-hijau-terang font-bold text-hitam'
                      : index < sekarang
                        ? 'bg-ink text-on-ink'
                        : 'bg-surface text-muted border border-border',
                  )}
                >
                  <span className="block text-xs font-light">
                    {index === sekarang ? 'Berjalan Sekarang' : tahap.bulan}
                  </span>
                  <span className="mt-0.5 block text-sm">{tahap.nama}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Tiga aksi utama dengan kartu besar, bahasa terang, dan tombol kontras tinggi.
 * Memandu warga awam tanpa perlu menebak navigasi aplikasi.
 */
function AksiUtamaWarga() {
  const { user } = useAuth();

  const menu = [
    {
      judul: '1. Buat Usulan Baru',
      keterangan:
        'Sampaikan kebutuhan di lingkungan Anda. Usulan tercatat terbuka dan statusnya bisa Anda pantau sampai selesai.',
      labelTombol: 'Tulis Usulan Baru',
      ikon: 'pensil' as IconName,
      ke: user ? '/usulan/baru' : '/login',
      varian: 'primary' as const,
    },
    {
      judul: '2. Dukung Usulan Warga',
      keterangan:
        'Beri suara untuk usulan warga lain. Makin banyak dukungan, makin jelas apa yang jadi prioritas bersama.',
      labelTombol: 'Lihat & Dukung Usulan',
      ikon: 'panah-atas' as IconName,
      ke: '/usulan',
      varian: 'outline' as const,
    },
    {
      judul: '3. Bagi Anggaran Virtual',
      keterangan:
        'Bagi anggaran ke bidang yang menurut Anda paling penting, lalu lihat jaraknya dengan anggaran daerah (APBD).',
      labelTombol: 'Buka Simulator Anggaran',
      ikon: 'simulator' as IconName,
      ke: '/simulator',
      varian: 'outline' as const,
    },
  ];

  return (
    <section aria-labelledby="judul-aksi-cepat">
      <h2 id="judul-aksi-cepat" className="sr-only">
        Aksi Cepat Warga
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {menu.map((item) => (
          <Card
            key={item.judul}
            className="flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5"
          >
            <div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-active text-ink">
                <Icon name={item.ikon} size={22} />
              </div>
              <h3 className="mt-3.5 text-lg font-bold text-ink">{item.judul}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.keterangan}</p>
            </div>
            <div className="mt-6 pt-2">
              <Link
                to={item.ke}
                className={buttonClass(item.varian, 'md', 'w-full text-base font-semibold')}
              >
                {item.labelTombol}
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

type Langkah = {
  nomor: number;
  label: string;
  penjelasan: string;
  statusTeks: string;
  selesai: boolean;
  ke: string;
  aksi: string;
};

/**
 * Checklist status partisipasi: 3 langkah warga dengan indikator jelas dan mudah dipahami.
 */
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
      nomor: 1,
      label: 'Buat Usulan Baru',
      penjelasan: 'Sampaikan kebutuhan di lingkungan Anda agar tercatat dan bisa dipantau.',
      statusTeks: punyaUsulan ? 'Usulan Anda Sudah Terkirim' : 'Belum Ada Usulan',
      selesai: punyaUsulan,
      ke: punyaUsulan ? '/usulan-saya' : '/usulan/baru',
      aksi: punyaUsulan ? 'Pantau Status' : 'Tulis Sekarang',
    },
    {
      nomor: 2,
      label: `Beri Dukungan untuk ${TARGET_DUKUNGAN} Usulan`,
      penjelasan: 'Dukung usulan sesama warga agar prioritas bersama terlihat jelas.',
      statusTeks: `${Math.min(jumlahDukungan, TARGET_DUKUNGAN)} dari ${TARGET_DUKUNGAN} usulan didukung`,
      selesai: jumlahDukungan >= TARGET_DUKUNGAN,
      ke: '/usulan',
      aksi: 'Lihat Usulan',
    },
    {
      nomor: 3,
      label: 'Bagi Anggaran Virtual',
      penjelasan:
        'Bagi anggaran ke bidang yang menurut Anda penting, lalu lihat jaraknya dengan APBD.',
      statusTeks: sudahUrut ? 'Sudah Diisi' : 'Belum Diisi',
      selesai: sudahUrut,
      ke: '/simulator',
      aksi: sudahUrut ? 'Ubah Urutan' : 'Mulai',
    },
  ];

  const jumlahSelesai = daftar.filter((item) => item.selesai).length;

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Status Partisipasi Anda</h2>
          <p className="mt-0.5 text-xs text-muted">
            Pantau kontribusi Anda dalam musyawarah perencanaan tahun ini
          </p>
        </div>
        <Badge
          tone={jumlahSelesai === daftar.length ? 'success' : 'neutral'}
          className="text-xs font-bold"
        >
          {jumlahSelesai} dari {daftar.length} langkah selesai
        </Badge>
      </div>

      <ol className="divide-y divide-border">
        {daftar.map((item) => (
          <li
            key={item.label}
            className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3.5">
              <span
                className={cn(
                  'grid size-8 flex-none place-items-center rounded-full text-sm font-bold',
                  item.selesai
                    ? 'bg-hijau-terang text-hitam'
                    : 'border-2 border-border bg-active text-muted',
                )}
              >
                {item.selesai ? (
                  <svg
                    viewBox="0 0 24 24"
                    width={18}
                    height={18}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                ) : (
                  item.nomor
                )}
              </span>
              <div>
                <span className="block text-base font-bold text-ink">{item.label}</span>
                <span className="mt-0.5 block text-sm text-muted">{item.penjelasan}</span>
                <span className="mt-1 inline-block text-xs font-semibold text-warga">
                  {item.statusTeks}
                </span>
              </div>
            </div>

            <div className="sm:self-center">
              <Link
                to={user ? item.ke : '/login'}
                className={buttonClass(
                  item.selesai ? 'outline' : 'primary',
                  'sm',
                  'w-full sm:w-auto',
                )}
              >
                {user ? item.aksi : 'Masuk Akun'}
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/**
 * Usulan paling didukung: kartu ramah baca dengan tombol upvote besar dan kategori yang jelas.
 */
function PalingDidukung() {
  const proposalsQuery = useProposalsQuery();
  const teratas = useMemo(
    () =>
      pilihTeratas(
        (proposalsQuery.data ?? []).filter((proposal) => proposal.moderasi === 'Disetujui'),
        5,
      ),
    [proposalsQuery.data],
  );

  return (
    <Card className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Usulan Warga Paling Populer</h2>
          <p className="mt-0.5 text-xs text-muted">Usulan yang sedang banyak didukung warga lain</p>
        </div>
        <Link to="/usulan" className="text-sm font-bold text-warga underline hover:text-ink">
          Lihat Semua Usulan →
        </Link>
      </div>

      {proposalsQuery.isPending ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-16 w-full rounded-2xl" />
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
        <div className="mt-4 rounded-2xl bg-active/40 p-5 text-center text-sm text-muted">
          Belum ada usulan yang terdaftar.{' '}
          <Link to="/usulan/baru" className="font-bold text-ink underline">
            Jadilah yang pertama membuat usulan
          </Link>
          .
        </div>
      ) : (
        <ul className="flex flex-1 flex-col divide-y divide-border">
          {teratas.map((proposal) => (
            <li key={proposal.id} className="flex flex-1 items-center gap-3.5 py-3.5">
              <CategoryTile kategori={proposal.kategori} gaya="cap" />
              <div className="min-w-0 flex-1">
                <Link
                  to={`/usulan/${proposal.id}`}
                  className="block text-base font-bold text-ink hover:underline line-clamp-2"
                >
                  {proposal.judul}
                </Link>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone="neutral" className="text-xs">
                    {proposal.kategori}
                  </Badge>
                  {proposal.lokasi && (
                    <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted">
                      <Icon name="lokasi" size={14} />
                      <span className="truncate">{proposal.lokasi}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-none">
                <UpvoteButton proposalId={proposal.id} jumlah={proposal.jumlah_suara} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * Ringkasan aspirasi bidang prioritas warga: sederhana, persentase jelas, tanpa grafik membingungkan.
 */
function AspirasiPilihanWarga() {
  const gapQuery = useGapQuery();
  const categoriesQuery = useCategoriesQuery();
  const ringkasan = useMemo(
    () => siapkanGap(gapQuery.data ?? [], categoriesQuery.data?.map((item) => item.nama) ?? []),
    [gapQuery.data, categoriesQuery.data],
  );
  const lima = [...ringkasan.rows].sort((a, b) => b.persen_warga - a.persen_warga).slice(0, 5);
  const adaApbd = ringkasan.teratas.length > 0;
  const skala = Math.max(
    1,
    ...(adaApbd ? ringkasan.teratas : lima).flatMap((row) => [
      row.persen_warga,
      row.adaApbd ? row.persen_apbd : 0,
    ]),
  );

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
          {adaApbd ? (
            <ul className="mt-4 grid gap-4 sm:grid-cols-3 sm:gap-0">
              {ringkasan.teratas.map((row) => {
                const arah = arahSelisih(row.gap_poin_persen);
                return (
                  <li
                    key={row.kategori}
                    className="border-t border-rule pt-4 first:border-t-0 first:pt-0 sm:border-t-0 sm:border-l-[1.5px] sm:border-edge sm:px-5 sm:pt-0 sm:first:border-l-0 sm:first:pl-0"
                  >
                    <p className="mb-2.5 font-bold">{row.kategori}</p>
                    {[
                      { nama: 'Warga', nilai: row.persen_warga, warna: 'bg-hijau-terang' },
                      { nama: 'APBD', nilai: row.persen_apbd, warna: 'bg-ink' },
                    ].map((batang) => (
                      <div
                        key={batang.nama}
                        className="mb-1.5 grid grid-cols-[2.75rem_minmax(0,1fr)_3.25rem] items-center gap-2.5 text-sm"
                      >
                        <span>{batang.nama}</span>
                        <span className="relative h-3 rounded-[3px] bg-track">
                          <span
                            className={`bar-in absolute inset-y-0 left-0 rounded-[3px] ${batang.warna}`}
                            style={{ width: `${(batang.nilai / skala) * 100}%` }}
                          />
                        </span>
                        <b className="text-right tabular-nums">{formatPersen(batang.nilai)}</b>
                      </div>
                    ))}
                    <span
                      className="mt-2 inline-block rounded-lg px-2.5 py-0.5 text-[13px] font-bold text-hitam"
                      style={{ backgroundColor: arah.warna }}
                    >
                      {arah.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
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
                  </span>
                  <span className="text-right text-sm tabular-nums">
                    {formatPersen(row.persen_warga)}
                  </span>
                </li>
              ))}
            </ul>
          )}
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
 * Petunjuk praktis untuk pengguna awam agar tidak ragu menggunakan aplikasi.
 */
function PetunjukAwam() {
  return (
    <Card className="border border-border bg-active/20">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-hijau-terang font-bold text-hitam text-sm">
          ?
        </span>
        <h2 className="text-base font-bold text-ink">Panduan Singkat untuk Warga</h2>
      </div>
      <div className="mt-3 grid gap-3 text-sm text-muted sm:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-surface p-3.5">
          <b className="block font-semibold text-ink">1. Siapa saja yang bisa usul?</b>
          <span className="mt-1 block text-xs leading-relaxed">
            Semua warga dapat mengajukan perbaikan sarana jalan, saluran, atau taman di
            lingkungannya.
          </span>
        </div>
        <div className="rounded-xl border border-border/70 bg-surface p-3.5">
          <b className="block font-semibold text-ink">2. Mengapa perlu didukung?</b>
          <span className="mt-1 block text-xs leading-relaxed">
            Usulan dengan banyak dukungan warga sekitar akan menjadi perhatian utama tim musyawarah
            kelurahan.
          </span>
        </div>
        <div className="rounded-xl border border-border/70 bg-surface p-3.5">
          <b className="block font-semibold text-ink">3. Bagaimana melacaknya?</b>
          <span className="mt-1 block text-xs leading-relaxed">
            Status usulan Anda dapat dicek kapan saja di menu Usulan Saya, mulai dari Diajukan
            hingga Selesai.
          </span>
        </div>
      </div>
    </Card>
  );
}

/**
 * Beranda warga: dirancang sederhana, praktis, ramah untuk semua kalangan (termasuk generasi senior/Boomer).
 */
export default function Beranda() {
  return (
    <div className="space-y-6">
      <SambutanWarga />
      <AksiUtamaWarga />
      <div className="grid gap-6 lg:grid-cols-2">
        <LangkahMu />
        <PalingDidukung />
      </div>
      <AspirasiPilihanWarga />
      <PetunjukAwam />
    </div>
  );
}
