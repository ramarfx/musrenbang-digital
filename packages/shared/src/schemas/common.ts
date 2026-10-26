import { z } from 'zod';

/** ID numerik dari PostgREST (kadang dikirim sebagai string untuk bigint). */
export const idSchema = z.coerce.number().int().positive('ID tidak valid.');

export const uuidSchema = z.string().uuid('UUID tidak valid.');

/** Timestamp ISO dari Postgres. Tidak divalidasi ketat agar tahan perbedaan format zona waktu. */
export const timestampSchema = z.string().min(1);

export const countSchema = z.coerce.number().int().nonnegative();
