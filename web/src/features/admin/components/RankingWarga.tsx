import { useAdminRankingQuery } from '@/features/ranking/queries';
import { RankingWargaIsi } from './RankingWargaIsi';

/**
 * Ranking bidang menurut urutan prioritas semua warga, hanya untuk admin. Dipakai sebagai
 * pembanding kedua kalau dua program punya selisih yang sama di Bandingkan: yang lebih sering
 * ditaruh di atas oleh warga lebih didahulukan. Skor tidak dijumlah dengan angka Bandingkan.
 */
export function RankingWarga() {
  const query = useAdminRankingQuery(true);
  return (
    <RankingWargaIsi baris={query.data ?? []} memuat={query.isPending} galat={query.isError} />
  );
}
