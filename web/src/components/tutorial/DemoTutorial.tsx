import { PROPOSAL_STATUSES } from '@musrenbang/shared';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { RuasTahap } from '@/components/layout/NotificationBell';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { getCategoryInfo } from '@/features/categories/info';
import { TahapMini } from '@/features/proposals/components/ProposalCard';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';
import { IKON_TAHAP } from '@/features/proposals/components/StatusTimeline';
import { cn } from '@/lib/cn';
import { formatRupiahRingkas, formatTanggal } from '@/lib/format';

/*
 * Demo bergerak yang meniru fitur asli (Prioritasku, kartu usulan, form usulan, status usulan).
 * Tiap demo berjalan sendiri dengan kursor yang mengklik, tetapi semua yang ada di dalamnya
 * bisa diklik warga: begitu warga menyentuh panggung, demo otomatis berhenti dan warga
 * meneruskannya sendiri. Tidak ada yang disimpan atau dikirim ke server.
 */

type Titik = { x: number; y: number };

type Pemandu = {
  tunggu: (ms: number) => Promise<void>;
  caption: (teks: string) => void;
  /** Gerakkan kursor ke elemen, tunggu sebentar, lalu klik dan jalankan `aksi`. */
  klik: (selektor: string, aksi?: () => void, titik?: Titik) => Promise<void>;
  selesai: () => void;
};

type Skrip = (pemandu: Pemandu) => Promise<void>;

function useDemoOtomatis(skrip: Skrip) {
  const stageRef = useRef<HTMLDivElement>(null);
  const token = useRef(0);
  const skripRef = useRef(skrip);
  const [kursor, setKursor] = useState({ x: 360, y: 12, tampil: false, klik: 0 });
  const [teks, setTeks] = useState('');
  const [jalan, setJalan] = useState(true);

  useEffect(() => {
    skripRef.current = skrip;
  });

  useEffect(() => {
    const saya = ++token.current;
    const batal = () => saya !== token.current;
    const kurangiGerak = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tunggu = (ms: number) =>
      new Promise<void>((ok, gagal) =>
        setTimeout(() => (batal() ? gagal(new Error('batal')) : ok()), kurangiGerak ? 0 : ms),
      );
    const gerak = (selektor: string, titik?: Titik) => {
      const area = stageRef.current;
      const el = area?.querySelector(selektor);
      if (!area || !el) return;
      const r = el.getBoundingClientRect();
      const s = area.getBoundingClientRect();
      setKursor((k) => ({
        ...k,
        x: r.left - s.left + r.width * (titik?.x ?? 0.5) - 3,
        y: r.top - s.top + r.height * (titik?.y ?? 0.5) - 2,
        tampil: !kurangiGerak,
      }));
    };
    const pemandu: Pemandu = {
      tunggu,
      caption: (t) => {
        if (!batal()) setTeks(t);
      },
      klik: async (selektor, aksi, titik) => {
        gerak(selektor, titik);
        await tunggu(850);
        setKursor((k) => ({ ...k, klik: k.klik + 1 }));
        await tunggu(120);
        aksi?.();
        await tunggu(300);
      },
      selesai: () => {
        if (batal()) return;
        setTeks('Sekarang giliranmu, coba sendiri');
        setKursor((k) => ({ ...k, tampil: false }));
        setJalan(false);
      },
    };
    skripRef.current(pemandu).catch(() => {});
    return () => {
      token.current++;
    };
  }, []);

  const hentikan = useCallback(() => {
    token.current++;
    setJalan(false);
    setKursor((k) => ({ ...k, tampil: false }));
    setTeks('Sekarang giliranmu, coba sendiri');
  }, []);

  return { stageRef, kursor, teks, jalan, hentikan };
}

type Demo = ReturnType<typeof useDemoOtomatis>;

