import type { CSSProperties } from 'react';
import type { ProposalPhoto } from '@musrenbang/shared';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';
import { cn } from '@/lib/cn';
import { formatTanggal } from '@/lib/format';
import { urlFoto } from '../api';

const PER_HALAMAN = 3;

const kelasPanah =
  'grid size-9 flex-none place-items-center rounded-full border-[1.5px] border-edge bg-surface text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-90 disabled:cursor-default disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga';

/**
 * Galeri foto pengerjaan untuk warga: tiga foto per halaman dengan panah geser, jadi kartunya
 * tidak memanjang. Pindah halaman menggeser deretan foto ke samping. Klik foto membuka tampilan
 * besar yang muncul membesar pelan, dan foto berganti dengan geseran searah panah yang ditekan
 * (kiri atau kanan, atau tombol keyboard). Semua gerak mati bila pengguna meminimalkan animasi.
 */
export function GaleriFoto({ photos }: { photos: ProposalPhoto[] }) {
  const [halaman, setHalaman] = useState(0);
  const [terbuka, setTerbuka] = useState<number | null>(null);
  /** Arah geser foto besar: 1 = ke foto berikutnya, -1 = sebelumnya, 0 = baru dibuka. */
  const [arah, setArah] = useState<-1 | 0 | 1>(0);
  const totalHalaman = Math.max(1, Math.ceil(photos.length / PER_HALAMAN));
  const halamanAktif = Math.min(halaman, totalHalaman - 1);
  const awal = halamanAktif * PER_HALAMAN;
  const jumlahTampil = Math.min(PER_HALAMAN, photos.length - awal);

  const pindah = useCallback(
    (ke: number) => {
      if (terbuka === null) return;
      const tujuan = Math.max(0, Math.min(photos.length - 1, ke));
      if (tujuan === terbuka) return;
      setArah(tujuan > terbuka ? 1 : -1);
      setTerbuka(tujuan);
    },
    [terbuka, photos.length],
  );

  useEffect(() => {
    if (terbuka === null) return;
    const tekan = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') pindah(terbuka + 1);
      if (event.key === 'ArrowLeft') pindah(terbuka - 1);
    };
    window.addEventListener('keydown', tekan);
    return () => window.removeEventListener('keydown', tekan);
  }, [terbuka, pindah]);

  const buka = (indeks: number) => {
    setArah(0);
    setTerbuka(indeks);
  };

  // Saat ditutup, deretan kecil menyusul ke halaman foto yang terakhir dilihat.
  const tutup = () => {
    if (terbuka !== null) setHalaman(Math.floor(terbuka / PER_HALAMAN));
    setTerbuka(null);
  };

  const foto = terbuka === null ? null : photos[terbuka];

  return (
    <div>
      <div className="flex items-center gap-2.5">
        {totalHalaman > 1 && (
          <button
            type="button"
            aria-label="Foto sebelumnya"
            disabled={halamanAktif === 0}
            onClick={() => setHalaman(halamanAktif - 1)}
            className={kelasPanah}
          >
            <span aria-hidden="true" className="-translate-x-px text-lg leading-none font-bold">
              ‹
            </span>
          </button>
        )}

        <div className="min-w-0 flex-1 overflow-hidden rounded-xl">
          <div
            className="flex transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(-${halamanAktif * 100}%)` }}
          >
            {Array.from({ length: totalHalaman }, (_, nomor) => (
              <ul
                key={nomor}
                aria-hidden={nomor !== halamanAktif}
                inert={nomor !== halamanAktif}
                className="grid w-full flex-none grid-cols-3 gap-2"
              >
                {photos
                  .slice(nomor * PER_HALAMAN, nomor * PER_HALAMAN + PER_HALAMAN)
                  .map((item, indeks) => {
                    const urutan = nomor * PER_HALAMAN + indeks;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => buka(urutan)}
                          aria-label={`Perbesar foto ${urutan + 1} dari ${photos.length}`}
                          className="group block w-full cursor-zoom-in overflow-hidden rounded-xl border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
                        >
                          <img
                            src={urlFoto(item.path)}
                            alt={`Foto pengerjaan ${urutan + 1}, ${item.status}`}
                            loading="lazy"
                            className="aspect-[4/3] w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
                          />
                        </button>
                      </li>
                    );
                  })}
              </ul>
            ))}
          </div>
        </div>

        {totalHalaman > 1 && (
          <button
            type="button"
            aria-label="Foto berikutnya"
            disabled={halamanAktif >= totalHalaman - 1}
            onClick={() => setHalaman(halamanAktif + 1)}
            className={kelasPanah}
          >
            <span aria-hidden="true" className="translate-x-px text-lg leading-none font-bold">
              ›
            </span>
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-[12.5px] text-muted tabular-nums" aria-live="polite">
        Foto {awal + 1} sampai {awal + jumlahTampil} dari {photos.length}
      </p>

      <Modal
        open={foto !== null && foto !== undefined}
        onClose={tutup}
        labelledBy="judul-foto-besar"
        className="w-[min(720px,calc(100vw-24px))]"
      >
        {foto && terbuka !== null && (
          <div className="p-3 sm:p-4">
            <h2 id="judul-foto-besar" className="sr-only">
              Foto pengerjaan {terbuka + 1} dari {photos.length}
            </h2>
            <div className="overflow-hidden rounded-2xl bg-track">
              <img
                key={terbuka}
                src={urlFoto(foto.path)}
                alt={`Foto pengerjaan ${terbuka + 1}, ${foto.status}`}
                style={{ '--geser': `${arah * 28}px` } as CSSProperties}
                className={cn(
                  'max-h-[70dvh] w-full object-contain',
                  arah === 0 ? 'foto-buka' : 'foto-geser',
                )}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <button
                type="button"
                aria-label="Foto sebelumnya"
                disabled={terbuka === 0}
                onClick={() => pindah(terbuka - 1)}
                className={kelasPanah}
              >
                <span aria-hidden="true" className="-translate-x-px text-lg leading-none font-bold">
                  ‹
                </span>
              </button>
              <button
                type="button"
                aria-label="Foto berikutnya"
                disabled={terbuka >= photos.length - 1}
                onClick={() => pindah(terbuka + 1)}
                className={kelasPanah}
              >
                <span aria-hidden="true" className="translate-x-px text-lg leading-none font-bold">
                  ›
                </span>
              </button>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                <StatusBadge status={foto.status} />
                <span className="text-[13px] text-muted">{formatTanggal(foto.dibuat_pada)}</span>
                <span className="text-[13px] text-muted tabular-nums">
                  {terbuka + 1} dari {photos.length}
                </span>
              </div>
              <button
                type="button"
                onClick={tutup}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border-[1.5px] border-edge bg-surface px-3.5 text-sm font-semibold text-ink hover:bg-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
              >
                <Icon name="tutup" size={14} />
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
