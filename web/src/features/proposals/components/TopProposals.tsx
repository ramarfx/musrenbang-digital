import type { Proposal } from '@musrenbang/shared';
import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { getCategoryInfo } from '@/features/categories/info';
import { formatRupiahRingkas } from '@/lib/format';
import { UpvoteButton } from './UpvoteButton';
import { StatusBadge } from './StatusBadge';

/** Usulan dengan suara terbanyak. Seri dibagi dengan yang lebih baru. Tanpa suara = tidak masuk. */
export function pilihTeratas(proposals: readonly Proposal[], jumlah = 3): Proposal[] {
  return proposals
    .filter((proposal) => proposal.jumlah_suara > 0)
    .sort(
      (a, b) =>
        b.jumlah_suara - a.jumlah_suara ||
        new Date(b.dibuat_pada).getTime() - new Date(a.dibuat_pada).getTime(),
    )
    .slice(0, jumlah);
}

// Tiga teratas tampil sebagai kartu; peringkat sesudahnya muncul bertahap lewat tombol.
const KARTU = 3;
const LANGKAH = 5;
const MAKS = 20;

/**
 * Bagian "Usulan terpopuler": tiga kartu putih bercap yang setara. Tiap kartu membawa ikon
 * bidang, status, nomor peringkat besar yang samar di sudut, dan nama bidang bertanda stabilo.
 * Isi sejajar dari atas, tombol dukung selalu di kiri bawah. Hanya tampil kalau sudah ada
 * usulan yang mendapat suara.
 */
export function TopProposals({ proposals }: { proposals: readonly Proposal[] }) {
  const semua = pilihTeratas(proposals, MAKS);
  const [tampil, setTampil] = useState(KARTU);
  if (semua.length === 0) return null;
  const teratas = semua.slice(0, KARTU);
  const lanjutan = semua.slice(KARTU, tampil);
  const sisa = semua.length - Math.max(tampil, KARTU);

  return (
    <section aria-labelledby="judul-teratas" className="space-y-4">
      <div>
        <h2 id="judul-teratas" className="text-xl font-bold">
          Usulan terpopuler
        </h2>
        <p className="text-sm text-muted">Paling banyak didukung warga.</p>
      </div>
      {/* HP: deret kartu yang digeser ke samping; layar lebar: tiga kolom. */}
      <div className="stagger trek-sembunyi -mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
        {teratas.map((proposal, index) => (
          <article
            key={proposal.id}
            className="kartu-cap relative flex w-[236px] flex-none snap-start flex-col overflow-hidden rounded-[20px] bg-surface p-4 transition-[translate] duration-150 ease-out hover:-translate-y-0.5 sm:rounded-3xl sm:p-6 md:w-auto"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-1 right-3 text-[64px] leading-none font-extrabold text-ink opacity-[0.07] select-none sm:right-4 sm:text-[84px]"
            >
              {index + 1}
            </span>
            <div className="relative flex items-center gap-3">
              <CategoryTile kategori={proposal.kategori} gaya="cap" />
              <StatusBadge status={proposal.status} />
            </div>
            <h3 className="relative mt-3 line-clamp-2 min-h-[2lh] text-[15px] leading-snug font-bold tracking-[-0.01em] sm:mt-4 sm:line-clamp-none sm:min-h-0 sm:text-lg">
              <Link
                to={`/usulan/${proposal.id}`}
                className="after:absolute after:-inset-4 after:content-[''] focus-visible:outline-none sm:after:-inset-6"
              >
                {proposal.judul}
              </Link>
            </h3>
            <p className="relative mt-1 text-[13px] text-muted">
              <span
                className="tanda-kategori"
                style={
                  { '--tanda': getCategoryInfo(proposal.kategori).warna.latar } as CSSProperties
                }
              >
                {proposal.kategori}
              </span>{' '}
              · {formatRupiahRingkas(proposal.estimasi_biaya)}
            </p>
            <div className="relative z-10 mt-auto flex items-center justify-between gap-3 pt-3.5 sm:pt-5">
              <UpvoteButton proposalId={proposal.id} jumlah={proposal.jumlah_suara} />
              <span className="text-[12.5px] text-muted">Peringkat {index + 1}</span>
            </div>
          </article>
        ))}
      </div>

      {lanjutan.length > 0 && (
        <Card className="p-0 sm:p-0">
          <ol className="stagger divide-y divide-rule" start={KARTU + 1}>
            {lanjutan.map((proposal, index) => (
              <li key={proposal.id} className="relative flex items-center gap-3 px-4 py-3 sm:px-5">
                <span
                  className="w-7 flex-none text-center text-[15px] font-bold text-muted tabular-nums"
                  aria-label={`Peringkat ${KARTU + index + 1}`}
                >
                  {KARTU + index + 1}
                </span>
                <CategoryTile kategori={proposal.kategori} small />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/usulan/${proposal.id}`}
                    className="block truncate font-semibold after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                  >
                    {proposal.judul}
                  </Link>
                  <p className="truncate text-[12.5px] text-muted">
                    {proposal.kategori} · {formatRupiahRingkas(proposal.estimasi_biaya)}
                  </p>
                </div>
                <span className="hidden flex-none sm:block">
                  <StatusBadge status={proposal.status} />
                </span>
                <span className="relative z-10 flex-none">
                  <UpvoteButton proposalId={proposal.id} jumlah={proposal.jumlah_suara} />
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {semua.length > KARTU && (
        <div className="flex flex-wrap items-center gap-3">
          {sisa > 0 && (
            <button
              type="button"
              onClick={() => setTampil((n) => Math.min(Math.max(n, KARTU) + LANGKAH, semua.length))}
              className={buttonClass('outline', 'md')}
            >
              Tampilkan {Math.min(LANGKAH, sisa)} lagi
            </button>
          )}
          {tampil > KARTU && (
            <button
              type="button"
              onClick={() => setTampil(KARTU)}
              className={buttonClass('ghost', 'md')}
            >
              Tampilkan lebih sedikit
            </button>
          )}
          <span className="text-[13px] text-muted">
            Peringkat 1 sampai {Math.min(Math.max(tampil, KARTU), semua.length)} dari {semua.length}{' '}
            usulan yang sudah mendapat upvote
          </span>
        </div>
      )}
    </section>
  );
}
