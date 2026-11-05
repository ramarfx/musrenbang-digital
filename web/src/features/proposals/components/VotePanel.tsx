import type { Proposal } from '@musrenbang/shared';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button';
import { HeroCard } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/cn';
import { formatAngka } from '@/lib/format';
import { useHasVotedQuery, useToggleVoteMutation } from '../queries';

/** Kartu hijau dukungan warga: jumlah suara besar dan satu tombol untuk memberi atau membatalkan. */
export function VotePanel({ proposal }: { proposal: Proposal }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const hasVotedQuery = useHasVotedQuery(proposal.id, userId);
  const mutation = useToggleVoteMutation(proposal.id, userId);
  const sudahMemilih = hasVotedQuery.data ?? false;

  return (
    <HeroCard className="h-full" isiClassName="flex h-full flex-col">
      <p className="text-[13px] text-white/75">Upvote warga</p>
      <p className="mt-1 text-[44px] leading-none font-semibold tracking-[-0.04em]">
        {/* Angka baru naik masuk dari bawah tiap jumlahnya berubah (key = jumlah). */}
        <span key={proposal.jumlah_suara} className="angka-masuk inline-block">
          {formatAngka(proposal.jumlah_suara)}
        </span>
        <small className="ml-1.5 text-base font-medium tracking-normal text-white/75">suara</small>
      </p>
      <p className="mt-3 text-[13px] text-white/75">
        Satu akun satu upvote, dan bisa dibatalkan kapan saja.
      </p>
      {mutation.error && <p className="mt-2 text-sm text-white">{mutation.error.message}</p>}

      <div className="mt-auto pt-5">
        {user ? (
          <button
            type="button"
            aria-pressed={sudahMemilih}
            disabled={hasVotedQuery.isPending || mutation.isPending}
            onClick={() => {
              // Konfirmasinya ada di tombol (warna terisi, panah, tulisan), bukan notifikasi.
              mutation.mutate(sudahMemilih, { onError: (error) => toast.error(error.message) });
            }}
            className={cn(
              'relative isolate inline-flex h-11 items-center gap-2 overflow-hidden rounded-[14px] bg-white px-[18px] text-[15px] font-bold text-hitam transition-[scale,opacity] duration-150 ease-out active:scale-[0.96] disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
            )}
          >
            {/* Warna hijau naik dari dasar tombol saat sudah di-upvote. */}
            <span
              aria-hidden="true"
              className={cn(
                '-z-10 absolute inset-0 origin-bottom bg-hijau-terang transition-transform duration-[380ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
                sudahMemilih ? 'scale-y-100' : 'scale-y-0',
              )}
            />
            {hasVotedQuery.isPending ? (
              <>
                <Spinner /> Memeriksa
              </>
            ) : (
              <>
                <span
                  key={String(sudahMemilih)}
                  className={sudahMemilih ? 'upvote-lompat' : undefined}
                >
                  <Icon name="panah-atas" size={18} filled={sudahMemilih} />
                </span>
                <span className="relative grid overflow-hidden">
                  <span
                    className={cn(
                      'col-start-1 row-start-1 whitespace-nowrap transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
                      sudahMemilih && '-translate-y-full opacity-0',
                    )}
                  >
                    Beri upvote
                  </span>
                  <span
                    aria-hidden={!sudahMemilih}
                    className={cn(
                      'col-start-1 row-start-1 whitespace-nowrap transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
                      !sudahMemilih && 'translate-y-full opacity-0',
                    )}
                  >
                    Batalkan upvote
                  </span>
                </span>
              </>
            )}
          </button>
        ) : (
          <Link to="/login" className={buttonClass('outline', 'md', 'border-transparent')}>
            Masuk untuk meng-upvote
          </Link>
        )}
      </div>
    </HeroCard>
  );
}
