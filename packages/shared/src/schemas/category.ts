import { z } from 'zod';

export const categorySchema = z.object({
  id: z.coerce.number().int().positive(),
  nama: z.string().min(1),
});

export type Category = z.infer<typeof categorySchema>;
