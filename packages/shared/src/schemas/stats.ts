import { z } from 'zod';
import { PROPOSAL_MODERATION_STATUSES, PROPOSAL_STATUSES } from '../constants';

const countSchema = z.coerce.number().int().nonnegative();

const proposalStatusCountsSchema = z.object(
  Object.fromEntries(PROPOSAL_STATUSES.map((status) => [status, countSchema])) as Record<
    (typeof PROPOSAL_STATUSES)[number],
    typeof countSchema
  >,
);

const moderationStatusCountsSchema = z.object(
  Object.fromEntries(PROPOSAL_MODERATION_STATUSES.map((status) => [status, countSchema])) as Record<
    (typeof PROPOSAL_MODERATION_STATUSES)[number],
    typeof countSchema
  >,
);

export const publicStatsSchema = z.object({
  jumlah_usulan_disetujui: countSchema,
  jumlah_pemberi_suara: countSchema,
  jumlah_partisipan_alokasi: countSchema,
  total_alokasi_warga: countSchema,
});

export const adminStatsSchema = z.object({
  total_pengguna: countSchema,
  total_usulan: countSchema,
  usulan_per_status: proposalStatusCountsSchema,
  usulan_per_moderasi: moderationStatusCountsSchema,
  total_suara: countSchema,
  jumlah_partisipan_alokasi: countSchema,
  total_alokasi_warga: countSchema,
});

export type PublicStats = z.infer<typeof publicStatsSchema>;
export type AdminStats = z.infer<typeof adminStatsSchema>;
