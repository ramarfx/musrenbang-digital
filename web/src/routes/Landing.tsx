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
      <h2 id={id} className="flex-none text-[30px] leading-tight font-bold tracking-[-0.02em]">
        <span className="stabilo">{judul}</span>
      </h2>
      <p className="max-w-[52ch] text-[15px] text-muted">{children}</p>
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
    judul: 'Urutkan prioritasmu',
    isi: 'Susun bidang mana yang paling penting menurutmu. Urutanmu digabung dengan warga lain.',
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
          className="mx-auto grid max-w-[1160px] items-center gap-8 px-4 pt-12 pb-10 sm:px-6 md:grid-cols-[1.05fr_1fr] md:pt-16 lg:gap-14"
        >
          <div>
            <h1
              id="judul-utama"
              className="text-[40px] leading-[1.32] font-bold tracking-[-0.035em] sm:text-[54px]"
            >
              Suara warga, sampai ke <span className="stabilo">meja anggaran.</span>
            </h1>
            <p className="mt-5 max-w-[50ch] text-[17px] text-muted">
              Usulkan program untuk lingkunganmu, dukung usulan tetangga, lalu lihat seberapa jauh
              prioritas warga dari APBD {kota} {tahun}. Semua usulan dan perbandingannya bisa dibaca
              tanpa akun.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/beranda"
                state={{ masukApp: true }}
                className={buttonClass('primary', 'md', 'h-12 px-6 text-[15px]')}
              >
                Masuk beranda
              </Link>
              <Link
                to="/usulan"
                state={{ masukApp: true }}
                className={buttonClass('outline', 'md', 'h-12 border-edge px-6 text-[15px]')}
              >
                Lihat usulan warga
              </Link>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[460px] md:max-w-none">
            <Toa />
          </div>
        </section>

        <section aria-label="Bidang usulan" className="mx-auto max-w-[1160px] px-4 sm:px-6">
          <div
            ref={bidangRef}
            className={cn('masuk border-y border-rule py-6', bidangTampak && 'masuk-tampak')}
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
              <ul className="flex flex-wrap gap-x-7 gap-y-2.5 text-[17px] font-bold tracking-[-0.01em]">
                {categoriesQuery.data.map((kategori) => (
                  <li key={kategori.nama}>{kategori.nama}</li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section
          id="fitur"
          aria-labelledby="judul-fitur"
          className="mx-auto max-w-[1160px] scroll-mt-6 px-4 pt-20 sm:px-6"
        >
          <JudulBagian id="judul-fitur" judul="Yang bisa kamu lakukan">
            Empat langkah, dari menulis usulan sampai melihat apakah anggaran kota sejalan dengan
            pilihan warga.
          </JudulBagian>
          <ol
            ref={fiturRef}
            className={cn(
              'masuk-stagger mt-10 grid gap-6 md:grid-cols-2',
              fiturTampak && 'masuk-tampak',
            )}
          >
            {FITUR.map((fitur, index) => (
              <li
                key={fitur.judul}
                className={cn(
                  'kartu-cap flex flex-col justify-between gap-8 rounded-[28px] p-6 sm:flex-row sm:items-end sm:p-8',
                  fitur.gelap ? 'bg-hijau text-white' : 'bg-surface',
                )}
              >
                <div className="flex min-h-full flex-col justify-between gap-8">
                  <div>
                    <p
                      className={cn(
                        'text-[13px] tabular-nums',
                        fitur.gelap ? 'text-white/75' : 'text-muted',
                      )}
                    >
                      Langkah {index + 1}
                    </p>
                    <h3 className="mt-2 text-[24px] leading-tight font-bold tracking-[-0.02em]">
                      <span className={fitur.gelap ? 'stabilo' : undefined}>{fitur.judul}</span>
                    </h3>
                    <p
                      className={cn(
                        'mt-3 max-w-[36ch] text-[15px]',
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
                    'grid size-24 flex-none place-items-center self-end rounded-[22px] border-2',
                    fitur.gelap
                      ? 'border-white/30 text-hijau-terang'
                      : 'border-edge bg-hijau-terang text-hitam',
                  )}
                >
                  <Icon name={fitur.ikon} size={44} filled={fitur.ikon === 'panah-atas'} />
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="judul-ajakan"
          className="mx-auto max-w-[1160px] px-4 pt-20 sm:px-6"
        >
          <div
            ref={ajakanRef}
            className={cn(
              'masuk kartu-cap grid items-center gap-8 rounded-[28px] bg-mint-pucat p-6 sm:p-10 md:grid-cols-[1.4fr_1fr]',
              ajakanTampak && 'masuk-tampak',
            )}
          >
            <div>
              <h2
                id="judul-ajakan"
                className="text-[28px] leading-tight font-bold tracking-[-0.02em]"
              >
                Anggaran kota juga urusanmu
              </h2>
              <p className="mt-3 max-w-[50ch] text-[15px] text-ink">
                Daftar dengan email atau akun Google, lalu tulis usulan untuk lingkunganmu. Admin
                memeriksa usulan dulu sebelum tampil untuk umum.
              </p>
              <Link
                to={user ? '/usulan/baru' : '/login'}
                className={buttonClass('primary', 'md', 'mt-6 h-12 px-6 text-[15px]')}
              >
                {user ? 'Tulis usulan sekarang' : 'Daftar dan mulai mengusulkan'}
              </Link>
            </div>
            <div className="flex justify-center md:justify-end">
              <KotakSuara />
            </div>
          </div>
        </section>

        <section
          id="transparansi"
          aria-labelledby="judul-transparansi"
          className="mx-auto max-w-[1160px] scroll-mt-6 px-4 pt-20 pb-20 sm:px-6"
        >
          <JudulBagian id="judul-transparansi" judul="Terbuka untuk dicek">
            Tiga aturan yang membuat angka dan status di aplikasi ini bisa ditelusuri ulang.
          </JudulBagian>
          <div
            ref={transparansiRef}
            className={cn(
              'masuk-stagger kartu-cap mt-10 grid rounded-[28px] bg-surface md:grid-cols-3',
              transparansiTampak && 'masuk-tampak',
            )}
          >
            {TRANSPARANSI.map((butir, index) => (
              <article
                key={butir.judul}
                className={cn(
                  'flex flex-col justify-between gap-6 p-6 sm:p-8',
                  index > 0 && 'border-t border-rule md:border-t-0 md:border-l',
                )}
              >
                <div>
                  <h3 className="text-[19px] leading-snug font-bold">{butir.judul}</h3>
                  <p className="mt-2.5 text-[15px] text-muted">{butir.isi}</p>
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
        <div className="mx-auto flex max-w-[1160px] flex-col gap-6 rounded-[28px] bg-hijau px-6 py-8 text-white sm:px-10 md:flex-row md:items-center md:justify-between">
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
