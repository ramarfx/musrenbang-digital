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

export type StatusChange = z.infer<typeof statusHistorySchema> & { judul: string };

/**
 * Perubahan status pada usulan milik pengguna, terbaru dulu. Pembuatan usulan (status lama
 * kosong) tidak dihitung karena pembuatnya sudah tahu. Dibaca dari view publik yang sama
 * dengan linimasa, jadi tidak butuh tabel baru.
 */
export async function listMyStatusChanges(userId: string): Promise<StatusChange[]> {
  const mine = await unwrap(
    supabase.from('v_proposals').select('id, judul').eq('pengusul_id', userId),
    'usulanku',
  );
  const proposals = parseWith(
    z.array(z.object({ id: z.coerce.number().int(), judul: z.string() })),
    mine,
    'usulanku',
  );
  if (proposals.length === 0) return [];
  const data = await unwrap(
    supabase
      .from('v_proposal_status_history')
      .select('*')
      .in(
        'proposal_id',
        proposals.map((item) => item.id),
      )
      .not('status_lama', 'is', null)
      .order('diubah_pada', { ascending: false })
      .limit(30),
    'perubahan status',
  );
  const rows = parseWith(z.array(statusHistorySchema), data, 'perubahan status');
  const judul = new Map(proposals.map((item) => [item.id, item.judul]));
  return rows.map((row) => ({ ...row, judul: judul.get(row.proposal_id) ?? 'Usulanmu' }));
}

/** Id semua usulan yang sudah didukung pengguna ini, dalam satu permintaan. */
export async function listMyVotes(userId: string) {
  const data = await unwrap(
    supabase.from('votes').select('proposal_id').eq('user_id', userId),
    'daftar suara',
  );
  return parseWith(
    z.array(z.object({ proposal_id: z.coerce.number().int() })),
    data,
    'daftar suara',
  ).map((row) => row.proposal_id);
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
