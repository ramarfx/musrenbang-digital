import {
  priorityRankingItemSchema,
  priorityRankingPayloadSchema,
  priorityRankingSummarySchema,
  type PriorityRankingItem,
} from '@musrenbang/shared';
import { z } from 'zod';
import { parseWith, requireUser, toAppError } from '@/lib/api';
import { supabase } from '@/lib/supabase';

/** Urutan prioritas milik pengguna yang sedang masuk, dari nomor 1. Kosong bila belum pernah menyimpan. */
export async function getMyRanking() {
  const { data, error } = await supabase.rpc('get_priority_rankings');
  if (error) throw toAppError(error, 'Gagal memuat urutan prioritasmu.');
  return parseWith(z.array(priorityRankingItemSchema), data ?? [], 'urutan prioritas');
}

/** Menyimpan urutan prioritas ke tabel urutan, terpisah dari pembagian anggaran. */
export async function saveMyRanking(items: PriorityRankingItem[]) {
  await requireUser();
  const payload = parseWith(priorityRankingPayloadSchema, items, 'urutan prioritas');
  const { error } = await supabase.rpc('save_priority_rankings', { p_rows: payload });
  if (error) throw toAppError(error, 'Gagal menyimpan urutan prioritas.');
}

/**
 * Rangkuman urutan semua warga, hanya untuk admin. Kosong bila partisipan kurang dari dua:
 * server sengaja tidak memberi agregat supaya pilihan satu orang tidak terbaca darinya.
 */
export async function getAdminRankingSummary() {
  const { data, error } = await supabase.rpc('get_priority_ranking_summary');
  if (error) throw toAppError(error, 'Gagal memuat ranking warga.');
  return parseWith(z.array(priorityRankingSummarySchema), data ?? [], 'ranking warga');
}
