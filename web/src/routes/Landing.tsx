import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import logoTerbalik from '@/assets/logo/mb-lockup-horizontal-terbalik.svg';
import logoColor from '@/assets/logo/mb-lockup-horizontal-warna.svg';
import { Toa } from '@/components/brand/Toa';
import { buttonClass } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { MenuAkun } from '@/components/layout/MenuAkun';
import { useAuth } from '@/features/auth';
import { useCategoriesQuery } from '@/features/categories/queries';
import { useAppConfigQuery } from '@/features/config/queries';
import { cn } from '@/lib/cn';
import { useMasukTerlihat } from '@/lib/reveal';

/** Logo resmi sesuai panduan: versi berwarna di kertas, versi terbalik di latar gelap. */
function Logo({ selaluGelap = false }: { selaluGelap?: boolean }) {
  const gelap = (
    <img
      src={logoTerbalik}
      alt="Musrenbang Digital"
      draggable={false}
      className={cn('h-[38px] w-auto', !selaluGelap && 'hidden dark:block')}
    />
  );
  if (selaluGelap) return gelap;
  return (
    <>
      <img
        src={logoColor}
        alt="Musrenbang Digital"
        draggable={false}
        className="h-[38px] w-auto dark:hidden"
      />
      {gelap}
    </>
  );
}

/** Judul bagian dengan tanda stabilo, motif yang sama dengan judul halaman di dalam aplikasi. */
function JudulBagian({ id, judul, children }: { id: string; judul: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
      <h2 id={id} className="flex-none text-[24px] leading-tight font-bold tracking-[-0.02em] sm:text-[30px]">
        <span className="stabilo">{judul}</span>
      </h2>
      <p className="max-w-[52ch] text-sm text-muted sm:text-[15px]">{children}</p>
    </div>
  );
}

type Fitur = {
  judul: string;
  isi: string;
  ke: string;
  aksi: string;
  ikon: IconName;
  gelap: boolean;
};

/*
 * Empat hal yang dikerjakan warga di aplikasi, berurutan sesuai alurnya. Kartu gelap dan
 * terang berselang seperti desain acuan; urutan diagonal membuat dua langkah utama
 * (mengusulkan dan membandingkan) yang paling menonjol.
 */
const FITUR: Fitur[] = [
  {
    judul: 'Usulkan program',
    isi: 'Usulkan program pembangunan di sekitarmu, pilih bidangnya, dan tandai lokasinya di peta.',
    ke: '/usulan/baru',
    aksi: 'Tulis usulan',
    ikon: 'usulan',
    gelap: true,
  },
  {
    judul: 'Dukung usulan tetangga',
    isi: 'Satu akun satu upvote untuk tiap usulan, dan bisa dibatalkan kapan saja.',
    ke: '/beranda',
    aksi: 'Lihat usulan warga',
    ikon: 'panah-atas',
    gelap: false,
  },
  {
    judul: 'Pilih 3 prioritas',
    isi: 'Pilih tiga bidang yang paling penting, lalu bagi 10 koin di antaranya. Pilihanmu digabung dengan warga lain.',
    ke: '/simulator',
    aksi: 'Buka simulator',
    ikon: 'simulator',
    gelap: false,
  },
  {
    judul: 'Bandingkan dengan APBD',
    isi: 'Lihat bidang mana yang porsi anggarannya paling jauh dari pilihan warga.',
    ke: '/bandingkan',
    aksi: 'Lihat perbandingan',
    ikon: 'bandingkan',
    gelap: true,
  },
];

