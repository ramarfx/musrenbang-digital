import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/** Satu langkah tur: `target` dicocokkan dengan atribut `data-tur` di halaman. */
export type LangkahTur = { target: string; judul: string; isi: string };

type Kotak = { atas: number; kiri: number; lebar: number; tinggi: number };

const JARAK = 8;
const LEBAR_KARTU = 320;

const cari = (target: string) =>
  document.querySelector<HTMLElement>(`[data-tur="${target}"]`);

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

/**
 * Tombol "?" di samping judul halaman. Dipencet, halaman dipudarkan dan satu bagian disorot
 * bergantian, tiap bagian dengan kartu penjelasan. Bisa ditutup kapan saja. Langkah yang
 * bagiannya tidak ada di layar (mis. data belum dimuat) dilewati.
 */
export function TurHalaman({ langkah }: { langkah: readonly LangkahTur[] }) {
  const [daftar, setDaftar] = useState<readonly LangkahTur[] | null>(null);
  const tombolRef = useRef<HTMLButtonElement>(null);

  const tutup = useCallback(() => {
    setDaftar(null);
    tombolRef.current?.focus();
  }, []);

  return (
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
        className="grid size-9 flex-none place-items-center rounded-full border-[1.5px] border-ink bg-[#F6D98B] text-base font-extrabold text-[#14222B] shadow-[0_2px_0_var(--ink)] transition-transform duration-150 ease-[var(--ease-out)] active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
      >
        ?
      </button>
      {daftar &&
        createPortal(<Tur langkah={daftar} onTutup={tutup} />, document.body)}
    </>
  );
}

function Tur({
  langkah,
  onTutup,
}: {
  langkah: readonly LangkahTur[];
  onTutup: () => void;
}) {
  const [urutan, setUrutan] = useState(0);
  const [kotak, setKotak] = useState<Kotak | null>(null);
  const [tinggiKartu, setTinggiKartu] = useState(180);
  const kartuRef = useRef<HTMLDivElement>(null);
  const lanjutRef = useRef<HTMLButtonElement>(null);
  const kini = langkah[urutan];
  const terakhir = urutan === langkah.length - 1;

  // Gulung ke bagian yang disorot, lalu ikuti posisinya selama layar bergerak atau berubah ukuran.
  useLayoutEffect(() => {
    const el = cari(kini.target);
    if (!el) return;
    const kurangiGerak = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollIntoView({
      block: "center",
      behavior: kurangiGerak ? "auto" : "smooth",
    });
    let bingkai = 0;
    const perbarui = () => {
      cancelAnimationFrame(bingkai);
      bingkai = requestAnimationFrame(() => setKotak(ukur(el)));
    };
    setKotak(ukur(el));
    // Pendengar gulir ikut memantau gulir halus yang belum selesai saat pertama diukur.
    window.addEventListener("scroll", perbarui, true);
    window.addEventListener("resize", perbarui);
    return () => {
      cancelAnimationFrame(bingkai);
      window.removeEventListener("scroll", perbarui, true);
      window.removeEventListener("resize", perbarui);
    };
  }, [kini.target]);

  useEffect(() => {
    lanjutRef.current?.focus();
  }, [urutan]);

  useLayoutEffect(() => {
    if (kartuRef.current) setTinggiKartu(kartuRef.current.offsetHeight);
  }, [urutan]);

  useEffect(() => {
    const saatKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onTutup();
      if (e.key === "ArrowRight")
        setUrutan((n) => Math.min(n + 1, langkah.length - 1));
      if (e.key === "ArrowLeft") setUrutan((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", saatKey);
    return () => window.removeEventListener("keydown", saatKey);
  }, [onTutup, langkah.length]);

  const lebarLayar = window.innerWidth;
  const tinggiLayar = window.innerHeight;
  const sempit = lebarLayar < 640;

  // Di HP kartu menempel di bawah layar. Di layar lebar kartu di bawah bagian yang disorot,
  // atau di atasnya bila tidak muat, dan dijepit supaya tidak keluar layar.
  let gaya: React.CSSProperties;
  if (sempit || !kotak) {
    gaya = { left: 12, right: 12, bottom: 12 };
  } else {
    const lebar = Math.min(LEBAR_KARTU, lebarLayar - 24);
    const kiri = Math.min(Math.max(12, kotak.kiri), lebarLayar - lebar - 12);
    const bawahKotak = kotak.atas + kotak.tinggi + 12;
    const muatDiBawah = bawahKotak + tinggiKartu < tinggiLayar - 12;
    const atasKotak = kotak.atas - tinggiKartu - 12;
    if (muatDiBawah) gaya = { left: kiri, top: bawahKotak, width: lebar };
    else if (atasKotak >= 12) gaya = { left: kiri, top: atasKotak, width: lebar };
    // Bagian sorot memenuhi layar: kartu menempel di bawah, di atas sorotan.
    else gaya = { left: kiri, bottom: 12, width: lebar };
  }

  return (
    <div className="fixed inset-0 z-[1200]">
      {/* Penangkap klik: tidak ada yang bisa dipencet di halaman selama tur. */}
      <div className="absolute inset-0" onClick={onTutup} aria-hidden="true" />
      {kotak && (
        <div
          aria-hidden="true"
          className="tur-sorot pointer-events-none absolute rounded-xl border-[1.5px] border-ink"
          style={{
            top: kotak.atas,
            left: kotak.kiri,
            width: kotak.lebar,
            height: kotak.tinggi,
          }}
        />
      )}
      <div
        ref={kartuRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Bantuan halaman, langkah ${urutan + 1} dari ${langkah.length}`}
        key={urutan}
        style={gaya}
        className={cn(
          "tur-kartu absolute rounded-xl border-[1.5px] border-ink bg-surface p-4 text-ink shadow-[0_4px_0_var(--ink)]",
          sempit && "max-w-none",
        )}
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
                  "block h-1.5 rounded-full transition-[width,background-color] duration-200",
                  i === urutan ? "w-4 bg-ink" : "w-1.5 bg-track",
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
            {terakhir ? "Selesai" : "Lanjut"}
          </button>
        </div>
      </div>
    </div>
  );
}
