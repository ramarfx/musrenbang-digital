import { cn } from '@/lib/cn';

type PaginationProps = {
  halaman: number;
  totalHalaman: number;
  onHalaman: (halaman: number) => void;
  /** Nama navigasi untuk pembaca layar, mis. "Halaman antrean tinjau". */
  label: string;
};

/**
 * Kontrol halaman bernomor yang ringkas dan rata tengah untuk daftar panjang. Tombol angka
 * menonjol di halaman aktif; tombol sebelumnya dan berikutnya nonaktif di ujung. Jendela angka
 * dipusatkan ke halaman aktif supaya tetap ringkas walau halamannya banyak.
 */
export function Pagination({ halaman, totalHalaman, onHalaman, label }: PaginationProps) {
  if (totalHalaman <= 1) return null;

  const daftar: (number | '…')[] = [];
  if (totalHalaman <= 7) {
    for (let i = 1; i <= totalHalaman; i += 1) daftar.push(i);
  } else {
    const tengah = new Set([
      1,
      2,
      totalHalaman - 1,
      totalHalaman,
      halaman - 1,
      halaman,
      halaman + 1,
    ]);
    let sebelumnya = 0;
    for (let i = 1; i <= totalHalaman; i += 1) {
      if (!tengah.has(i)) continue;
      if (sebelumnya > 0 && i - sebelumnya > 1) daftar.push('…');
      daftar.push(i);
      sebelumnya = i;
    }
  }

  const kelas = (aktif: boolean) =>
    cn(
      'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border px-2 text-sm font-semibold tabular-nums transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga disabled:cursor-not-allowed disabled:opacity-45',
      aktif ? 'border-ink bg-ink text-on-ink' : 'border-border bg-surface text-ink hover:bg-active',
    );

  return (
    <nav aria-label={label} className="flex justify-center">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          disabled={halaman <= 1}
          onClick={() => onHalaman(halaman - 1)}
          aria-label="Halaman sebelumnya"
          className={kelas(false)}
        >
          <span aria-hidden="true">←</span>
        </button>
        {daftar.map((item, index) =>
          item === '…' ? (
            <span key={`titik-${index}`} aria-hidden="true" className="px-1 text-muted">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === halaman ? 'page' : undefined}
              aria-label={`Halaman ${item}`}
              onClick={() => onHalaman(item)}
              className={kelas(item === halaman)}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={halaman >= totalHalaman}
          onClick={() => onHalaman(halaman + 1)}
          aria-label="Halaman berikutnya"
          className={kelas(false)}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </nav>
  );
}
