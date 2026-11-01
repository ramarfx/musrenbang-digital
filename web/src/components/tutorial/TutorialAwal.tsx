import logo from '@/assets/logo/mb-lockup-horizontal-warna.svg';
import { useEffect, useState, type ReactNode } from 'react';
import { Toa } from '@/components/brand/Toa';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import {
  JalurMusrenbang,
  KartuDukung,
  KotaSiap,
  LerengUrutan,
  PanggungPrioritas,
} from './IlustrasiTutorial';

// Latihan memakai empat bidang tetap dan urutan APBD contoh, bukan data asli: tidak ada yang
// disimpan, dan layarnya menyebut "contoh" supaya tidak terbaca sebagai angka resmi.
const BIDANG = [
  { nama: 'Pendidikan', ikon: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5' },
  {
    nama: 'Kesehatan',
    ikon: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  },
  { nama: 'Jalan', ikon: 'M8 3 4 21M16 3l4 18M12 5v2M12 11v2M12 17v2' },
  { nama: 'Lingkungan', ikon: 'M5 19c0-8 6-14 15-14 0 9-6 15-14 15M5 19l7-7' },
] as const;
const IKON_BIDANG = Object.fromEntries(BIDANG.map((bidang) => [bidang.nama, bidang.ikon]));
const APBD_CONTOH: Record<string, number> = {
  Jalan: 1,
  Pendidikan: 2,
  Kesehatan: 3,
  Lingkungan: 4,
};
const TAHAP = ['Kenalan', 'Alur', 'Latihan', 'Hasil', 'Dukung', 'Siap'] as const;

function IkonGaris({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function Judul({ judul, isi }: { judul: string; isi: string }) {
  return (
    <div className="tt-muncul">
      <h2
        id="judul-tutorial"
        className="text-[22px] leading-tight font-bold tracking-[-0.015em] sm:text-[26px] lg:text-[32px]"
      >
        {judul}
      </h2>
      <p className="mt-3 max-w-[42ch] text-[15px] text-muted sm:text-base lg:text-[17px]">{isi}</p>
    </div>
  );
}

/** Deret nomor langkah yang tersambung garis; nama tahap hanya muncul di layar lebar. */
function Stepper({ langkah }: { langkah: number }) {
  return (
    <ol className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-2">
      {TAHAP.map((nama, index) => {
        const lewat = index < langkah;
        const kini = index === langkah;
        return (
          <li key={nama} className="flex min-w-0 items-center gap-1 sm:gap-2">
            {index > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  'h-0.5 w-4 rounded-full transition-colors duration-300 sm:w-7',
                  lewat || kini ? 'bg-ink' : 'bg-track',
                )}
              />
            )}
            <span
              aria-current={kini ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-full transition-colors duration-200',
                kini && 'bg-ink py-1 pr-3 pl-1 text-on-ink',
              )}
            >
              <span
                className={cn(
                  'grid size-6 flex-none place-items-center rounded-full border-2 text-[11px] font-bold',
                  kini && 'border-hijau-terang bg-hijau-terang text-hitam',
                  lewat && 'border-ink bg-ink text-on-ink',
                  !kini && !lewat && 'border-mati text-muted',
                )}
              >
                {lewat ? (
                  <svg
                    viewBox="0 0 24 24"
                    width={13}
                    height={13}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span className={cn('hidden text-[13px] font-semibold', kini && 'lg:inline')}>
                {nama}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Tutorial satu layar penuh yang muncul sekali sesudah pertama kali masuk: enam langkah
 * bergambar dengan sedikit teks, termasuk latihan mengurutkan prioritas yang langsung
 * dibandingkan dengan APBD contoh. Layar penuh dipilih supaya warga fokus, bukan melihat
 * halaman di belakangnya. "Lewati" dan Escape sama-sama menutup dan menandainya selesai.
 */
export function TutorialAwal({ onSelesai }: { onSelesai: (tujuan?: string) => void }) {
  const [langkah, setLangkah] = useState(0);
  const [urut, setUrut] = useState<string[]>([]);
  const [galat, setGalat] = useState('');
  const [dukungan, setDukungan] = useState(23);
  const terakhir = langkah === TAHAP.length - 1;

  // Angka dukungan naik tepat saat tombol dukung selesai melompat (lihat `tt-naik`).
  useEffect(() => {
    if (langkah !== 4) return;
    setDukungan(23);
    const timer = setTimeout(() => setDukungan(24), 760);
    return () => clearTimeout(timer);
  }, [langkah]);

  const ketuk = (nama: string) => {
    setGalat('');
    setUrut((lama) =>
      lama.includes(nama) ? lama.filter((item) => item !== nama) : [...lama, nama],
    );
  };

  const lanjut = () => {
    if (langkah === 2 && urut.length < BIDANG.length) {
      setGalat('Urutkan keempatnya dulu');
      return;
    }
    if (terakhir) onSelesai('/simulator');
    else setLangkah(langkah + 1);
  };

  const baris = urut.map((nama, index) => ({
    nama,
    kamu: index + 1,
    apbd: APBD_CONTOH[nama] ?? 0,
  }));
  const sorotan = baris.reduce<(typeof baris)[number] | undefined>(
    (paling, item) =>
      !paling || Math.abs(item.kamu - item.apbd) > Math.abs(paling.kamu - paling.apbd)
        ? item
        : paling,
    undefined,
  );
  const temuan =
    !sorotan || sorotan.kamu === sorotan.apbd
      ? 'Urutanmu sama persis dengan APBD.'
      : `Kamu taruh ${sorotan.nama} di nomor ${sorotan.kamu}, APBD di nomor ${sorotan.apbd}.`;

  const isi: { gambar: ReactNode; teks: ReactNode }[] = [
    {
      gambar: <Toa className="max-w-[520px]" />,
      teks: (
        <Judul
          judul="Suaramu ikut menentukan anggaran kota"
          isi="Usulan warga dibawa ke rapat resmi sebelum anggaran dibagi. Kenalan sebentar, sekitar satu menit."
        />
      ),
    },
    {
      gambar: <JalurMusrenbang />,
      teks: (
        <Judul
          judul="Musrenbang, rapat usulan tiap tahun"
          isi="Usulanmu naik bertahap dari kelurahan sampai masuk APBD."
        />
      ),
    },
    {
      gambar: <PanggungPrioritas urut={urut} ikonBidang={IKON_BIDANG} />,
      teks: (
        <>
          <span className="tt-muncul mb-3 self-start rounded-full bg-ground px-2.5 py-0.5 text-xs text-muted">
            Latihan, tidak disimpan
          </span>
          <Judul
            judul="Mana yang paling penting buatmu?"
            isi="Ketuk satu per satu. Yang kamu ketuk pertama jadi nomor 1."
          />
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {BIDANG.map((bidang) => {
              const nomor = urut.indexOf(bidang.nama) + 1;
              const dipilih = nomor > 0;
              return (
                <button
                  key={bidang.nama}
                  type="button"
                  aria-pressed={dipilih}
                  aria-label={
                    dipilih ? `${bidang.nama}, nomor ${nomor}, ketuk untuk batal` : bidang.nama
                  }
                  onClick={() => ketuk(bidang.nama)}
                  className={cn(
                    'flex min-h-14 items-center gap-2.5 rounded-xl border-[1.5px] p-3 text-left text-[15px] font-semibold transition-[scale,background-color,border-color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2',
                    dipilih
                      ? 'border-ink bg-mint-pucat'
                      : 'border-border bg-surface hover:bg-active',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-[34px] flex-none place-items-center rounded-full border-2 border-ink',
                      dipilih ? 'bg-hijau-terang text-hitam' : 'bg-surface',
                    )}
                  >
                    <IkonGaris d={bidang.ikon} />
                  </span>
                  <span className="min-w-0 flex-1">{bidang.nama}</span>
                  <span
                    className={cn(
                      'grid size-7 flex-none place-items-center rounded-full text-sm',
                      dipilih ? 'bg-ink text-on-ink' : 'border-[1.5px] border-dashed border-mati',
                    )}
                  >
                    {dipilih ? nomor : ''}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex min-h-6 items-center justify-between gap-3">
            <span role="alert" className="text-[13px] text-[var(--merah)]">
              {galat}
            </span>
            <button
              type="button"
              onClick={() => {
                setUrut([]);
                setGalat('');
              }}
              className="text-[13px] text-muted underline hover:text-ink"
            >
              Ulangi dari awal
            </button>
          </div>
        </>
      ),
    },
    {
      gambar: <LerengUrutan baris={baris} sorot={sorotan?.nama ?? ''} />,
      teks: <Judul judul="Ini bedanya dengan APBD" isi={temuan} />,
    },
    {
      gambar: <KartuDukung jumlah={dukungan} />,
      teks: (
        <Judul
          judul="Dukung usulan tetanggamu"
          isi="Makin banyak dukungan, makin besar peluangnya dibahas di rapat."
        />
      ),
    },
    {
      gambar: <KotaSiap />,
      teks: (
        <>
          <Judul judul="Kamu siap" isi="Tiga langkah ini menunggumu di Beranda." />
          <ol className="mt-5 space-y-2">
            {(
              [
                ['simulator', 'Urutkan prioritasmu'],
                ['panah-atas', 'Dukung 3 usulan'],
                ['lokasi', 'Buat usulanmu'],
              ] as const
            ).map(([ikon, label], index) => (
              <li
                key={label}
                className="tt-muncul flex items-center gap-3 rounded-xl border-[1.5px] border-border p-3 text-[15px] font-semibold"
                style={{ animationDelay: `${120 + index * 110}ms` }}
              >
                <span className="grid size-[34px] flex-none place-items-center rounded-full border-2 border-ink">
                  <Icon name={ikon} />
                </span>
                <span className="flex-1">{label}</span>
                <span className="grid size-7 place-items-center rounded-full border-[1.5px] border-dashed border-mati text-sm">
                  {index + 1}
                </span>
              </li>
            ))}
          </ol>
        </>
      ),
    },
  ];

  const sekarang = isi[langkah] as (typeof isi)[number];

  return (
    <Modal
      open
      onClose={() => onSelesai()}
      labelledBy="judul-tutorial"
      className="m-0 h-dvh max-h-dvh w-screen max-w-none overflow-hidden rounded-none border-0 bg-surface"
    >
      <div className="flex h-dvh flex-col">
        <header className="flex flex-none items-center gap-3 border-b border-rule px-4 py-3 sm:px-6">
          <img
            src={logo}
            alt="Musrenbang Digital"
            draggable={false}
            className="hidden h-7 w-auto flex-none sm:block"
          />
          <Stepper langkah={langkah} />
          <p className="sr-only">
            Langkah {langkah + 1} dari {TAHAP.length}
          </p>
          <button
            type="button"
            onClick={() => onSelesai()}
            className="flex-none rounded-lg px-1 py-1 text-[13px] text-muted hover:text-ink"
          >
            Lewati
          </button>
        </header>

        {/* Kunci per langkah: setiap pindah, animasi langkah baru diputar dari awal. */}
        <div key={langkah} className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="flex flex-none items-center justify-center bg-ground px-4 py-5 lg:flex-1 lg:py-10">
            {sekarang.gambar}
          </div>
          <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-5 py-6 sm:px-8 lg:max-w-[46%] lg:px-12">
            {sekarang.teks}
          </div>
        </div>

        <footer className="flex flex-none items-center justify-between gap-3 border-t border-rule px-4 py-3 sm:px-6">
          <Button
            variant="ghost"
            onClick={() => setLangkah(langkah - 1)}
            className={cn(langkah === 0 && 'invisible')}
          >
            Kembali
          </Button>
          <Button onClick={lanjut}>
            {terakhir ? 'Mulai urutkan prioritas' : langkah === 2 ? 'Lihat hasilnya' : 'Lanjut'}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