const TRANSPARANSI = [
  {
    judul: 'Setiap perubahan status punya catatan',
    isi: 'Admin wajib menulis alasan setiap kali status usulan berubah. Catatannya tampil di riwayat usulan dan bisa dibaca siapa saja.',
    ke: '/beranda',
    aksi: 'Lihat riwayat usulan',
  },
  {
    judul: 'Angka APBD harus bersumber',
    isi: 'Hanya data APBD terverifikasi dengan tautan sumber yang ikut dibandingkan. Data yang belum terverifikasi ditandai, bukan disembunyikan.',
    ke: '/apbd',
    aksi: 'Lihat data APBD',
  },
  {
    judul: 'Cara hitungnya terbuka',
    isi: 'Rumus selisih warga dan APBD, beserta batas datanya, dijelaskan di satu halaman.',
    ke: '/metodologi',
    aksi: 'Baca metodologi',
  },
];

/** Tautan teks dengan panah dalam lingkaran: satu-satunya penanda "pindah halaman" di landing. */
function TautanPanah({
  ke,
  children,
  terang,
}: {
  ke: string;
  children: ReactNode;
  terang: boolean;
}) {
  return (
    <Link
      to={ke}
      className={cn(
        'group/tautan inline-flex min-h-11 items-center gap-2.5 rounded-xl text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-4',
        terang ? 'text-white focus-visible:outline-hijau-terang' : 'text-ink',
      )}
    >
      <span
        className={cn(
          'grid size-8 place-items-center rounded-full transition-transform duration-150 ease-out group-hover/tautan:translate-x-0.5',
          terang ? 'bg-hijau-terang text-hitam' : 'bg-ink text-on-ink',
        )}
      >
        <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true">
          <path
            d="M7 17 17 7M9 7h8v8"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {children}
    </Link>
  );
}

/*
 * Kotak suara: penutup bagian ajakan, pengganti wajah maskot di desain acuan. Saat kursor
 * menyentuh: kertas dengan centang turun dan masuk ke kotak, kotak menyusul membal pelan
 * sesaat setelahnya, seperti usulan yang baru dikirim diterima. Lihat .kotak-surat di
 * index.css. Mati di layar sentuh dan saat prefers-reduced-motion aktif.
 */
function KotakSuara() {
  return (
    <svg
      viewBox="0 0 220 180"
      aria-hidden="true"
      className="kotak-surat h-auto w-full max-w-[240px]"
      fill="none"
    >
      <ellipse cx={110} cy={150} rx={96} ry={16} stroke="var(--ink)" strokeWidth={2} />
      <g transform="rotate(-8 110 57)">
        <g className="ks-surat">
          <path
            d="M78 22 L142 22 L142 92 L78 92 Z"
            fill="var(--surface)"
            stroke="var(--ink)"
            strokeWidth={3.5}
            strokeLinejoin="round"
          />
          <path
            d="M94 54 l12 12 l22 -26"
            stroke="var(--ink)"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
      <g className="ks-kotak">
        <rect
          x={40}
          y={74}
          width={140}
          height={74}
          rx={10}
          fill="var(--hijau-terang)"
          stroke="var(--ink)"
          strokeWidth={3.5}
        />
        <rect x={72} y={74} width={76} height={10} rx={5} fill="var(--hitam)" />
        <path d="M40 98 H180" stroke="var(--ink)" strokeWidth={2.5} />
      </g>
    </svg>
  );
}

/**
 * Landing page untuk pengunjung baru: apa itu Musrenbang Digital, apa yang bisa dilakukan,
 * dan kenapa angkanya bisa dipercaya. Semua tautan menuju halaman yang memang ada.
 */