function Panggung({
  demo,
  onUlang,
  children,
}: {
  demo: Demo;
  onUlang: () => void;
  children: ReactNode;
}) {
  const { kursor } = demo;
  return (
    <div className="flex w-full max-w-[460px] flex-col items-center gap-3">
      <div
        ref={demo.stageRef}
        onPointerDownCapture={() => {
          if (demo.jalan) demo.hentikan();
        }}
        className="relative w-full"
      >
        {children}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-20 transition-[transform,opacity] duration-[780ms] ease-[cubic-bezier(0.45,0.05,0.25,1)]"
          style={{
            transform: `translate(${kursor.x}px, ${kursor.y}px)`,
            opacity: kursor.tampil ? 1 : 0,
          }}
        >
          {kursor.klik > 0 && (
            <span
              key={kursor.klik}
              className="tt-klik absolute -top-2.5 -left-2.5 size-7 rounded-full border-2 border-ink"
            />
          )}
          <svg
            viewBox="0 0 24 24"
            width={24}
            height={24}
            className="relative drop-shadow-[0_1px_1px_rgb(0_0_0/0.35)]"
          >
            <path
              d="M3 2l15 7-6.5 2L9 18z"
              fill="var(--surface)"
              stroke="var(--ink)"
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      <p
        aria-live="polite"
        className={cn(
          'inline-flex min-h-[34px] items-center rounded-full bg-ink px-3.5 py-1.5 text-center text-[13px] font-semibold text-on-ink transition-opacity duration-200',
          !demo.teks && 'opacity-0',
        )}
      >
        {demo.teks || '.'}
      </p>
      <button
        type="button"
        onClick={onUlang}
        className="text-[13px] text-muted underline hover:text-ink"
      >
        Putar ulang demo
      </button>
    </div>
  );
}

const kartuClass = 'rounded-3xl border border-border bg-surface p-5';

/** Kartu bercap seperti kartu usulan asli; `kartu-tampak` menyalakan animasi tahapnya. */
const kartuUsulanClass =
  'kartu-usulan kartu-tampak rounded-3xl border-[1.5px] border-edge bg-surface p-4 shadow-[0_4px_0_var(--edge)] sm:p-5';

/* ---------- 1. Urutkan prioritas ---------- */

const PROGRAM = ['Kesehatan', 'Pendidikan', 'Infrastruktur dan Jalan'] as const;
const NOMOR = [1, 2, 3] as const;

/** Aturan asli simulator: nomor yang sudah dipakai bidang lain ditukar, menekan nomor sendiri melepasnya. */
function pilihNomor(lama: Record<string, number>, nama: string, nomor: number) {
  const baru = { ...lama };
  if (lama[nama] === nomor) {
    baru[nama] = 0;
    return baru;
  }
  const pemegang = PROGRAM.find((lain) => lain !== nama && lama[lain] === nomor);
  if (pemegang) baru[pemegang] = lama[nama] ?? 0;
  baru[nama] = nomor;
  return baru;
}

