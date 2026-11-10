import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/** Satu langkah tur: `target` dicocokkan dengan atribut `data-tur` di halaman. */
export type LangkahTur = { target: string; judul: string; isi: string };

type Kotak = { atas: number; kiri: number; lebar: number; tinggi: number };

const JARAK = 8;
const LEBAR_KARTU = 320;
/** Berapa bingkai berturut-turut posisi bagian harus diam sebelum gulir dianggap selesai. */
const BINGKAI_DIAM = 6;
const BATAS_TUNGGU_MS = 1400;

const cari = (target: string) => document.querySelector<HTMLElement>(`[data-tur="${target}"]`);

function ukur(el: HTMLElement): Kotak {
  const r = el.getBoundingClientRect();
  // Bagian yang lebih tinggi dari layar disorot sebatas yang terlihat, supaya gelapnya tetap tampak.
  const atas = Math.max(r.top - JARAK, 4);
  const bawah = Math.min(r.bottom + JARAK, window.innerHeight - 4);
  return {
    atas,
    kiri: r.left - JARAK,
    lebar: r.width + JARAK * 2,
    tinggi: Math.max(bawah - atas, 0),
  };
}

/** Bagian yang tinggi diletakkan di atas layar, yang lain di tengah. Benar bila sudah di sana. */
function perluGulir(el: HTMLElement): { gulir: boolean; tinggi: boolean } {
  const r = el.getBoundingClientRect();
  const tinggiLayar = window.innerHeight;
  const tinggi = r.height > tinggiLayar * 0.7;
  const sudah = tinggi
    ? r.top >= 0 && r.top <= tinggiLayar * 0.25
    : Math.abs((r.top + r.bottom) / 2 - tinggiLayar / 2) <= 40;
  return { gulir: !sudah, tinggi };
}

/**
 * Tombol "?" kecil di pojok kanan bawah, selalu di tempat yang sama. Di layar lebar tombol
 * asisten melayang bergeser ke kirinya; di HP "?" ditumpuk tepat di atas tombol asisten. Dipencet, halaman
 * dipudarkan dan satu bagian disorot bergantian, tiap bagian dengan kartu penjelasan. Bisa
 * ditutup kapan saja. Langkah yang bagiannya tidak ada di layar (mis. data belum dimuat)
 * dilewati.
 */
export function TurHalaman({ langkah }: { langkah: readonly LangkahTur[] }) {
  const [daftar, setDaftar] = useState<readonly LangkahTur[] | null>(null);
  const tombolRef = useRef<HTMLButtonElement>(null);

  const tutup = useCallback(() => {
    setDaftar(null);
    tombolRef.current?.focus();
  }, []);

  // Dipasang ke body: kelas animasi halaman memakai transform, yang akan membuat posisi
  // `fixed` ikut bergeser terhadap halaman.
  return createPortal(
    <>
      <button
        ref={tombolRef}
        type="button"
        onClick={() => {
          const ada = langkah.filter((item) => cari(item.target));
          if (ada.length > 0) setDaftar(ada);
        }}
        aria-label="Bantuan halaman ini"
        title="Bantuan halaman ini"
        className={cn(
          // Layar lebar: sejajar tengah dengan tombol asisten (tinggi 44px), jadi naik 2px dari
          // tepi bawahnya. HP: tepat di atas tombol asisten, selebar tepi kanan yang sama.
          'fixed right-3 bottom-[68px] z-40 grid size-10 place-items-center rounded-full border border-edge bg-surface text-sm font-semibold text-muted transition-[color,border-color,scale] duration-150 ease-out hover:border-ink hover:text-ink active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga sm:right-5 sm:bottom-[22px]',
        )}
      >
        ?
      </button>
      {daftar && <Tur langkah={daftar} onTutup={tutup} />}
    </>,
    document.body,
  );
}

