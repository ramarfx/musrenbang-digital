import { proposalStatusUpdateSchema } from '@musrenbang/shared';
import { parseWith, toAppError } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export async function updateProposalStatus(input: unknown) {
  const parsed = parseWith(proposalStatusUpdateSchema, input, 'perubahan status');
  const { error } = await supabase.rpc('change_proposal_status', {
    p_proposal_id: parsed.proposalId,
    p_status: parsed.status,
  });
  if (error) throw toAppError(error, 'Gagal mengubah status usulan.');
}
