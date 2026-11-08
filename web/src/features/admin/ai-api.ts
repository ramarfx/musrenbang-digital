import { aspirationOverviewRowSchema, type AspirationOverviewRow } from '@musrenbang/shared';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { parseWith, toAppError } from '@/lib/api';

const reviewSchema = z.object({
  state: z.enum(['not_analyzed', 'pending', 'processing', 'completed', 'failed', 'stale']),
  flags: z.array(z.enum(['spam', 'promotion', 'irrelevant', 'needs_review'])),
  reason: z.string().nullable(),
  model: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export async function getAiReview(proposalId: number) {
  const { data, error } = await supabase.rpc('get_proposal_ai_review', {
    p_proposal_id: proposalId,
  });
  if (error) throw toAppError(error, 'Gagal memuat analisis AI.');
  return data?.[0] ? parseWith(reviewSchema, data[0], 'analisis AI') : null;
}

export async function analyzeProposal(proposalId: number) {
  const { data, error } = await supabase.functions.invoke('admin-ai-triage', {
    body: { proposal_id: proposalId },
  });
  if (error) throw new Error('Analisis AI tidak tersedia. Silakan coba lagi.');
  if (!data || !['completed', 'stale'].includes(data.state))
    throw new Error('Analisis AI belum selesai.');
  return data.state as 'completed' | 'stale';
}

/* ---------- Ringkasan aspirasi (admin) ---------- */

/** Ringkasan per bidang dari view `v_aspiration_overview`: dihitung database, tanpa AI. */
export async function getRingkasanAspirasi(): Promise<AspirationOverviewRow[]> {
  const { data, error } = await supabase.from('v_aspiration_overview').select('*');
  if (error) throw toAppError(error, 'Ringkasan aspirasi gagal dimuat.');
  return parseWith(z.array(aspirationOverviewRowSchema), data ?? [], 'ringkasan aspirasi');
}
