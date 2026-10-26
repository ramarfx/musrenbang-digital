import { z } from 'zod';
import { supabase } from './supabase';

type SupabaseErrorLike = {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
};

export class AppError extends Error {
  readonly code?: string;

  constructor(message: string, options?: { cause?: unknown; code?: string }) {
    super(message, options);
    this.name = 'AppError';
    this.code = options?.code;
  }
}

function isSupabaseError(value: unknown): value is SupabaseErrorLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  );
}

export function toAppError(error: unknown, fallback: string): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof z.ZodError) {
    const detail = error.issues
      .map((issue) => `${issue.path.join('.') || 'data'}: ${issue.message}`)
      .join('; ');
    return new AppError(detail || fallback, { cause: error });
  }

  if (isSupabaseError(error)) {
    return new AppError(error.message || fallback, { cause: error, code: error.code });
  }

  if (error instanceof Error) {
    return new AppError(error.message || fallback, { cause: error });
  }

  return new AppError(fallback, { cause: error });
}

/** Validasi data dari Supabase sebelum masuk ke state React. */
export function parseWith<T extends z.ZodType>(
  schema: T,
  data: unknown,
  label: string,
): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw toAppError(result.error, `Data ${label} tidak sesuai skema.`);
  }
  return result.data;
}

/** Ambil data yang wajib ada; lempar AppError bila error atau kosong. */
export async function unwrap<T>(
  result: PromiseLike<{ data: T | null; error: SupabaseErrorLike | null }>,
  label: string,
): Promise<T> {
  const { data, error } = await result;
  if (error) throw toAppError(error, `Gagal memuat ${label}.`);
  if (data === null) throw new AppError(`Data ${label} tidak ditemukan.`);
  return data;
}

/** Jalankan perintah (insert/update/rpc) yang tidak mengembalikan baris. */
export async function run(
  result: PromiseLike<{ error: SupabaseErrorLike | null }>,
  fallback: string,
): Promise<void> {
  const { error } = await result;
  if (error) throw toAppError(error, fallback);
}

/** Pastikan ada sesi login; dipakai semua mutation yang menulis data. */
export async function requireUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new AppError('Silakan masuk terlebih dahulu.', { cause: error, code: 'UNAUTHORIZED' });
  }
  return user;
}
