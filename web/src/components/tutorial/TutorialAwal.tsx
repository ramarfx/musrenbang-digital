import { useEffect, useState, type ReactNode } from 'react';
import { Toa } from '@/components/brand/Toa';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { JalurMusrenbang, KartuDukung, LerengUrutan } from './IlustrasiTutorial';

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
const APBD_CONTOH: Record<string, number> = {
  Jalan: 1,
  Pendidikan: 2,
  Kesehatan: 3,
  Lingkungan: 4,
};
const JUMLAH_LANGKAH = 6;

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

function Ilustrasi({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 flex h-[220px] items-center justify-center overflow-hidden rounded-2xl bg-ground px-3">
      {children}
    </div>
  );
}

function Judul({ judul, isi }: { judul: string; isi: string }) {
  return (
    <div className="tt-muncul">
      <h2 id="judul-tutorial" className="text-[19px] leading-snug font-bold tracking-[-0.01em]">
        {judul}
      </h2>
      <p className="mt-1 text-muted">{isi}</p>
    </div>
  );
}

/**
 * Tutorial yang muncul sekali sesudah pertama kali masuk: enam langkah bergambar dengan sedikit
 * teks, termasuk latihan mengurutkan prioritas yang langsung dibandingkan dengan APBD contoh.
 * Escape, klik di luar, dan "Lewati" sama-sama menutupnya dan menandainya selesai.
 */
export function TutorialAwal({ onSelesai }: { onSelesai: (tujuan?: string) => void }) {
  const [langkah, setLangkah] = useState(0);
  const [urut, setUrut] = useState<string[]>([]);
  const [galat, setGalat] = useState('');
  const [dukungan, setDukungan] = useState(23);
  const terakhir = langkah === JUMLAH_LANGKAH - 1;

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

  const isi = [
    <>
      <Ilustrasi>
        <Toa className="max-w-[250px]" />
      </Ilustrasi>
      <Judul
        judul="Suaramu ikut menentukan anggaran kota"
        isi="Usulan warga dibawa ke rapat resmi sebelum anggaran dibagi."
      />
    </>,
    <>
      <Ilustrasi>
        <JalurMusrenbang />
      </Ilustrasi>
      <Judul
        judul="Musrenbang, rapat usulan tiap tahun"
        isi="Usulanmu naik bertahap sampai masuk APBD."
      />
    </>,
    <>
      <span className="tt-muncul mb-2 inline-block rounded-full bg-ground px-2.5 py-0.5 text-xs text-muted">
        Latihan, tidak disimpan
      </span>
      <Judul
        judul="Mana yang paling penting buatmu?"
        isi="Ketuk satu per satu. Yang kamu ketuk pertama jadi nomor 1."
      />
      <div className="mt-4 grid grid-cols-2 gap-2">
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
                dipilih ? 'border-ink bg-mint-pucat' : 'border-border bg-surface hover:bg-active',
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
      <div className="mt-2 flex min-h-6 items-center justify-between gap-3">
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
    </>,
    <>
      <Ilustrasi>
        <LerengUrutan baris={baris} sorot={sorotan?.nama ?? ''} />
      </Ilustrasi>
      <Judul judul="Ini bedanya dengan APBD" isi={temuan} />
    </>,
    <>
      <Ilustrasi>
        <KartuDukung jumlah={dukungan} />
      </Ilustrasi>
      <Judul
        judul="Dukung usulan tetanggamu"
        isi="Makin banyak dukungan, makin didengar di rapat."
      />
    </>,
    <>
      <Judul judul="Kamu siap" isi="Tiga langkah ini menunggumu di Beranda." />
      <ol className="mt-4 space-y-2">
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
            style={{ animationDelay: `${80 + index * 80}ms` }}
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
    </>,
  ];

  return (
    <Modal
      open
      onClose={() => onSelesai()}
      labelledBy="judul-tutorial"
      className="w-[min(480px,calc(100vw-24px))] bg-surface max-sm:h-dvh max-sm:max-h-dvh max-sm:w-screen max-sm:max-w-none max-sm:rounded-none max-sm:border-0"
    >
      <div className="flex min-h-full flex-col p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="grid flex-1 grid-cols-6 gap-1" aria-hidden="true">
            {Array.from({ length: JUMLAH_LANGKAH }, (_, index) => (
              <span
                key={index}
                className={cn(
                  'h-1 rounded-full transition-colors duration-200',
                  index <= langkah ? 'bg-ink' : 'bg-track',
                )}
              />
            ))}
          </div>
          <p className="sr-only">
            Langkah {langkah + 1} dari {JUMLAH_LANGKAH}
          </p>
          <button
            type="button"
            onClick={() => onSelesai()}
            className="rounded-lg px-1 py-1 text-[13px] text-muted hover:text-ink"
          >
            Lewati
          </button>
        </div>

        {/* Kunci per langkah: setiap pindah, animasi langkah baru diputar dari awal. */}
        <div key={langkah} className="mt-4 flex-1">
          {isi[langkah]}
        </div>

        <div className="mt-6 flex items-center justify-between">
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
        </div>
      </div>
    </Modal>
  );
}
