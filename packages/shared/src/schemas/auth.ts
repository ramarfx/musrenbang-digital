import { z } from 'zod';
import { TEXT_LIMITS } from '../constants';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email wajib diisi.')
  .email('Format email tidak valid.');

const passwordSchema = z
  .string()
  .min(8, 'Password minimal 8 karakter.')
  .max(72, 'Password maksimal 72 karakter.');

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(TEXT_LIMITS.namaMin, `Nama minimal ${TEXT_LIMITS.namaMin} karakter.`)
    .max(TEXT_LIMITS.namaMaks, `Nama maksimal ${TEXT_LIMITS.namaMaks} karakter.`),
  email: emailSchema,
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
