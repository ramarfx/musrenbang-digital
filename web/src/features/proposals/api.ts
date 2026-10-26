import { proposalInputSchema, proposalSchema, statusHistorySchema } from '@musrenbang/shared';
import { z } from 'zod';
import { AppError, parseWith, requireUser, toAppError, unwrap } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export async function listProposals() {
  const data = await unwrap(
    supabase.from('v_proposals').select('*').order('dibuat_pada', { ascending: false }),
    'daftar usulan',
  );
  return parseWith(z.array(proposalSchema), data, 'daftar usulan');
}

export async function getProposal(proposalId: number) {
  const { data, error } = await supabase
    .from('v_proposals')
    .select('*')
    .eq('id', proposalId)
    .maybeSingle();
  if (error) throw toAppError(error, 'Gagal memuat usulan.');
  if (!data) return null;
  return parseWith(proposalSchema, data, 'usulan');
}

export async function createProposal(input: unknown) {
  const user = await requireUser();
  const parsed = parseWith(proposalInputSchema, input, 'usulan baru');
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      judul: parsed.judul,
      deskripsi: parsed.deskripsi,
      kategori: parsed.kategori,
      lokasi: parsed.lokasi ?? null,
      latitude: parsed.latitude ?? null,
      longitude: parsed.longitude ?? null,
      estimasi_biaya: parsed.estimasi_biaya,
      pengusul_id: user.id,
    })
    .select('id')
    .single();
  if (error) throw toAppError(error, 'Gagal menyimpan usulan.');
  const id = parseWith(z.object({ id: z.coerce.number().int().positive() }), data, 'id usulan');
  return id.id;
}

export async function listStatusHistory(proposalId: number) {
  const data = await unwrap(
    supabase
      .from('v_proposal_status_history')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('diubah_pada', { ascending: true }),
    'riwayat status',
  );
  return parseWith(z.array(statusHistorySchema), data, 'riwayat status');
}

export async function hasVoted(proposalId: number, userId: string) {
  const { data, error } = await supabase
    .from('votes')
    .select('id')
    .eq('proposal_id', proposalId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw toAppError(error, 'Gagal memeriksa suara.');
  return Boolean(data);
}

export async function toggleVote(proposalId: number, currentlyVoted: boolean) {
  const user = await requireUser();
  if (currentlyVoted) {
    const { error } = await supabase
      .from('votes')
      .delete()
      .eq('proposal_id', proposalId)
      .eq('user_id', user.id);
    if (error) throw toAppError(error, 'Gagal membatalkan suara.');
    return false;
  }

  const { error } = await supabase.from('votes').insert({
    user_id: user.id,
    proposal_id: proposalId,
  });
  if (error) {
    if (error.code === '23505') {
      throw new AppError('Kamu sudah memberi suara untuk usulan ini.');
    }
    throw toAppError(error, 'Gagal memberi suara.');
  }
  return true;
}
