import { z } from 'zod';
import { APBD_VERIFICATION_STATUSES } from '../constants';
import { idSchema, timestampSchema, uuidSchema } from './common';

export const apbdVerificationSchema = z.enum(APBD_VERIFICATION_STATUSES);

export const apbdItemSchema = z.object({
  id: idSchema,
  kategori: z.string().min(1),
  nominal_rp: z.coerce.number().int().nonnegative(),
  tahun: z.coerce.number().int(),
  kota: z.string(),
  sumber: z.string(),
  status_verifikasi: apbdVerificationSchema,
  dibuat_pada: timestampSchema,
  diubah_pada: timestampSchema,
});

export const apbdInputSchema = z.object({
  kategori: z.string().trim().min(1, 'Kategori wajib dipilih.'),
  nominal_rp: z.number().int().nonnegative('Nominal tidak boleh negatif.'),
  tahun: z.number().int().min(2000).max(2100),
  kota: z.string().trim().min(1, 'Kota wajib diisi.'),
  sumber: z.string().trim().max(500).default(''),
  status_verifikasi: apbdVerificationSchema.default('perlu_lampiran'),
});

export type ApbdItem = z.infer<typeof apbdItemSchema>;
export type ApbdInput = z.infer<typeof apbdInputSchema>;

/** Tipe minimal untuk seed sebelum id/timestamp dibuat database. */
export const apbdSeedSchema = z.object({
  kategori: z.string().trim().min(1),
  nominal_rp: z.number().int().nonnegative(),
  tahun: z.number().int().min(2000).max(2100),
  kota: z.string().trim().min(1),
  sumber: z.string().default(''),
  status_verifikasi: apbdVerificationSchema.default('perlu_lampiran'),
});

export type ApbdSeed = z.infer<typeof apbdSeedSchema>;

/** Profil ringkas yang aman ditampilkan di komentar/riwayat (tanpa email). */
export const publicProfileSchema = z.object({
  id: uuidSchema,
  nama: z.string(),
});

export type PublicProfile = z.infer<typeof publicProfileSchema>;
