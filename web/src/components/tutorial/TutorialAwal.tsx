import logo from '@/assets/logo/mb-lockup-horizontal-warna.svg';
import { useState, type ReactNode } from 'react';
import { Toa } from '@/components/brand/Toa';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { DemoDukung, DemoPantau, DemoUrutkan, DemoUsulan } from './DemoTutorial';
import { JalurMusrenbang, KotaSiap } from './IlustrasiTutorial';

const TAHAP = ['Kenalan', 'Alur', 'Urutkan', 'Dukung', 'Usulkan', 'Pantau', 'Siap'] as const;

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

/** Pita kecil di atas judul langkah demo: demonya tidak menyimpan apa pun. */
function PitaDemo() {
  return (
    <span className="tt-muncul mb-3 self-start rounded-full bg-ground px-2.5 py-0.5 text-xs text-muted">
      Demo, tidak ada yang disimpan
    </span>
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
                  'h-0.5 w-2.5 rounded-full transition-colors duration-300 sm:w-5',
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
 * Tutorial satu layar penuh yang muncul sekali sesudah pertama kali masuk. Dua langkah pertama
 * adalah perkenalan bergambar, lima langkah sesudahnya adalah demo bergerak yang meniru fitur asli
 * (urutkan prioritas, dukung, tulis usulan, pantau status). Demo berjalan sendiri dengan kursor,
 * tetapi warga bisa mengkliknya kapan saja. "Lewati" dan Escape menutup dan menandainya selesai.
 */
export function TutorialAwal({ onSelesai }: { onSelesai: (tujuan?: string) => void }) {
  const [langkah, setLangkah] = useState(0);
  // Naik tiap "Putar ulang demo"; dipakai sebagai key supaya demo dimulai dari awal.
  const [putaran, setPutaran] = useState(0);
  const ulang = () => setPutaran((n) => n + 1);
  const terakhir = langkah === TAHAP.length - 1;

  const pindah = (ke: number) => {
    setPutaran(0);
    setLangkah(ke);
  };

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
      gambar: <DemoUrutkan key={putaran} onUlang={ulang} />,
      teks: (
        <>
          <PitaDemo />
          <Judul
            judul="Urutkan bidang yang paling penting"
            isi="Ketuk nomor di bawah tiap bidang. Nomor yang sudah dipakai akan saling bertukar. Ikuti demonya, atau coba sendiri kapan saja."
          />
        </>
      ),
    },
    {
      gambar: <DemoDukung key={putaran} onUlang={ulang} />,
      teks: (
        <>
          <PitaDemo />
          <Judul
            judul="Dukung usulan warga"
            isi="Ketuk panah di kartu usulan. Makin banyak dukungan, makin besar peluangnya dibahas di rapat."
          />
        </>
      ),
    },
    {
      gambar: <DemoUsulan key={putaran} onUlang={ulang} />,
      teks: (
        <>
          <PitaDemo />
          <Judul
            judul="Tulis usulanmu sendiri"
            isi="Isi judul, pilih bidang, tandai lokasi di peta, lalu kirim. Admin memeriksanya dulu."
          />
        </>
      ),
    },
    {
      gambar: <DemoPantau key={putaran} onUlang={ulang} />,
      teks: (
        <>
          <PitaDemo />
          <Judul
            judul="Pantau sampai selesai"
            isi="Setiap perubahan status usulanmu muncul sebagai pemberitahuan."
          />
        </>
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

        {/* Kunci per langkah: setiap pindah, animasi langkah baru diputar dari awal. Di HP isinya
            boleh digulir karena demo cukup tinggi. */}
        <div
          key={langkah}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-visible"
        >
          <div className="flex flex-none items-center justify-center bg-ground px-4 py-5 lg:flex-1 lg:overflow-y-auto lg:py-8">
            {sekarang.gambar}
          </div>
          <div className="flex flex-none flex-col justify-center px-5 py-6 sm:px-8 lg:max-w-[46%] lg:flex-1 lg:overflow-y-auto lg:px-12">
            {sekarang.teks}
          </div>
        </div>

        <footer className="flex flex-none items-center justify-between gap-3 border-t border-rule px-4 py-3 sm:px-6">
          <Button
            variant="ghost"
            onClick={() => pindah(langkah - 1)}
            className={cn(langkah === 0 && 'invisible')}
          >
            Kembali
          </Button>
          <Button onClick={() => (terakhir ? onSelesai('/simulator') : pindah(langkah + 1))}>
            {terakhir ? 'Mulai urutkan prioritas' : 'Lanjut'}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
