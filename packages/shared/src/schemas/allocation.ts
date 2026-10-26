import { z } from 'zod';
import { ALLOCATION_STEP, DEFAULT_VIRTUAL_BUDGET } from '../constants';
import { uuidSchema } from './common';

/** Satu baris alokasi seperti yang dibaca dari tabel `allocations`. */
export const allocationRowSchema = z.object({
  user_id: uuidSchema,
  kategori: z.string().min(1),
  jumlah: z.coerce.number().int().nonnegative(),
});

export const allocationAmountSchema = z.object({
  kategori: z.string().min(1),
  jumlah: z.number().int().nonnegative(),
});

/** Baris alokasi yang dibaca dari PostgREST (bigint bisa datang sebagai string). */
export const allocationReadSchema = z.object({
  kategori: z.string().min(1),
  jumlah: z.coerce.number().int().nonnegative(),
});

export const allocationPayloadSchema = z
  .array(allocationAmountSchema)
  .min(1, 'Pilih minimal satu kategori.')
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.kategori)) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'kategori'],
          message: `Kategori "${item.kategori}" muncul lebih dari sekali.`,
        });
      }
      seen.add(item.kategori);
    });
  });

/** Validasi total terhadap anggaran virtual (nilai bisa berasal dari tabel config). */
export function createBudgetAllocationSchema(budget: number = DEFAULT_VIRTUAL_BUDGET) {
  return allocationPayloadSchema.superRefine((items, ctx) => {
    const total = totalAllocation(items);
    if (total > budget) {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: `Total alokasi melebihi anggaran virtual (maksimal ${budget.toLocaleString('id-ID')}).`,
      });
    }
  });
}

export function totalAllocation(items: readonly { jumlah: number }[]): number {
  return items.reduce((sum, item) => sum + item.jumlah, 0);
}

/** Alokasi merata untuk slider awal; sisa pembulatan diberikan ke kategori pertama. */
export function evenAllocation(categories: readonly string[], budget: number): AllocationAmount[] {
  if (categories.length === 0) return [];
  const perKategori = Math.floor(budget / categories.length / ALLOCATION_STEP) * ALLOCATION_STEP;
  const sisa = budget - perKategori * categories.length;
  return categories.map((kategori, index) => ({
    kategori,
    jumlah: index === 0 ? perKategori + sisa : perKategori,
  }));
}

export type AllocationRow = z.infer<typeof allocationRowSchema>;
export type AllocationAmount = z.infer<typeof allocationAmountSchema>;
export type AllocationRead = z.infer<typeof allocationReadSchema>;
