import { useCallback, useRef, useState } from 'react';
import { getCategoryInfo } from '@/features/categories/info';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatAngka } from '@/lib/format';
import { useTutupDiLuar } from '@/lib/useTutupDiLuar';

const tombol =
  'inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-[13px] font-semibold text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga';

const baris =
  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-ink transition-[background-color] duration-150 ease-out hover:bg-active focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-warga';

export type KategoriPeta = { nama: string; jumlah: number };

/**
 * Dua kendali untuk penanda di peta: daftar kategori yang bisa dicentang satu per satu (ikon
 * dan angkanya sama dengan di pin), dan tombol untuk menyembunyikan semua penanda sekaligus.
 * Yang disimpan adalah kategori yang disembunyikan, jadi kategori baru otomatis tampil.
 */
export function FilterKategori({
  kategori,
  disembunyikan,
  onUbah,
  titikTampil,
  onTitik,
}: {
  kategori: KategoriPeta[];
  disembunyikan: string[];
  onUbah: (disembunyikan: string[]) => void;
  titikTampil: boolean;
  onTitik: (tampil: boolean) => void;
}) {
  const [buka, setBuka] = useState(false);
  const akar = useRef<HTMLDivElement>(null);
  const tutup = useCallback(() => setBuka(false), []);
  useTutupDiLuar(buka, akar, tutup);

  const tampil = kategori.filter((item) => !disembunyikan.includes(item.nama));
  const label =
    tampil.length === kategori.length
      ? 'Semua kategori'
      : tampil.length === 0
        ? 'Tanpa kategori'
        : `${formatAngka(tampil.length)} dari ${formatAngka(kategori.length)} kategori`;

  const ganti = (nama: string) =>
    onUbah(
      disembunyikan.includes(nama)
        ? disembunyikan.filter((item) => item !== nama)
        : [...disembunyikan, nama],
    );

  return (
    <>
      <div ref={akar} className="relative">
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={buka}
          onClick={() => setBuka((nilai) => !nilai)}
          className={tombol}
        >
          <Icon name="daftar" size={15} />
          {label}
          <span
            className={cn('grid transition-transform duration-200 ease-out', buka && 'rotate-180')}
          >
            <Icon name="panahBawah" size={14} />
          </span>
        </button>

        {buka && (
          <div className="daftar-wilayah absolute top-full left-0 z-[1000] mt-1.5 max-h-[min(380px,60dvh)] w-72 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-lg">
            <div className="flex gap-1 border-b border-border pb-1">
              <button type="button" onClick={() => onUbah([])} className={baris}>
                Pilih semua
              </button>
              <button
                type="button"
                onClick={() => onUbah(kategori.map((item) => item.nama))}
                className={baris}
              >
                Kosongkan
              </button>
            </div>
            <ul className="pt-1">
              {kategori.map((item) => {
                const aktif = !disembunyikan.includes(item.nama);
                return (
                  <li key={item.nama}>
                    <button
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={aktif}
                      onClick={() => ganti(item.nama)}
                      className={baris}
                    >
                      <span
                        className={cn(
                          'grid size-4 flex-none place-items-center rounded border transition-[background-color,border-color] duration-150 ease-out',
                          aktif ? 'border-edge bg-ink text-on-ink' : 'border-border bg-surface',
                        )}
                      >
                        {aktif && <Icon name="centang" size={11} />}
                      </span>
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="flex-none text-muted"
                      >
                        <path d={getCategoryInfo(item.nama).ikon} />
                      </svg>
                      <span className="min-w-0 flex-1 truncate">{item.nama}</span>
                      <span className="tabular-nums text-muted">{formatAngka(item.jumlah)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        aria-pressed={!titikTampil}
        onClick={() => onTitik(!titikTampil)}
        className={tombol}
      >
        <Icon name={titikTampil ? 'mata' : 'mataCoret'} size={15} />
        {titikTampil ? 'Sembunyikan titik' : 'Tampilkan titik'}
      </button>
    </>
  );
}
