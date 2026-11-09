import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { analyzeProposal, getAiReview } from '../ai-api';
import { LABEL_INDIKASI } from './labelIndikasi';

/**
 * Hasil MusrenAI untuk satu usulan, diletakkan di samping tombol keputusan supaya dibaca
 * sebelum memutuskan. Pemeriksaan bisa dijalankan dari sini tanpa kembali ke antrean.
 */
export function AnalisisAi({ proposalId }: { proposalId: number }) {
  const queryClient = useQueryClient();
  const review = useQuery({
    queryKey: ['admin', 'ai-review', proposalId] as const,
    queryFn: () => getAiReview(proposalId),
    retry: false,
    staleTime: 30_000,
  });

  const periksa = useMutation({
    mutationFn: () => analyzeProposal(proposalId),
    onSuccess: async () => {
      toast.success('Pemeriksaan MusrenAI selesai.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'ai-review', proposalId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Pemeriksaan MusrenAI tidak tersedia.');
    },
  });

  // Menyala hanya bila hasilnya berubah selagi usulan ini terbuka, bukan saat pertama dibuka.
  const terakhir = review.isSuccess ? `${review.data?.state}-${review.data?.updated_at}` : null;
  const sebelumnya = useRef<string | null>(null);
  const [nyala, setNyala] = useState(0);
  useEffect(() => {
    if (terakhir === null) return;
    if (sebelumnya.current !== null && sebelumnya.current !== terakhir) setNyala((n) => n + 1);
    sebelumnya.current = terakhir;
  }, [terakhir]);

  const data = review.data;
  const selesai = data?.state === 'completed';
  const ditandai = selesai && data.flags.length > 0;
  const bisaDiperiksa =
    !review.isPending &&
    !review.isError &&
    (!data || ['not_analyzed', 'stale', 'failed'].includes(data.state));

  let judul = 'Belum diperiksa';
  let isi: string | null = 'Jalankan pemeriksaan untuk melihat apakah ada indikasi masalah.';
  if (review.isPending) {
    judul = 'Memuat hasil...';
    isi = null;
  } else if (review.isError && !data) {
    judul = 'Hasil belum bisa dimuat';
    isi = 'Periksa koneksi, lalu muat ulang. Kamu tetap bisa memutuskan tanpa hasil ini.';
  } else if (data?.state === 'pending' || data?.state === 'processing') {
    judul = 'Sedang diperiksa...';
    isi = null;
  } else if (data?.state === 'failed') {
    judul = 'Pemeriksaan gagal';
    isi = 'Coba periksa lagi. Kalau tetap gagal, nilai usulan ini secara manual.';
  } else if (data?.state === 'stale') {
    judul = 'Perlu diperiksa ulang';
    isi = 'Isi usulan berubah sejak pemeriksaan terakhir.';
  } else if (selesai) {
    judul = ditandai ? 'Ada indikasi yang perlu dilihat' : 'Tidak ada indikasi';
    isi = data.reason;
  }

  return (
    <Card className={cn(nyala > 0 && 'anim-sorot')}>
      <h2 className="text-lg font-bold">Pemeriksaan MusrenAI</h2>
      <p className="mt-1 text-sm text-muted">
        Saran AI untuk membantu pemeriksaan. Keputusan tetap di tangan admin.
      </p>

      <div
        className={cn(
          'mt-3 rounded-xl px-3.5 py-3 text-sm',
          ditandai ? 'bg-[#FBE3DF] text-hitam' : 'bg-active text-ink',
        )}
      >
        <p className="font-bold">{judul}</p>
        {ditandai && (
          <p className="mt-1 font-semibold">
            {data.flags.map((flag) => LABEL_INDIKASI[flag]).join(', ')}
          </p>
        )}
        {isi && <p className={cn('mt-1', ditandai ? 'text-hitam/80' : 'text-ink/80')}>{isi}</p>}
      </div>

      {bisaDiperiksa && (
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full"
          isLoading={periksa.isPending}
          onClick={() => periksa.mutate()}
        >
          {periksa.isPending
            ? 'Memeriksa...'
            : data?.state === 'stale' || data?.state === 'failed'
              ? 'Periksa ulang'
              : 'Periksa dengan MusrenAI'}
        </Button>
      )}

      {review.isError && (
        <Button
          type="button"
          variant="ghost"
          className="mt-2 w-full"
          onClick={() => void review.refetch()}
        >
          Muat ulang hasil
        </Button>
      )}
    </Card>
  );
}
