import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { getAiReview } from '../ai-api';
import { LABEL_INDIKASI } from './labelIndikasi';

/**
 * Hasil MusrenAI untuk satu usulan, diletakkan tepat di atas tombol Setujui dan Tolak supaya
 * dibaca sebelum memutuskan. Pemeriksaannya dijalankan dari kartu Antrean tinjau; saat hasil
 * baru tiba untuk usulan yang sedang dibuka, kotaknya menyala sebentar sebagai penanda.
 */
export function AnalisisAi({ proposalId }: { proposalId: number }) {
  const review = useQuery({
    queryKey: ['admin', 'ai-review', proposalId] as const,
    queryFn: () => getAiReview(proposalId),
    retry: false,
    staleTime: 30_000,
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

  let judul = 'Belum diperiksa';
  let isi: string | null = 'Tekan Periksa di kartu Antrean tinjau.';
  if (review.isPending) {
    judul = 'Memuat hasil...';
    isi = null;
  } else if (review.isError) {
    judul = 'Hasil belum tersedia';
    isi = null;
  } else if (data?.state === 'pending' || data?.state === 'processing') {
    judul = 'Sedang memeriksa...';
    isi = null;
  } else if (data?.state === 'failed') {
    judul = 'Pemeriksaan gagal';
    isi = 'Coba periksa lagi dari kartu Antrean tinjau.';
  } else if (data?.state === 'stale') {
    judul = 'Perlu diperiksa ulang';
    isi = 'Isi usulan berubah sejak terakhir diperiksa.';
  } else if (selesai) {
    judul = ditandai ? data.flags.map((flag) => LABEL_INDIKASI[flag]).join(', ') : 'Tanpa indikasi';
    isi = data.reason;
  }

  return (
    <section
      key={nyala}
      aria-label="Hasil MusrenAI"
      className={cn(
        'mt-3 rounded-xl px-3.5 py-2.5 text-[13px]',
        ditandai ? 'bg-[#FBE3DF]' : 'bg-active',
        nyala > 0 && 'anim-sorot',
      )}
    >
      <p className="font-bold">
        <span className="text-muted">MusrenAI:</span> {judul}
      </p>
      {isi && <p className="mt-0.5 text-ink/80">{isi}</p>}
      <p className="mt-1 text-[11.5px] text-muted">
        Saran AI hanya membantu pemeriksaan. Keputusan tetap oleh admin.
      </p>
    </section>
  );
}
