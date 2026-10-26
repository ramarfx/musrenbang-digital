import { z } from 'zod';
import { DEFAULT_VIRTUAL_BUDGET } from '../constants';

export const webEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL harus berupa URL Supabase.'),
  VITE_SUPABASE_ANON_KEY: z.string().min(20, 'VITE_SUPABASE_ANON_KEY belum diisi dengan benar.'),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export const seedEnvSchema = z.object({
  SUPABASE_URL: z.string().url('SUPABASE_URL harus berupa URL Supabase.'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20, 'SUPABASE_SERVICE_ROLE_KEY wajib diisi (hanya untuk seed).'),
  KOTA: z.string().trim().min(1).default('DKI Jakarta'),
  TAHUN_ANGGARAN: z.coerce.number().int().min(2000).max(2100).default(2026),
  VIRTUAL_BUDGET_PER_WARGA: z.coerce.number().int().positive().default(DEFAULT_VIRTUAL_BUDGET),
});

export type SeedEnv = z.infer<typeof seedEnvSchema>;
