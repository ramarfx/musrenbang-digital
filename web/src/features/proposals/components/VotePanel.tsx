import type { Proposal } from '@musrenbang/shared';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Button, buttonClass } from '@/components/ui/Button';
import { HeroCard } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth';
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
        {formatAngka(proposal.jumlah_suara)}
        <small className="ml-1.5 text-base font-medium tracking-normal text-white/75">suara</small>
      </p>
      <p className="mt-3 text-[13px] text-white/75">
        Satu akun satu upvote, dan bisa dibatalkan kapan saja.
      </p>
      {mutation.error && <p className="mt-2 text-sm text-white">{mutation.error.message}</p>}

      <div className="mt-auto pt-5">
        {user ? (
          <Button
            type="button"
            variant="outline"
            className="border-transparent"
            isLoading={mutation.isPending}
            disabled={hasVotedQuery.isPending}
            onClick={() => {
              mutation.mutate(sudahMemilih, {
                onSuccess: (sekarangMemilih) => {
                  toast.success(sekarangMemilih ? 'Upvote tercatat.' : 'Upvote dibatalkan.');
                },
                onError: (error) => toast.error(error.message),
              });
            }}
          >
            {hasVotedQuery.isPending ? (
              <>
                <Spinner /> Memeriksa
              </>
            ) : sudahMemilih ? (
              'Batalkan upvote'
            ) : (
              'Beri upvote'
            )}
          </Button>
        ) : (
          <Link to="/login" className={buttonClass('outline', 'md', 'border-transparent')}>
            Masuk untuk meng-upvote
          </Link>
        )}
      </div>
    </HeroCard>
  );
}