export default function Landing() {
  const { user, loading } = useAuth();
  const configQuery = useAppConfigQuery();
  const categoriesQuery = useCategoriesQuery();
  const kota = configQuery.data?.kota ?? 'DKI Jakarta';
  const tahun = configQuery.data?.tahunAnggaran ?? 2025;

  // Hero sudah terlihat saat halaman dibuka, jadi tidak perlu animasi masuk; bagian di
  // bawahnya memudar naik satu per satu begitu pertama kali terlihat saat discroll.
  const [bidangRef, bidangTampak] = useMasukTerlihat<HTMLDivElement>();
  const [fiturRef, fiturTampak] = useMasukTerlihat<HTMLOListElement>();
  const [ajakanRef, ajakanTampak] = useMasukTerlihat<HTMLDivElement>();
  const [transparansiRef, transparansiTampak] = useMasukTerlihat<HTMLDivElement>();

  return (
    <div className="min-h-dvh bg-ground text-ink">
      <a
        href="#isi"
        className="sr-only z-50 rounded-xl bg-ink px-4 py-2 text-on-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Lewati ke isi
      </a>

      <header className="mx-auto flex max-w-[1160px] items-center justify-between gap-4 px-4 pt-5 sm:px-6">
        <Link
          to="/"
          className="flex items-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <Logo />
        </Link>
        <nav aria-label="Navigasi landing" className="hidden items-center gap-1 md:flex">
          {[
            ['#fitur', 'Fitur'],
            ['#transparansi', 'Transparansi'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-xl px-3.5 py-2.5 text-[15px] font-medium hover:bg-active"
            >
              {label}
            </a>
          ))}
          <Link
            to="/metodologi"
            className="rounded-xl px-3.5 py-2.5 text-[15px] font-medium hover:bg-active"
          >
            Metodologi
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!loading &&
            (user ? (
              <MenuAkun />
            ) : (
              <Link to="/login" className={cn(buttonClass('outline', 'md'), 'border-edge')}>
                Masuk
              </Link>
            ))}
        </div>
      </header>

      <main id="isi">
        <section
          aria-labelledby="judul-utama"
          className="mx-auto grid max-w-[1160px] items-center gap-5 px-4 pt-6 pb-8 sm:gap-8 sm:px-6 sm:pt-12 sm:pb-10 md:grid-cols-[1.05fr_1fr] md:pt-16 lg:gap-14"
        >
          <div>
            <h1
              id="judul-utama"
              className="text-[32px] leading-[1.28] font-bold tracking-[-0.035em] sm:text-[54px] sm:leading-[1.32]"
            >
              Suara warga, sampai ke <span className="stabilo">meja anggaran.</span>
            </h1>
            <p className="mt-3.5 max-w-[50ch] text-[15px] text-muted sm:mt-5 sm:text-[17px]">
              Usulkan program untuk anggaran kota tahun depan, dukung usulan tetangga, lalu lihat
              seberapa jauh prioritas warga dari APBD {kota} {tahun}. Semua usulan dan
              perbandingannya bisa dibaca tanpa akun.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-7 sm:flex sm:flex-wrap sm:gap-3">
              <Link
                to="/beranda"
                state={{ masukApp: true }}
                className={buttonClass('primary', 'md', 'h-12 px-4 text-[15px] sm:px-6')}
              >
                Masuk beranda
              </Link>
              <Link
                to="/usulan"
                state={{ masukApp: true }}
                className={buttonClass('outline', 'md', 'h-12 border-edge px-4 text-[15px] sm:px-6')}
              >
                Lihat usulan
              </Link>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[250px] sm:max-w-[460px] md:max-w-none">
            <Toa />
          </div>
        </section>

        <section aria-label="Bidang usulan" className="mx-auto max-w-[1160px] px-4 sm:px-6">
          <div
            ref={bidangRef}
            className={cn('masuk border-y border-rule py-4 sm:py-6', bidangTampak && 'masuk-tampak')}
          >
            <p className="mb-3 text-[13px] text-muted">Bidang yang bisa kamu usulkan</p>
            {categoriesQuery.isPending && (
              <p className="text-[15px] text-muted">Memuat bidang...</p>
            )}
            {categoriesQuery.isError && (
              <p className="text-[15px] text-muted">
                Daftar bidang belum bisa dimuat. Coba muat ulang halaman.
              </p>
            )}
            {categoriesQuery.isSuccess && categoriesQuery.data.length === 0 && (
              <p className="text-[15px] text-muted">Belum ada bidang yang terdaftar.</p>
            )}
            {categoriesQuery.isSuccess && categoriesQuery.data.length > 0 && (
              <ul className="trek-sembunyi -mx-4 flex gap-2 overflow-x-auto px-4 text-sm font-bold sm:mx-0 sm:flex-wrap sm:gap-x-7 sm:gap-y-2.5 sm:overflow-visible sm:px-0 sm:text-[17px] sm:tracking-[-0.01em]">
                {categoriesQuery.data.map((kategori) => (
                  <li
                    key={kategori.nama}
                    className="flex-none rounded-full border-[1.5px] border-ink bg-surface px-3 py-1.5 whitespace-nowrap sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
                  >
                    {kategori.nama}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section
          id="fitur"
          aria-labelledby="judul-fitur"
          className="mx-auto max-w-[1160px] scroll-mt-6 px-4 pt-12 sm:px-6 sm:pt-20"
        >
          <JudulBagian id="judul-fitur" judul="Yang bisa kamu lakukan">
            Empat langkah, dari menulis usulan sampai melihat apakah anggaran kota sejalan dengan
            pilihan warga.
          </JudulBagian>
          <ol
            ref={fiturRef}
            className={cn(
              'masuk-stagger mt-6 grid grid-cols-2 gap-2.5 sm:mt-10 sm:gap-6',
              fiturTampak && 'masuk-tampak',
            )}
          >
            {FITUR.map((fitur, index) => (
              <li
                key={fitur.judul}
                className={cn(
                  'kartu-cap flex flex-col justify-between gap-3 rounded-[20px] p-3.5 sm:flex-row sm:items-end sm:gap-8 sm:rounded-[28px] sm:p-8',
                  fitur.gelap ? 'bg-hijau text-white' : 'bg-surface',
                )}
              >
                <div className="flex flex-1 flex-col justify-between gap-3 sm:min-h-full sm:gap-8">
                  <div>
                    <p
                      className={cn(
                        'text-[13px] tabular-nums',
                        fitur.gelap ? 'text-white/75' : 'text-muted',
                      )}
                    >
                      Langkah {index + 1}
                    </p>
                    <h3 className="mt-1 text-[15px] leading-tight font-bold tracking-[-0.01em] sm:mt-2 sm:text-[24px] sm:tracking-[-0.02em]">
                      <span className={fitur.gelap ? 'stabilo' : undefined}>{fitur.judul}</span>
                    </h3>
                    <p
                      className={cn(
                        'mt-1.5 line-clamp-4 max-w-[36ch] text-[12px] leading-snug sm:mt-3 sm:line-clamp-none sm:text-[15px] sm:leading-normal',
                        fitur.gelap ? 'text-white/80' : 'text-muted',
                      )}
                    >
                      {fitur.isi}
                    </p>
                  </div>
                  <TautanPanah ke={fitur.ke} terang={fitur.gelap}>
                    {fitur.aksi}
                  </TautanPanah>
                </div>
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-10 flex-none place-items-center self-start rounded-xl border-2 max-sm:order-first sm:size-24 sm:self-end sm:rounded-[22px]',
                    fitur.gelap
                      ? 'border-white/30 text-hijau-terang'
                      : 'border-edge bg-hijau-terang text-hitam',
                  )}
                >
                  <span className="sm:hidden">
                    <Icon name={fitur.ikon} size={22} filled={fitur.ikon === 'panah-atas'} />
                  </span>
                  <span className="hidden sm:block">
                    <Icon name={fitur.ikon} size={44} filled={fitur.ikon === 'panah-atas'} />
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="judul-ajakan"
          className="mx-auto max-w-[1160px] px-4 pt-12 sm:px-6 sm:pt-20"
        >
          <div
            ref={ajakanRef}
            className={cn(
              'masuk kartu-cap grid items-center gap-5 rounded-[22px] bg-mint-pucat p-5 sm:gap-8 sm:rounded-[28px] sm:p-10 md:grid-cols-[1.4fr_1fr]',
              ajakanTampak && 'masuk-tampak',
            )}
          >
            <div>
              <h2
                id="judul-ajakan"
                className="text-[22px] leading-tight font-bold tracking-[-0.02em] sm:text-[28px]"
              >
                Anggaran kota juga urusanmu
              </h2>
              <p className="mt-2.5 max-w-[50ch] text-sm text-ink sm:mt-3 sm:text-[15px]">
                Daftar dengan email atau akun Google, lalu tulis usulan untuk anggaran tahun depan.
                Admin memeriksa usulan dulu sebelum tampil untuk umum.
              </p>
              <Link
                to={user ? '/usulan/baru' : '/login'}
                className={buttonClass('primary', 'md', 'mt-4 h-12 w-full px-6 text-[15px] sm:mt-6 sm:w-auto')}
              >
                {user ? 'Tulis usulan sekarang' : 'Daftar dan mulai mengusulkan'}
              </Link>
            </div>
            <div className="hidden justify-center sm:flex md:justify-end">
              <KotakSuara />
            </div>
          </div>
        </section>

        <section
          id="transparansi"
          aria-labelledby="judul-transparansi"
          className="mx-auto max-w-[1160px] scroll-mt-6 px-4 pt-12 pb-12 sm:px-6 sm:pt-20 sm:pb-20"
        >
          <JudulBagian id="judul-transparansi" judul="Terbuka untuk dicek">
            Tiga aturan yang membuat angka dan status di aplikasi ini bisa ditelusuri ulang.
          </JudulBagian>
          <div
            ref={transparansiRef}
            className={cn(
              'masuk-stagger trek-sembunyi mt-6 flex snap-x snap-mandatory gap-2.5 overflow-x-auto sm:kartu-cap sm:mt-10 sm:grid sm:gap-0 sm:overflow-hidden sm:rounded-[28px] sm:bg-surface md:grid-cols-3',
              transparansiTampak && 'masuk-tampak',
            )}
          >
            {TRANSPARANSI.map((butir, index) => (
              <article
                key={butir.judul}
                className={cn(
                  'kartu-cap flex w-[260px] flex-none snap-start flex-col justify-between gap-4 rounded-[20px] bg-surface p-4 sm:w-auto sm:gap-6 sm:rounded-none sm:p-8 sm:shadow-none sm:border-0 sm:[box-shadow:none]',
                  index > 0 && 'sm:border-t sm:border-rule md:border-t-0 md:border-l',
                )}
              >
                <div>
                  <h3 className="text-[16px] leading-snug font-bold sm:text-[19px]">{butir.judul}</h3>
                  <p className="mt-2 text-[13px] text-muted sm:mt-2.5 sm:text-[15px]">{butir.isi}</p>
                </div>
                <Link
                  to={butir.ke}
                  className="inline-flex min-h-11 w-fit items-center rounded-lg text-[15px] font-semibold text-warga underline underline-offset-4"
                >
                  {butir.aksi}
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="px-4 pb-4 sm:px-6">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-4 rounded-[22px] bg-hijau px-5 py-6 text-white sm:gap-6 sm:rounded-[28px] sm:px-10 sm:py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo selaluGelap />
            <p className="mt-3 max-w-[48ch] text-[14px] text-white/75">
              Musrenbang Digital adalah prototipe partisipasi warga, bukan sistem pemerintah.
            </p>
          </div>
          <nav aria-label="Navigasi footer" className="flex flex-wrap gap-x-5 gap-y-1">
            {[
              ['/beranda', 'Usulan warga'],
              ['/bandingkan', 'Bandingkan'],
              ['/apbd', 'Data APBD'],
              ['/metodologi', 'Metodologi'],
            ].map(([ke, label]) => (
              <Link
                key={ke}
                to={ke}
                className="inline-flex min-h-11 items-center text-[15px] text-white/90 hover:text-hijau-terang focus-visible:outline-hijau-terang"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
