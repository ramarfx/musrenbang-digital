import { publicStatsSchema } from '@musrenbang/shared';
import { parseWith, toAppError } from '@/lib/api';
import { supabase } from '@/lib/supabase';

/**
 * Statistik publik dari view `v_public_stats` (migrasi 7). View mengembalikan satu baris.
 * Kalau view belum ada di server, pemanggil jatuh ke hitungan dari daftar usulan.
 */
export async function getPublicStats() {
  const { data, error } = await supabase.from('v_public_stats').select('*');
  if (error) throw toAppError(error, 'Gagal memuat statistik.');
  const baris = Array.isArray(data) ? data[0] : data;
  if (!baris) return null;
  return parseWith(publicStatsSchema, baris, 'statistik publik');
}
