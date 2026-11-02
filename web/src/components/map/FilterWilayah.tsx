import { WILAYAH_PILIHAN, type KodeWilayah } from '@/lib/wilayah';
import { cn } from '@/lib/cn';
import { formatAngka } from '@/lib/format';

/**
 * Tombol pilih wilayah di atas peta. Tiap tombol membawa titik warna yang sama dengan arsiran
 * wilayahnya di peta, dan jumlah usulan yang titiknya jatuh di wilayah itu, jadi warnanya dan
 * angkanya membawa informasi, bukan hiasan. Tombol pertama mengembalikan peta ke seluruh
 * Jakarta tanpa arsiran; menekan tombol wilayah yang sedang aktif juga melepas pilihan.
 */
export function FilterWilayah({
  terpilih,
  onPilih,
  jumlah,
  total,
}: {
  terpilih: KodeWilayah | null;
  onPilih: (kode: KodeWilayah | null) => void;
  /** Jumlah usulan berlokasi per kode wilayah, dan totalnya untuk tombol Semua Jakarta. */
  jumlah: Record<KodeWilayah, number>;
  total: number;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Pilih wilayah di peta">
      <button
        type="button"
        aria-pressed={terpilih === null}
        onClick={() => onPilih(null)}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[13px] font-semibold transition-[scale,background-color,border-color] duration-150 ease-out active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
          terpilih === null
            ? 'border-edge bg-ink text-on-ink'
            : 'border-border bg-surface text-ink hover:bg-active',
        )}
      >
        Semua Jakarta
        <span className={cn('tabular-nums', terpilih === null ? 'text-on-ink/75' : 'text-muted')}>
          {formatAngka(total)}
        </span>
      </button>
      {WILAYAH_PILIHAN.map((wilayah) => {
        const aktif = terpilih === wilayah.kode;
        return (
          <button
            key={wilayah.kode}
            type="button"
            aria-pressed={aktif}
            onClick={() => onPilih(aktif ? null : wilayah.kode)}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[13px] font-semibold transition-[scale,background-color,border-color] duration-150 ease-out active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga',
              aktif
                ? 'border-edge bg-ink text-on-ink'
                : 'border-border bg-surface text-ink hover:bg-active',
            )}
          >
            <span
              aria-hidden="true"
              className="size-2.5 flex-none rounded-full ring-1 ring-black/15"
              style={{ backgroundColor: wilayah.warna }}
            />
            {wilayah.nama}
            <span className={cn('tabular-nums', aktif ? 'text-on-ink/75' : 'text-muted')}>
              {formatAngka(jumlah[wilayah.kode] ?? 0)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
