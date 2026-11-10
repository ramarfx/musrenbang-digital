import {
  proposalSpendingSchema,
  spendingInputSchema,
  type ProposalSpending,
} from '@musrenbang/shared';
import { z } from 'zod';
import { parseWith, requireUser, toAppError, unwrap } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export async function listSpending(proposalId: number): Promise<ProposalSpending[]> {
  const data = await unwrap(
    supabase
      .from('proposal_spending')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('dicatat_pada', { ascending: true }),
    'pengeluaran pengerjaan',
  );
  return parseWith(z.array(proposalSpendingSchema), data, 'pengeluaran pengerjaan');
}

/**
 * Mencatat satu pengeluaran. Koreksi disimpan sebagai jumlah minus, karena catatan tidak bisa
 * diubah atau dihapus. Database menolak bila status usulan belum Masuk APBD, atau bila koreksi
 * membuat total negatif; pesannya diteruskan apa adanya karena sudah berbahasa Indonesia.
 */
export async function catatPengeluaran(input: unknown) {
  await requireUser();
  const parsed = parseWith(spendingInputSchema, input, 'pengeluaran');
  const { error } = await supabase.from('proposal_spending').insert({
    proposal_id: parsed.proposalId,
    jumlah: parsed.koreksi ? -parsed.jumlah : parsed.jumlah,
    keterangan: parsed.keterangan,
    sumber: parsed.sumber && parsed.sumber.length > 0 ? parsed.sumber : null,
  });
  if (error) throw toAppError(error, 'Gagal mencatat pengeluaran.');
}
