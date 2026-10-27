import { z } from 'zod';

/** Baris view `v_gap`: agregat warga vs APBD per kategori. */
export const gapItemSchema = z.object({
  kategori: z.string().min(1),
  persen_warga: z.coerce.number(),
  persen_apbd: z.coerce.number(),
  gap_poin_persen: z.coerce.number(),
  nominal_apbd: z.coerce.number(),
  total_alokasi_warga: z.coerce.number(),
  // Field ini ditambahkan migration 7; respons remote enam migration tetap dapat dibaca.
  jumlah_partisipan: z.coerce.number().int().nonnegative().optional(),
  apbd_tersedia: z.boolean().optional(),
});

export type GapItem = z.infer<typeof gapItemSchema>;