function Tur({ langkah, onTutup }: { langkah: readonly LangkahTur[]; onTutup: () => void }) {
  const [urutan, setUrutan] = useState(0);
  const [kotak, setKotak] = useState<Kotak | null>(null);
  // Selama layar masih bergulir ke bagian berikutnya, hanya latar gelap yang tampil.
  const [siap, setSiap] = useState(false);
  const [tinggiKartu, setTinggiKartu] = useState(190);
  const siapRef = useRef(false);
  const akarRef = useRef<HTMLDivElement>(null);
  const kartuRef = useRef<HTMLDivElement>(null);
  const lanjutRef = useRef<HTMLButtonElement>(null);
  const kini = langkah[urutan];
  const terakhir = urutan === langkah.length - 1;

  // Gulung ke bagian yang disorot, tunggu sampai gulirnya berhenti, baru tampilkan sorotan.
  // Dengan begitu sorotan tidak pernah mengejar halaman yang masih bergerak.
  useLayoutEffect(() => {
    const el = cari(kini.target);
    if (!el) return;
    setSiap(false);
    const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const { gulir, tinggi } = perluGulir(el);
    if (gulir) {
      el.scrollIntoView({
        block: tinggi ? 'start' : 'center',
        behavior: kurangiGerak ? 'auto' : 'smooth',
      });
    }

    let bingkai = 0;
    let terakhirAtas = Number.NaN;
    let diam = 0;
    let selesai = false;
    const tampilkan = () => {
      if (selesai) return;
      selesai = true;
      setKotak(ukur(el));
      setSiap(true);
    };
    const tunggu = () => {
      if (selesai) return;
      const atas = el.getBoundingClientRect().top;
      diam = Math.abs(atas - terakhirAtas) < 0.5 ? diam + 1 : 0;
      terakhirAtas = atas;
      if (diam >= (gulir ? BINGKAI_DIAM : 2)) {
        tampilkan();
        return;
      }
      bingkai = requestAnimationFrame(tunggu);
    };
    bingkai = requestAnimationFrame(tunggu);
    // Pengaman: tab yang tidak tampil tidak menjalankan bingkai animasi.
    const pengaman = window.setTimeout(tampilkan, BATAS_TUNGGU_MS);

    // Setelah siap, layar yang berubah ukuran atau bergeser tetap diikuti.
    const ikuti = () => {
      if (siapRef.current) setKotak(ukur(el));
    };
    window.addEventListener('resize', ikuti);
    window.addEventListener('scroll', ikuti, true);
    return () => {
      selesai = true;
      clearTimeout(pengaman);
      cancelAnimationFrame(bingkai);
      window.removeEventListener('resize', ikuti);
      window.removeEventListener('scroll', ikuti, true);
    };
  }, [kini.target]);

  useEffect(() => {
    siapRef.current = siap;
  }, [siap]);

  useEffect(() => {
    if (siap) lanjutRef.current?.focus({ preventScroll: true });
  }, [siap, urutan]);

  useLayoutEffect(() => {
    if (siap && kartuRef.current) setTinggiKartu(kartuRef.current.offsetHeight);
  }, [siap, urutan]);

  // Halaman di balik tur tidak boleh bergulir oleh pengguna: sorotan akan terlihat meleset.
  useEffect(() => {
    const akar = akarRef.current;
    if (!akar) return;
    const cegah = (e: Event) => e.preventDefault();
    akar.addEventListener('wheel', cegah, { passive: false });
    akar.addEventListener('touchmove', cegah, { passive: false });
    return () => {
      akar.removeEventListener('wheel', cegah);
      akar.removeEventListener('touchmove', cegah);
    };
  }, []);

  useEffect(() => {
    const saatKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onTutup();
      if (e.key === 'ArrowRight') setUrutan((n) => Math.min(n + 1, langkah.length - 1));
      if (e.key === 'ArrowLeft') setUrutan((n) => Math.max(n - 1, 0));
    };
    window.addEventListener('keydown', saatKey);
    return () => window.removeEventListener('keydown', saatKey);
  }, [onTutup, langkah.length]);

  const lebarLayar = window.innerWidth;
  const tinggiLayar = window.innerHeight;
  const sempit = lebarLayar < 640;

  // Di HP kartu menempel di bawah layar. Di layar lebar kartu di bawah bagian yang disorot,
  // atau di atasnya bila tidak muat, atau di bawah layar bila sorotan memenuhi layar.
  let gaya: React.CSSProperties | null = null;
  if (siap && kotak) {
    if (sempit) {
      gaya = { left: 12, right: 12, bottom: 12 };
    } else {
      const lebar = Math.min(LEBAR_KARTU, lebarLayar - 24);
      const kiri = Math.min(Math.max(12, kotak.kiri), lebarLayar - lebar - 12);
      const bawahKotak = kotak.atas + kotak.tinggi + 12;
      const atasKotak = kotak.atas - tinggiKartu - 12;
      if (bawahKotak + tinggiKartu < tinggiLayar - 12) gaya = { left: kiri, top: bawahKotak, width: lebar };
      else if (atasKotak >= 12) gaya = { left: kiri, top: atasKotak, width: lebar };
      else gaya = { left: kiri, bottom: 12, width: lebar };
    }
  }

  return createPortal(
    <div ref={akarRef} className="fixed inset-0 z-[1200]">
      {/* Penangkap klik: tidak ada yang bisa dipencet di halaman selama tur. */}
      <div className="absolute inset-0" onClick={onTutup} aria-hidden="true" />
      {siap && kotak ? (
        <div
          aria-hidden="true"
          className="tur-sorot pointer-events-none absolute rounded-xl border-[1.5px] border-ink"
          style={{ top: kotak.atas, left: kotak.kiri, width: kotak.lebar, height: kotak.tinggi }}
        />
      ) : (
        <div aria-hidden="true" className="tur-latar pointer-events-none absolute inset-0" />
      )}
      {gaya && (
        <div
          ref={kartuRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Bantuan halaman, langkah ${urutan + 1} dari ${langkah.length}`}
          key={urutan}
          style={gaya}
          className="tur-kartu absolute rounded-xl border-[1.5px] border-ink bg-surface p-4 text-ink shadow-[0_4px_0_var(--ink)]"
        >
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-muted">
            <span>
              Langkah {urutan + 1} dari {langkah.length}
            </span>
            <button
              type="button"
              onClick={onTutup}
              aria-label="Tutup bantuan"
              title="Tutup"
              className="-mr-1.5 grid size-8 place-items-center rounded-lg text-ink hover:bg-active focus-visible:outline-2 focus-visible:outline-warga"
            >
              <Icon name="tutup" size={16} />
            </button>
          </div>
          <h2 className="mt-1 text-base font-bold">{kini.judul}</h2>
          <p className="mt-1 text-sm text-muted">{kini.isi}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="flex flex-1 items-center gap-1" aria-hidden="true">
              {langkah.map((item, i) => (
                <i
                  key={item.target}
                  className={cn(
                    'block h-1.5 rounded-full',
                    i === urutan ? 'w-4 bg-ink' : 'w-1.5 bg-track',
                  )}
                />
              ))}
            </span>
            {!terakhir && (
              <button
                type="button"
                onClick={onTutup}
                className="min-h-9 px-2 text-xs text-muted underline hover:text-ink"
              >
                Lewati
              </button>
            )}
            {urutan > 0 && (
              <button
                type="button"
                onClick={() => setUrutan(urutan - 1)}
                aria-label="Langkah sebelumnya"
                className="grid size-9 place-items-center rounded-lg border-[1.5px] border-ink bg-surface hover:bg-active"
              >
                <Icon name="panahKiri" size={16} />
              </button>
            )}
            <button
              ref={lanjutRef}
              type="button"
              onClick={() => (terakhir ? onTutup() : setUrutan(urutan + 1))}
              className="min-h-9 rounded-lg border-[1.5px] border-ink bg-[#035C42] px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
            >
              {terakhir ? 'Selesai' : 'Lanjut'}
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
