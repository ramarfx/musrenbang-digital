import { commentInputSchema, commentSchema } from '@musrenbang/shared';
import { z } from 'zod';
import { parseWith, requireUser, toAppError, unwrap } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export async function listComments(proposalId: number) {
  const data = await unwrap(
    supabase
      .from('v_comments')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('dibuat_pada', { ascending: true }),
    'komentar',
  );
  return parseWith(z.array(commentSchema), data, 'komentar');
}

export async function createComment(input: { proposalId: number; isi: string }) {
  const user = await requireUser();
  const parsed = parseWith(commentInputSchema, input, 'komentar');
  const { error } = await supabase.from('comments').insert({
    proposal_id: parsed.proposalId,
    user_id: user.id,
    isi: parsed.isi,
  });
  if (error) throw toAppError(error, 'Gagal mengirim komentar.');
}

/**
 * Jumlah komentar tiap usulan, dihitung dari satu permintaan ke v_comments (hanya kolom
 * proposal_id), supaya daftar usulan tidak meminta komentar satu per satu.
 */
export async function listCommentCounts(): Promise<Record<number, number>> {
  const data = await unwrap(supabase.from('v_comments').select('proposal_id'), 'jumlah komentar');
  const hasil: Record<number, number> = {};
  for (const baris of parseWith(z.array(z.object({ proposal_id: z.number() })), data, 'komentar')) {
    hasil[baris.proposal_id] = (hasil[baris.proposal_id] ?? 0) + 1;
  }
  return hasil;
}
