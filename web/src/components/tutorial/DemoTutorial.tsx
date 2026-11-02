import { PROPOSAL_STATUSES } from '@musrenbang/shared';
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { getCategoryInfo } from '@/features/categories/info';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';
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
      <div className={kartuClass}>
        <p className="mb-3 text-sm text-muted">
          <span className="font-semibold text-ink">
            {terisi === PROGRAM.length
              ? 'Lengkap.'
              : `Sudah diurutkan ${terisi} dari ${PROGRAM.length}.`}
          </span>{' '}
          Contoh dengan tiga bidang.
        </p>
        <div role="group" aria-label="Urutan prioritas per bidang">
          {PROGRAM.map((nama) => {
            const nomor = urut[nama] ?? 0;
            const labelId = `demo-urutan-${nama}`;
            const persen = totalPoin > 0 ? Math.round((poin(nama) / totalPoin) * 100) : 0;
            return (
              <div
                key={nama}
                className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 border-t border-rule py-3.5 first:border-t-0 first:pt-0 last:pb-0"
              >
                <CategoryTile kategori={nama} />
                <span id={labelId} className="min-w-0 font-semibold">
                  {nama}
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

function BatangTahap({ sekarang }: { sekarang: number }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {PROPOSAL_STATUSES.map((tahap, index) => (
        <i
          key={tahap}
          className={cn(
            'h-1 flex-1 rounded-full transition-colors duration-300',
            index <= sekarang ? 'bg-hijau' : 'bg-track',
          )}
        />
      ))}
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
      <article className={cn(kartuClass, 'sm:p-6')}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <CategoryTile kategori="Infrastruktur dan Jalan" />
            <div className="min-w-0">
              <h3 className="font-bold text-ink">Lampu jalan Gang Mawar mati</h3>
              <p className="text-[13px] text-muted">Infrastruktur dan Jalan</p>
            </div>
          </div>
          <StatusBadge status="Diajukan" />
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-ink/80">
          Sudah dua minggu lampu di sepanjang gang padam, warga takut lewat malam hari.
        </p>
        <div className="mt-4">
          <BatangTahap sekarang={0} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-rule pt-3 text-sm">
          <div>
            <dt className="text-[12.5px] text-muted">Estimasi</dt>
            <dd className="font-semibold">{formatRupiahRingkas(45_000_000)}</dd>
          </div>
          <div className="text-right">
            <dt className="text-[12.5px] text-muted">Diajukan</dt>
            <dd className="font-semibold">{formatTanggal(new Date().toISOString())}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap items-center gap-2">
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
    await p.tunggu(500);
    p.caption('4. Kirim, admin akan memeriksanya dulu');
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
            <span className="absolute inset-x-0 top-[44px] h-2.5 bg-surface" />
            <span className="absolute inset-y-0 left-[36%] w-2.5 bg-surface" />
            {pin && (
              <span
                aria-hidden="true"
                className="tt-jatuh absolute -mt-[26px] -ml-[13px]"
                style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={26}
                  height={26}
                  fill="var(--hijau-terang)"
                  stroke="var(--ink)"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
                </svg>
              </span>
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

  return (
    <Panggung demo={demo} onUlang={onUlang}>
      <div className={kartuClass}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <CategoryTile kategori="Infrastruktur dan Jalan" />
            <div className="min-w-0">
              <h3 className="font-bold text-ink">Lampu jalan Gang Mawar mati</h3>
              <p className="text-[13px] text-muted">Usulanmu</p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
        <div className="mt-4">
          <BatangTahap sekarang={tahap} />
          <ol className="mt-2 flex justify-between text-[10.5px] text-muted">
            {PROPOSAL_STATUSES.map((nama, index) => (
              <li
                key={nama}
                className={cn('flex-1 text-center', index === tahap && 'font-bold text-ink')}
              >
                {nama}
              </li>
            ))}
          </ol>
        </div>
        {pesan > 0 && (
          <div
            key={pesan}
            role="status"
            className="tt-muncul mt-4 flex items-center gap-2.5 rounded-2xl border-[1.5px] border-edge bg-surface px-3.5 py-2.5 text-[13px] font-semibold shadow-[0_3px_0_var(--edge)]"
          >
            <Icon name="lonceng" size={18} />
            Usulanmu kini: {status}
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
