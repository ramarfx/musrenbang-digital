import type { Proposal } from '@musrenbang/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';
import { Card, HeroCard } from '@/components/ui/Card';
import { CategoryTile } from '@/features/categories/components/CategoryTile';
import { cn } from '@/lib/cn';
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

function Peringkat({ nomor, terang = false }: { nomor: number; terang?: boolean }) {
  return (
    <span
      className={cn(
        'grid size-9 flex-none place-items-center rounded-full text-[15px] font-bold',
        terang ? 'bg-hijau-terang text-hitam' : 'bg-ink text-on-ink',
      )}
      aria-label={`Peringkat ${nomor}`}
    >
      {nomor}
    </span>
  );
}

/**
 * Bagian "Usulan terpopuler": peringkat 1 berkartu hijau, peringkat 2 dan 3 berkartu putih
 * dengan nomor tinta. Isi tiap kartu sejajar dari atas, dan tombol dukung selalu di kiri bawah.
 * Hanya tampil kalau sudah ada usulan yang mendapat suara.
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
      <div className="stagger grid gap-4 md:grid-cols-3">
        {teratas.map((proposal, index) => {
          const juara = index === 0;
          const isi = (
            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <Peringkat nomor={index + 1} terang={juara} />
                <StatusBadge status={proposal.status} />
              </div>
              <h3 className="mt-4 text-lg leading-snug font-bold tracking-[-0.01em]">
                <Link
                  to={`/usulan/${proposal.id}`}
                  className="after:absolute after:-inset-5 after:content-[''] focus-visible:outline-none sm:after:-inset-6"
                >
                  {proposal.judul}
                </Link>
              </h3>
              <p className={cn('mt-1 text-[13px]', juara ? 'text-white/75' : 'text-muted')}>
                {proposal.kategori} · {formatRupiahRingkas(proposal.estimasi_biaya)}
              </p>
              <div className="relative z-10 mt-auto pt-5">
                <UpvoteButton
                  proposalId={proposal.id}
                  jumlah={proposal.jumlah_suara}
                  terang={juara}
                />
              </div>
            </div>
          );
          return juara ? (
            <HeroCard
              key={proposal.id}
              className="transition-[translate] duration-150 ease-out hover:-translate-y-0.5"
            >
              {isi}
            </HeroCard>
          ) : (
            <article
              key={proposal.id}
              className="relative rounded-3xl border border-border bg-surface p-5 transition-[translate,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-ink/40 sm:p-6"
            >
              {isi}
            </article>
          );
        })}
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
