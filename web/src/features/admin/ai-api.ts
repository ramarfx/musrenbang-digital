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

const statistikSchema = z.object({
  total: z.number(),
  categories: z.record(z.string(), z.number()),
  moderation: z.record(z.string(), z.number()),
  analysis: z.record(z.string(), z.number()),
  indicated: z.number(),
});

const narasiSchema = z.object({
  themes: z.array(
    z.object({
      topic: z.string(),
      explanation: z.string(),
      source_ids: z.array(z.number()),
    }),
  ),
  limitations: z.string(),
});

const ringkasanSchema = z.object({
  summary_id: z.number(),
  state: z.enum(['pending', 'processing', 'completed', 'failed']),
  stale: z.boolean(),
  coverage: z.enum(['complete', 'sample']),
  statistics: statistikSchema,
  sources: z.array(z.object({ id: z.number() }).passthrough()),
  narrative: narasiSchema.nullable(),
});

export type RingkasanAspirasi = z.output<typeof ringkasanSchema>;

const permintaanSchema = z.object({
  summary_id: z.number(),
  state: z.enum(['pending', 'processing', 'completed', 'failed']),
});

/** Fungsi ringkasan belum ada di tipe database bersama, jadi dipanggil tanpa tipe. */
type PanggilRpc = (
  nama: string,
  argumen?: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: unknown }>;
const panggilRpc: PanggilRpc = (nama, argumen) =>
  (supabase.rpc as unknown as PanggilRpc).call(supabase, nama, argumen);

/** Batas hari dibulatkan supaya permintaan berulang di hari yang sama memakai ringkasan yang sama. */
function periodeRingkasan(hari: number) {
  const sampai = new Date();
  sampai.setHours(24, 0, 0, 0);
  const dari = new Date(sampai);
  dari.setDate(dari.getDate() - hari);
  return { dari: dari.toISOString(), sampai: sampai.toISOString() };
}

/** Meminta ringkasan usulan yang masih menunggu dalam 30 hari terakhir; hasilnya dibaca lewat id. */
export async function requestRingkasan() {
  const { dari, sampai } = periodeRingkasan(30);
  const { data, error } = await panggilRpc('request_aspiration_summary', {
    p_from: dari,
    p_to: sampai,
    p_moderation: 'Menunggu',
    p_category: null,
  });
  if (error) throw toAppError(error, 'Ringkasan AI belum bisa diminta.');
  const baris = Array.isArray(data) ? data[0] : data;
  return parseWith(permintaanSchema, baris, 'permintaan ringkasan');
}

export async function getRingkasan(summaryId: number) {
  const { data, error } = await panggilRpc('get_aspiration_summary', { p_summary_id: summaryId });
  if (error) throw toAppError(error, 'Ringkasan AI gagal dimuat.');
  const baris = Array.isArray(data) ? data[0] : data;
  return parseWith(ringkasanSchema, baris, 'ringkasan AI');
}

export async function retryRingkasan(summaryId: number) {
  const { error } = await panggilRpc('retry_aspiration_summary', { p_summary_id: summaryId });
  if (error) throw toAppError(error, 'Gagal mengulang ringkasan.');
}