export function DemoUrutkan({ onUlang }: { onUlang: () => void }) {
  const [urut, setUrut] = useState<Record<string, number>>({});
  const demo = useDemoOtomatis(async (p) => {
    const pilih = (nama: string, nomor: number) => () =>
      setUrut((lama) => pilihNomor(lama, nama, nomor));
    await p.tunggu(500);
    p.caption('1. Ketuk nomor 1 untuk yang paling penting');
    await p.klik('[data-nomor="Kesehatan-1"]', pilih('Kesehatan', 1));
    p.caption('2. Lanjut ke bidang berikutnya');
    await p.klik('[data-nomor="Pendidikan-2"]', pilih('Pendidikan', 2));
    await p.klik('[data-nomor="Infrastruktur dan Jalan-3"]', pilih('Infrastruktur dan Jalan', 3));
    await p.tunggu(500);
    p.caption('3. Nomor sudah dipakai? Dua bidang saling bertukar');
    await p.klik('[data-nomor="Infrastruktur dan Jalan-1"]', pilih('Infrastruktur dan Jalan', 1));
    await p.tunggu(900);
    p.selesai();
  });

  const terisi = PROGRAM.filter((nama) => (urut[nama] ?? 0) > 0).length;
  const poin = (nama: string) => (urut[nama] ? PROGRAM.length + 1 - (urut[nama] ?? 0) : 0);
  const totalPoin = PROGRAM.reduce((jumlah, nama) => jumlah + poin(nama), 0);

  return (
    <Panggung demo={demo} onUlang={onUlang}>
      <div>
        <p className="mb-3 text-sm text-muted">
          <span className="font-semibold text-ink">
            {terisi === PROGRAM.length
              ? 'Lengkap.'
              : `Sudah diurutkan ${terisi} dari ${PROGRAM.length}.`}
          </span>{' '}
          Contoh dengan tiga bidang.
        </p>
        <div role="group" aria-label="Urutan prioritas per bidang" className="space-y-2.5">
          {PROGRAM.map((nama) => {
            const nomor = urut[nama] ?? 0;
            const labelId = `demo-urutan-${nama}`;
            const persen = totalPoin > 0 ? Math.round((poin(nama) / totalPoin) * 100) : 0;
            return (
              <div
                key={nama}
                className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 rounded-2xl border-[1.5px] border-edge bg-surface p-3.5 shadow-[0_3px_0_var(--edge)]"
              >
                <CategoryTile kategori={nama} />
                <span id={labelId} className="min-w-0 font-semibold">
                  <span
                    className="tanda-kategori"
                    style={{ '--tanda': getCategoryInfo(nama).warna.latar } as CSSProperties}
                  >
                    {nama}
                  </span>
                  <span className="block text-[13px] font-normal text-muted">
                    {getCategoryInfo(nama).deskripsi}
                  </span>
                </span>
                <span className="text-right text-[13px] whitespace-nowrap text-muted">
                  {nomor ? (
                    <>
                      <b className="text-[15px] text-ink">Nomor {nomor}</b>
                      <span className="block">{persen}% bobot</span>
                    </>
                  ) : (
                    'Belum bernomor'
                  )}
                </span>
                <div
                  role="radiogroup"
                  aria-labelledby={labelId}
                  className="col-span-full flex flex-wrap gap-1.5 sm:pl-14"
                >
                  {NOMOR.map((angka) => {
                    const aktif = nomor === angka;
                    const pemegang = PROGRAM.find((lain) => lain !== nama && urut[lain] === angka);
                    return (
                      <button
                        key={angka}
                        type="button"
                        role="radio"
                        aria-checked={aktif}
                        data-nomor={`${nama}-${angka}`}
                        onClick={() => setUrut((lama) => pilihNomor(lama, nama, angka))}
                        className={cn(
                          'grid size-9 place-items-center rounded-lg border text-[13px] font-semibold tabular-nums transition-[scale,background-color,border-color,color] duration-150 ease-out active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
                          aktif && 'border-hijau bg-hijau text-white',
                          !aktif &&
                            !pemegang &&
                            'border-border bg-surface text-ink hover:bg-active',
                          !aktif && pemegang && 'border-rule bg-ground text-muted hover:bg-active',
                        )}
                      >
                        {angka}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panggung>
  );
}

/* ---------- 2. Dukung usulan ---------- */

/** Baris status kartu: ikon tahap, "Tahap n dari 5", garis tegak, lalu kalimat penjelasnya. */
function BarisStatus({ tahap, kalimat }: { tahap: number; kalimat: string }) {
  const nama = PROPOSAL_STATUSES[tahap] ?? PROPOSAL_STATUSES[0];
  const selesai = tahap === PROPOSAL_STATUSES.length - 1;
  return (
    <div className="flex h-6 min-w-0 items-center gap-2">
      <span className="kartu-label inline-flex flex-none items-center gap-1.5 text-[13px] font-bold text-warga">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-4"
        >
          <path d={IKON_TAHAP[nama]} />
        </svg>
        {selesai ? 'Selesai' : `Tahap ${tahap + 1} dari ${PROPOSAL_STATUSES.length}`}
      </span>
      <span aria-hidden="true" className="h-3.5 w-px flex-none bg-border" />
      <span className="truncate text-[12.5px] text-muted">{kalimat}</span>
    </div>
  );
}

export function DemoDukung({ onUlang }: { onUlang: () => void }) {
  const [sudah, setSudah] = useState(false);
  const [gelombang, setGelombang] = useState(0);
  const dukung = useCallback((nilai: boolean) => {
    setSudah(nilai);
    if (nilai) setGelombang((n) => n + 1);
  }, []);
  const demo = useDemoOtomatis(async (p) => {
    await p.tunggu(500);
    p.caption('1. Ketuk panah untuk mendukung');
    await p.klik('[data-dukung]', () => dukung(true));
    await p.tunggu(900);
    p.caption('2. Ketuk lagi untuk membatalkan');
    await p.klik('[data-dukung]', () => dukung(false));
    await p.tunggu(700);
    p.caption('3. Satu akun, satu dukungan');
    await p.klik('[data-dukung]', () => dukung(true));
    await p.tunggu(600);
    p.selesai();
  });

  return (
    <Panggung demo={demo} onUlang={onUlang}>
      <article className={kartuUsulanClass}>
        <div className="flex items-center gap-3">
          <CategoryTile kategori="Infrastruktur dan Jalan" />
          <div className="min-w-0">
            <h3 className="leading-snug font-bold text-ink sm:text-[17px]">
              Lampu jalan Gang Mawar mati
            </h3>
            <p className="text-[13px] text-muted">Infrastruktur dan Jalan</p>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-ink/80">
          Sudah dua minggu lampu di sepanjang gang padam, warga takut lewat malam hari.
        </p>
        <div className="mt-3.5">
          <BarisStatus tahap={0} kalimat="Sudah tampil untuk umum dan bisa didukung warga." />
        </div>
        <div className="mt-3">
          <TahapMini tahap={0} />
        </div>
        <dl className="mt-3.5 grid grid-cols-2 gap-3 border-t border-rule pt-3 text-sm">
          <div>
            <dt className="text-[12.5px] text-muted">Estimasi</dt>
            <dd className="font-semibold">{formatRupiahRingkas(45_000_000)}</dd>
          </div>
          <div className="text-right">
            <dt className="text-[12.5px] text-muted">Diajukan</dt>
            <dd className="font-semibold">{formatTanggal(new Date().toISOString())}</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-dukung
            onClick={() => dukung(!sudah)}
            aria-pressed={sudah}
            aria-label={sudah ? 'Batalkan upvote' : 'Upvote usulan ini'}
            className={cn(
              'relative inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition-[scale,background-color,border-color,color] duration-150 ease-out active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
              sudah
                ? 'border-edge bg-hijau-terang text-hitam'
                : 'border-border bg-surface text-ink hover:bg-active',
            )}
          >
            {gelombang > 0 && sudah && (
              <span
                key={`gelombang-${gelombang}`}
                aria-hidden="true"
                className="upvote-gelombang pointer-events-none absolute inset-0 rounded-xl border-2 border-current"
              />
            )}
            <span
              key={`panah-${gelombang}`}
              className={gelombang > 0 && sudah ? 'upvote-naik' : undefined}
            >
              <Icon name="panah-atas" size={16} filled={sudah} />
            </span>
            <span className="tabular-nums">{sudah ? 24 : 23}</span>
          </button>
          <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-[13px] font-semibold text-ink">
            <Icon name="usulan" size={16} />
            Komentar
          </span>
          <span className="ml-auto text-[12.5px] text-muted">oleh Rina</span>
        </div>
      </article>
    </Panggung>
  );
}

/* ---------- 3. Tulis usulan ---------- */

const JUDUL_CONTOH = 'Lampu jalan Gang Mawar mati';
const PIN_CONTOH: Titik = { x: 0.62, y: 0.58 };

export function DemoUsulan({ onUlang }: { onUlang: () => void }) {
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState('');
  const [pin, setPin] = useState<Titik | null>(null);
  const [terkirim, setTerkirim] = useState(false);
  const demo = useDemoOtomatis(async (p) => {
    await p.tunggu(400);
    p.caption('1. Tulis judul yang singkat dan jelas');
    await p.klik('[data-judul]');
    for (let i = 1; i <= JUDUL_CONTOH.length; i++) {
      setJudul(JUDUL_CONTOH.slice(0, i));
      await p.tunggu(45);
    }
    await p.tunggu(400);
    p.caption('2. Pilih bidang yang cocok');
    await p.klik('[data-kategori]', () => setKategori('Infrastruktur dan Jalan'));
    await p.tunggu(400);
    p.caption('3. Ketuk peta untuk menandai lokasi');
    await p.klik('[data-peta]', () => setPin(PIN_CONTOH), PIN_CONTOH);
    await p.tunggu(600);
    p.caption('4. Salah titik? Tekan Hapus tanda');
    await p.klik('[data-hapus]', () => setPin(null));
    await p.tunggu(400);
    p.caption('5. Ketuk lagi di tempat yang benar');
    await p.klik('[data-peta]', () => setPin(PIN_CONTOH), PIN_CONTOH);
    await p.tunggu(500);
    p.caption('6. Kirim, admin akan memeriksanya dulu');
    await p.klik('[data-kirim]', () => setTerkirim(true));
    await p.tunggu(700);
    p.selesai();
  });

  const tandaiPeta = (event: MouseEvent<HTMLDivElement>) => {
    const r = event.currentTarget.getBoundingClientRect();
    setPin({ x: (event.clientX - r.left) / r.width, y: (event.clientY - r.top) / r.height });
  };

  return (
    <Panggung demo={demo} onUlang={onUlang}>
      <div className={cn(kartuClass, 'space-y-3.5')}>
        <Field label="Judul usulan" htmlFor="demo-judul">
          <Input
            id="demo-judul"
            data-judul
            value={judul}
            onChange={(event) => setJudul(event.target.value)}
            placeholder="cth. Pembangunan trotoar Jl. Melati"
          />
        </Field>
        <Field label="Kategori" htmlFor="demo-kategori">
          <Select
            id="demo-kategori"
            data-kategori
            value={kategori}
            onChange={(event) => setKategori(event.target.value)}
          >
            <option value="">Pilih kategori</option>
            <option>Kesehatan</option>
            <option>Pendidikan</option>
            <option>Infrastruktur dan Jalan</option>
          </Select>
        </Field>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-stone-800">Lokasi di peta</p>
          <div
            data-peta
            onClick={tandaiPeta}
            role="presentation"
            className="relative h-28 cursor-crosshair overflow-hidden rounded-xl border border-border bg-active"
          >
            <span className="absolute inset-y-0 left-0 w-[30%] bg-[#cfe6c4]" />
            <span className="absolute top-0 right-0 h-9 w-[28%] bg-[#b7d7ee]" />
            <span className="absolute inset-x-0 top-[44px] h-2.5 bg-[#f6d98b]" />
            <span className="absolute inset-y-0 left-[36%] w-2 bg-surface" />
            <span className="absolute inset-x-0 top-[88px] h-1 bg-surface" />
            {pin && (
              <button
                type="button"
                data-hapus
                onClick={(event) => {
                  event.stopPropagation();
                  setPin(null);
                }}
                className="absolute bottom-2 left-2 z-10 inline-flex h-8 items-center gap-1 rounded-lg border-[1.5px] border-edge bg-surface px-2.5 text-[12px] font-bold text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
              >
                <Icon name="sampah" size={14} />
                Hapus tanda
              </button>
            )}
            {pin && (
              <svg
                aria-hidden="true"
                viewBox="0 0 34 44"
                width={30}
                height={39}
                className="tt-jatuh absolute -translate-x-1/2 -translate-y-full drop-shadow"
                style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
              >
                <path
                  d="M17 43C17 43 2 28 2 16a15 15 0 0 1 30 0c0 12-15 27-15 27z"
                  fill="#14222B"
                />
                <g
                  transform="translate(10.4 9.4) scale(0.6)"
                  fill="none"
                  stroke="#4FC79C"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={getCategoryInfo(kategori).ikon} />
                </g>
              </svg>
            )}
          </div>
        </div>
        <Button data-kirim type="button" className="w-full" onClick={() => setTerkirim(true)}>
          Kirim Usulan
        </Button>
        <p
          role="status"
          className={cn(
            'rounded-xl bg-mint-pucat px-3.5 py-2.5 text-[13px] font-semibold text-mint-tua transition-[opacity,translate] duration-200',
            terkirim ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0',
          )}
        >
          Usulan terkirim. Menunggu persetujuan admin.
        </p>
      </div>
    </Panggung>
  );
}

/* ---------- 4. Pantau status ---------- */

const KALIMAT_TAHAP = [
  'Sudah tampil untuk umum dan bisa didukung warga.',
  'Admin sudah memeriksa dan menyatakan usulan layak.',
  'Masuk daftar program anggaran daerah.',
  'Program sedang dikerjakan di lapangan.',
  'Program selesai dilaksanakan.',
];

export function DemoPantau({ onUlang }: { onUlang: () => void }) {
  const [tahap, setTahap] = useState(0);
  const [pesan, setPesan] = useState(0);
  const ubah = useCallback((n: number) => {
    setTahap(n);
    setPesan((m) => m + 1);
  }, []);
  const demo = useDemoOtomatis(async (p) => {
    await p.tunggu(600);
    p.caption('Usulanmu baru dikirim: Diajukan');
    await p.tunggu(1400);
    for (let n = 1; n < PROPOSAL_STATUSES.length; n++) {
      ubah(n);
      p.caption(
        n === PROPOSAL_STATUSES.length - 1
          ? 'Selesai: lampu sudah menyala'
          : `Admin mengubah status: ${PROPOSAL_STATUSES[n]}`,
      );
      await p.tunggu(1400);
    }
    p.selesai();
  });
  const status = PROPOSAL_STATUSES[tahap] ?? PROPOSAL_STATUSES[0];
  const sebelumnya =
    PROPOSAL_STATUSES[(tahap + PROPOSAL_STATUSES.length - 1) % PROPOSAL_STATUSES.length];

  return (
    <Panggung demo={demo} onUlang={onUlang}>
      <div className={kartuUsulanClass}>
        <div className="flex items-center gap-3">
          <CategoryTile kategori="Infrastruktur dan Jalan" />
          <div className="min-w-0">
            <h3 className="leading-snug font-bold text-ink sm:text-[17px]">
              Lampu jalan Gang Mawar mati
            </h3>
            <p className="text-[13px] text-muted">Usulanmu</p>
          </div>
        </div>
        <div className="mt-3.5">
          <BarisStatus tahap={tahap} kalimat={KALIMAT_TAHAP[tahap] ?? ''} />
        </div>
        <div className="mt-3">
          <TahapMini tahap={tahap} />
        </div>
        {pesan > 0 && (
          <div
            key={pesan}
            role="status"
            className="tt-muncul mt-4 rounded-[14px] border-[1.5px] border-edge bg-ground px-3.5 py-3"
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <Icon name="lonceng" size={15} />
              <span className="truncate">Lampu jalan Gang Mawar mati</span>
              <span className="flex-none rounded-md bg-ink px-1.5 py-px text-[11px] font-bold text-on-ink">
                Baru
              </span>
            </span>
            <span className="mt-1.5 block text-[13px]">
              <StatusBadge status={status} />{' '}
              <span className="text-[12px] text-muted">· baru saja</span>
            </span>
            <span className="mt-1.5 block text-[12px] text-muted">Sebelumnya: {sebelumnya}</span>
            <RuasTahap status={status} />
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => ubah((tahap + 1) % PROPOSAL_STATUSES.length)}
        >
          {tahap === PROPOSAL_STATUSES.length - 1
            ? 'Ulangi dari Diajukan'
            : 'Contoh tahap berikutnya'}
        </Button>
      </div>
    </Panggung>
  );
}

/* ---------- 5. Tanya MusrenAI ---------- */

const PERTANYAAN_CONTOH = 'Bagaimana cara mengajukan usulan?';
const JAWABAN_CONTOH =
  'Buka Usulan warga lalu pilih Buat usulan. Isi judul, bidang, dan lokasi di peta. Admin memeriksanya dulu sebelum tampil.';

export function DemoAsisten({ onUlang }: { onUlang: () => void }) {
  const [buka, setBuka] = useState(false);
  const [tulis, setTulis] = useState('');
  const [terkirim, setTerkirim] = useState(false);
  const [jawab, setJawab] = useState(false);
  const demo = useDemoOtomatis(async (p) => {
    await p.tunggu(500);
    p.caption('1. Tekan tombol hijau di pojok kanan bawah');
    await p.klik('[data-asisten]', () => setBuka(true));
    await p.tunggu(500);
    p.caption('2. Tulis pertanyaanmu');
    await p.klik('[data-asisten-isi]');
    for (let i = 1; i <= PERTANYAAN_CONTOH.length; i++) {
      setTulis(PERTANYAAN_CONTOH.slice(0, i));
      await p.tunggu(35);
    }
    await p.tunggu(300);
    p.caption('3. Kirim, lalu tunggu jawabannya');
    await p.klik('[data-asisten-kirim]', () => {
      setTerkirim(true);
      setTulis('');
    });
    await p.tunggu(1000);
    setJawab(true);
    await p.tunggu(900);
    p.selesai();
  });

  const kirim = () => {
    if (!tulis.trim()) return;
    setTerkirim(true);
    setTulis('');
    window.setTimeout(() => setJawab(true), 700);
  };

  return (
    <Panggung demo={demo} onUlang={onUlang}>
      <div className="relative h-[360px] overflow-hidden rounded-3xl border border-border bg-ground">
        <span className="absolute top-5 left-5 h-3 w-32 rounded-full bg-track" />
        <span className="absolute top-10 left-5 h-3 w-48 rounded-full bg-track" />
        <span className="absolute top-20 left-5 h-16 w-[70%] rounded-2xl bg-track/60" />

        {buka && (
          <div className="tt-pop absolute right-3 bottom-[60px] left-3 flex h-[250px] flex-col overflow-hidden rounded-2xl border-[1.5px] border-edge bg-ground shadow-[0_4px_0_var(--edge)]">
            <div className="flex items-center gap-2.5 bg-ink px-3 py-2 text-on-ink">
              <span className="grid size-7 place-items-center rounded-lg bg-hijau-terang text-hitam">
                <Icon name="usulan" size={15} />
              </span>
              <span className="leading-tight">
                <b className="block text-[13px]">MusrenAI</b>
                <span className="text-[11px] text-on-ink/75">Asisten warga</span>
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2.5 text-[12.5px]">
              {!terkirim && !jawab && (
                <p className="text-muted">
                  Tanyakan cara memakai website, atau ceritakan masalah di sekitarmu.
                </p>
              )}
              {terkirim && (
                <p className="tt-muncul ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-ink px-3 py-1.5 text-on-ink">
                  {PERTANYAAN_CONTOH}
                </p>
              )}
              {terkirim && !jawab && (
                <span className="inline-flex rounded-xl rounded-bl-sm border-[1.5px] border-edge bg-surface px-3 py-2">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <i
                        key={i}
                        className="load-dot block size-1.5 rounded-full bg-hijau-terang"
                        style={{ animationDelay: `${i * 160}ms` }}
                      />
                    ))}
                  </span>
                </span>
              )}
              {jawab && (
                <p className="tt-muncul w-fit max-w-[90%] rounded-xl rounded-bl-sm border-[1.5px] border-edge bg-surface px-3 py-1.5">
                  {JAWABAN_CONTOH}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 border-t-[1.5px] border-edge bg-surface p-2">
              <input
                data-asisten-isi
                value={tulis}
                onChange={(event) => setTulis(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') kirim();
                }}
                placeholder="Tulis pertanyaanmu…"
                aria-label="Pertanyaan untuk MusrenAI (demo)"
                className="h-9 min-w-0 flex-1 rounded-lg border-[1.5px] border-edge bg-ground px-2.5 text-[12.5px]"
              />
              <button
                type="button"
                data-asisten-kirim
                onClick={kirim}
                aria-label="Kirim pesan (demo)"
                className="grid size-9 flex-none place-items-center rounded-lg bg-ink text-on-ink active:scale-[0.94]"
              >
                <Icon name="panah-atas" size={16} />
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          data-asisten
          onClick={() => setBuka((nilai) => !nilai)}
          className="kartu-cap absolute right-3 bottom-3 inline-flex h-11 items-center gap-2 rounded-full bg-hijau-terang px-4 text-[13px] font-bold text-hitam transition-[scale] duration-150 ease-out active:scale-[0.96]"
        >
          <Icon name={buka ? 'tutup' : 'usulan'} size={18} />
          {buka ? 'Tutup' : 'Tanya MusrenAI'}
        </button>
      </div>
    </Panggung>
  );
}
