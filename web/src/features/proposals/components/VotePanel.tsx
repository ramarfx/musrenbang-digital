import type { Proposal } from '@musrenbang/shared';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth';
import { formatAngka } from '@/lib/format';
import { useHasVotedQuery, useToggleVoteMutation } from '../queries';

export function VotePanel({ proposal }: { proposal: Proposal }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const hasVotedQuery = useHasVotedQuery(proposal.id, userId);
  const mutation = useToggleVoteMutation(proposal.id, userId);
  const sudahMemilih = hasVotedQuery.data ?? false;

  return (
    <Card className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-lg font-bold text-stone-900">
          {formatAngka(proposal.jumlah_suara)} suara warga
        </p>
        <p className="text-sm text-stone-500">
          Satu akun satu suara. Suara bisa dibatalkan kapan saja.
        </p>
        {mutation.error && <p className="mt-1 text-sm text-red-700">{mutation.error.message}</p>}
      </div>

      {user ? (
        <Button
          type="button"
          variant={sudahMemilih ? 'outline' : 'primary'}
          isLoading={mutation.isPending}
          disabled={hasVotedQuery.isPending}
          onClick={() => {
            mutation.mutate(sudahMemilih, {
              onSuccess: (sekarangMemilih) => {
                toast.success(sekarangMemilih ? 'Suara tercatat.' : 'Suara dibatalkan.');
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
            'Batalkan suara'
          ) : (
            'Beri suara'
          )}
        </Button>
      ) : (
        <Link to="/login" className="text-sm font-medium text-emerald-800 underline">
          Masuk untuk memberi suara
        </Link>
      )}
    </Card>
  );
}
