import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { getAiReview, analyzeProposal } from '../ai-api';

const labels: Record<string, string> = {
  not_analyzed: 'Belum dianalisis',
  pending: 'Menunggu',
  processing: 'Sedang diproses',
  completed: 'Selesai',
  failed: 'Gagal',
  stale: 'Perlu analisis ulang',
};

export function AnalisisAi({ proposalId }: { proposalId: number }) {
  const client = useQueryClient();
  const queryKey = ['admin', 'ai-review', proposalId] as const;
  const review = useQuery({ queryKey, queryFn: () => getAiReview(proposalId), retry: false });
  const mutation = useMutation({
    mutationFn: () => analyzeProposal(proposalId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey });
    },
  });
  return (
    <section className="mt-4 border-t border-rule pt-3 text-sm" aria-label="Analisis MusrenAI">
      <h4 className="font-bold">Analisis MusrenAI</h4>
      <p className="mt-1 text-muted">
        Saran AI hanya membantu pemeriksaan. Keputusan tetap oleh admin.
      </p>
      {review.isPending && <p>Memuat analisis...</p>}
      {review.isError && <p role="alert">Analisis belum tersedia.</p>}
      {review.data && (
        <>
          <p className="mt-2">Status: {labels[review.data.state]}</p>
          {review.data.state === 'completed' && (
            <>
              <p>
                Indikasi:{' '}
                {review.data.flags.length ? review.data.flags.join(', ') : 'Tidak ditemukan'}
              </p>
              <p>Alasan: {review.data.reason}</p>
              <p className="text-muted">
                Model: {review.data.model ?? '-'} ·{' '}
                {review.data.updated_at
                  ? new Date(review.data.updated_at).toLocaleString('id-ID')
                  : '-'}
              </p>
            </>
          )}
        </>
      )}
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
      {mutation.data === 'stale' && (
        <p role="alert">Usulan berubah saat dianalisis. Silakan analisis ulang.</p>
      )}
      <Button
        className="mt-2"
        size="sm"
        variant="outline"
        isLoading={mutation.isPending}
        disabled={review.isPending || review.data?.state === 'processing'}
        onClick={() => mutation.mutate()}
      >
        Analisis AI
      </Button>
    </section>
  );
}
