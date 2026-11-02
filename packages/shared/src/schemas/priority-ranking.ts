import { z } from 'zod';

export const priorityRankingItemSchema = z.object({
  kategori: z.string().min(1),
  posisi: z.number().int().min(1).max(10),
});

/** Validasi bentuk; keanggotaan kategori tetap diperiksa oleh database. */
export const priorityRankingPayloadSchema = z
  .array(priorityRankingItemSchema)
  .length(10)
  .superRefine((items, ctx) => {
    if (new Set(items.map((item) => item.kategori)).size !== items.length) {
      ctx.addIssue({ code: 'custom', message: 'Kategori tidak boleh duplikat.' });
    }
    if (new Set(items.map((item) => item.posisi)).size !== items.length) {
      ctx.addIssue({ code: 'custom', message: 'Posisi tidak boleh duplikat.' });
    }
  });

export const priorityRankingSummarySchema = z.object({
  kategori: z.string(),
  skor: z.coerce.number().int().nonnegative(),
  jumlah_partisipan: z.coerce.number().int().min(2),
});

export type PriorityRankingItem = z.infer<typeof priorityRankingItemSchema>;
export type PriorityRankingSummary = z.infer<typeof priorityRankingSummarySchema>;
