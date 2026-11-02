import { useCallback, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { WILAYAH_PILIHAN, type KodeWilayah, type PilihanWilayah } from '@/lib/wilayah';
import { cn } from '@/lib/cn';
import { useTutupDiLuar } from '@/lib/useTutupDiLuar';
import { formatAngka } from '@/lib/format';

const baris =
  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-ink transition-[background-color] duration-150 ease-out hover:bg-active focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-warga';

/**
 * Pilihan wilayah di atas peta, dalam satu tombol yang membuka daftar supaya tidak memakan
 * tempat. Tiap baris membawa titik warna yang sama dengan arsiran wilayahnya di peta dan jumlah
 * usulan yang titiknya jatuh di wilayah itu, jadi warna dan angkanya membawa informasi, bukan
 * hiasan. Baris pertama mengembalikan peta ke seluruh Jakarta.
 */
export function FilterWilayah({
  terpilih,
  onPilih,
  jumlah,
  total,
}: {
  terpilih: PilihanWilayah;
  onPilih: (pilihan: PilihanWilayah) => void;
  /** Jumlah usulan berlokasi per kode wilayah, dan totalnya untuk Semua Jakarta. */
  jumlah: Record<KodeWilayah, number>;
  total: number;
}) {
  const [buka, setBuka] = useState(false);
  const akar = useRef<HTMLDivElement>(null);

  const tutup = useCallback(() => setBuka(false), []);
  useTutupDiLuar(buka, akar, tutup);

  const aktif = WILAYAH_PILIHAN.find((wilayah) => wilayah.kode === terpilih);
  const pilih = (kode: PilihanWilayah) => {
    onPilih(kode);
    setBuka(false);
  };

  return (
    <div ref={akar} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={buka}
        onClick={() => setBuka((nilai) => !nilai)}
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-[13px] font-semibold text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
      >
        <Icon name="lokasi" size={15} />
        {aktif ? aktif.nama : terpilih === 'tanpa' ? 'Tanpa arsiran' : 'Semua Jakarta'}
        <span className="tabular-nums text-muted">
          {formatAngka(aktif ? (jumlah[aktif.kode] ?? 0) : total)}
        </span>
        <span
          className={cn('grid transition-transform duration-200 ease-out', buka && 'rotate-180')}
        >
          <Icon name="panahBawah" size={14} />
        </span>
      </button>

      {buka && (
        <ul
          role="listbox"
          aria-label="Pilih wilayah di peta"
          className="daftar-wilayah absolute top-full left-0 z-[1000] mt-1.5 w-60 rounded-xl border border-border bg-surface p-1 shadow-lg"
        >
          <li role="option" aria-selected={terpilih === null}>
            <button type="button" onClick={() => pilih(null)} className={baris}>
              <span
                aria-hidden="true"
                className="size-2.5 flex-none rounded-full bg-warga ring-1 ring-black/15"
              />
              <span className="flex-1">Semua Jakarta</span>
              <span className="tabular-nums text-muted">{formatAngka(total)}</span>
              <span className="grid size-4 place-items-center">
                {terpilih === null && <Icon name="centang" size={14} />}
              </span>
            </button>
          </li>
          {WILAYAH_PILIHAN.map((wilayah) => (
            <li key={wilayah.kode} role="option" aria-selected={terpilih === wilayah.kode}>
              <button type="button" onClick={() => pilih(wilayah.kode)} className={baris}>
                <span
                  aria-hidden="true"
                  className="size-2.5 flex-none rounded-full ring-1 ring-black/15"
                  style={{ backgroundColor: wilayah.warna }}
                />
                <span className="flex-1">{wilayah.nama}</span>
                <span className="tabular-nums text-muted">
                  {formatAngka(jumlah[wilayah.kode] ?? 0)}
                </span>
                <span className="grid size-4 place-items-center">
                  {terpilih === wilayah.kode && <Icon name="centang" size={14} />}
                </span>
              </button>
            </li>
          ))}
          <li
            role="option"
            aria-selected={terpilih === 'tanpa'}
            className="mt-1 border-t border-border pt-1"
          >
            <button type="button" onClick={() => pilih('tanpa')} className={baris}>
              <span className="grid size-2.5 flex-none place-items-center text-muted">
                <Icon name="tutup" size={10} />
              </span>
              <span className="flex-1">Tanpa arsiran</span>
              <span className="grid size-4 place-items-center">
                {terpilih === 'tanpa' && <Icon name="centang" size={14} />}
              </span>
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
