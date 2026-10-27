import {
  adminStatsSchema,
  proposalModerationInputSchema,
  proposalStatusUpdateWithNoteSchema,
} from '@musrenbang/shared';
import { AppError, parseWith, toAppError } from '@/lib/api';
import { supabase } from '@/lib/supabase';

/** Kode galat PostgREST saat fungsi database belum ada (migrasi belum dipasang). */
const FUNGSI_TIDAK_ADA = 'PGRST202';

/**
 * Mengubah status kemajuan usulan dengan catatan admin yang wajib (kontrak migrasi 7).
 * Tidak ada cadangan ke fungsi lama tanpa catatan: itu akan melewati syarat audit.
 */
export async function updateProposalStatus(input: unknown) {
  const parsed = parseWith(proposalStatusUpdateWithNoteSchema, input, 'perubahan status');
  const { error } = await supabase.rpc('change_proposal_status_with_note', {
    p_proposal_id: parsed.proposalId,
    p_status: parsed.status,
    p_catatan: parsed.catatan,
  });
  if (error) {
    if (error.code === FUNGSI_TIDAK_ADA) {
      throw new AppError(
        'Perubahan status bercatatan belum tersedia di server (migrasi ke-7 belum dipasang).',
        { cause: error, code: error.code },
      );
    }
    throw toAppError(error, 'Gagal mengubah status usulan.');
  }
}

/** Menyetujui, menolak (dengan alasan wajib), atau mengembalikan usulan ke Menunggu. */
export async function moderateProposal(input: unknown) {
  const parsed = parseWith(proposalModerationInputSchema, input, 'moderasi usulan');
  const { error } = await supabase.rpc('moderate_proposal', {
    p_proposal_id: parsed.proposalId,
    p_moderasi: parsed.moderasi,
    p_catatan: parsed.catatan ?? null,
  });
  if (error) throw toAppError(error, 'Gagal memoderasi usulan.');
}

/** Statistik operasional admin. Kosong (bukan galat) untuk non-admin, atau view belum dipasang. */
export async function getAdminStats() {
  const { data, error } = await supabase.from('v_admin_stats').select('*');
  if (error) throw toAppError(error, 'Gagal memuat statistik admin.');
  const baris = Array.isArray(data) ? data[0] : data;
  if (!baris) return null;
  return parseWith(adminStatsSchema, baris, 'statistik admin');
}
