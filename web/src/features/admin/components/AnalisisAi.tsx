import { useQuery } from '@tanstack/react-query';
import { getAiReview } from '../ai-api';
import { LABEL_INDIKASI } from './labelIndikasi';

const labels: Record<string, string> = {
  not_analyzed: 'Belum dianalisis',
  pending: 'Menunggu',
  processing: 'Sedang diproses',
  completed: 'Selesai',
  failed: 'Gagal',
  stale: 'Perlu analisis ulang',
};

/**
 * Hasil analisis MusrenAI untuk satu usulan, hanya dibaca. Analisisnya dijalankan sekaligus untuk
 * banyak usulan dari kartu Antrean tinjau, jadi kartu rincian tidak punya tombolnya sendiri.
 */
export function AnalisisAi({ proposalId }: { proposalId: number }) {
  const review = useQuery({
    queryKey: ['admin', 'ai-review', proposalId] as const,
    queryFn: () => getAiReview(proposalId),
    retry: false,
    staleTime: 30_000,
  });
  return (
    <section className="mt-4 border-t border-rule pt-3 text-sm" aria-label="Analisis MusrenAI">
      <h4 className="font-bold">Analisis MusrenAI</h4>
      <p className="mt-0.5 text-[12px] text-muted">
        Saran AI hanya membantu pemeriksaan. Keputusan tetap oleh admin.
      </p>
      {review.isPending && <p className="mt-1 text-muted">Memuat analisis...</p>}
      {review.isError && <p className="mt-1 text-muted">Analisis belum tersedia.</p>}
      {review.isSuccess && (!review.data || review.data.state === 'not_analyzed') && (
        <p className="mt-1 text-muted">
          Belum dianalisis. Jalankan Analisis AI dari kartu Antrean tinjau.
        </p>
      )}
      {review.data && review.data.state !== 'not_analyzed' && (
        <>
          <p className="mt-1">Status: {labels[review.data.state]}</p>
          {review.data.state === 'completed' && (
            <>
              <p>
                Indikasi:{' '}
                {review.data.flags.length
                  ? review.data.flags.map((flag) => LABEL_INDIKASI[flag]).join(', ')
                  : 'Tidak ditemukan'}
              </p>
              <p>Alasan: {review.data.reason}</p>
            </>
          )}
        </>
      )}
    </section>
  );
}
