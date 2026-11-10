import type { ProposalPhoto } from '@musrenbang/shared';
import { urlFoto } from '../api';

const TAMPIL = 3;

/**
 * Tiga foto mini di kartu usulan, foto terbaru dulu. Bila foto lebih dari tiga, yang ketiga
 * diberi penanda "+n". Murni penanda: kartu sudah menjadi tautan ke halaman usulan, tempat
 * galeri lengkapnya, jadi foto di sini tidak punya tombol sendiri.
 */
export function FotoMini({ photos }: { photos: ProposalPhoto[] }) {
  if (photos.length === 0) return null;
  const tampil = photos.slice(0, TAMPIL);
  const sisa = photos.length - TAMPIL;
  return (
    <div className="mt-3">
      <p className="sr-only">{photos.length} foto pengerjaan</p>
      <ul className="grid grid-cols-3 gap-1.5" aria-hidden="true">
        {tampil.map((item, indeks) => (
          <li key={item.id} className="relative overflow-hidden rounded-lg border border-border">
            <img
              src={urlFoto(item.path)}
              alt=""
              loading="lazy"
              className="aspect-video w-full object-cover"
            />
            {sisa > 0 && indeks === TAMPIL - 1 && (
              <span className="absolute inset-0 grid place-items-center bg-ink/65 text-sm font-extrabold text-on-ink tabular-nums">
                +{sisa}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
