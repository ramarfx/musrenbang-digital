import { webEnvSchema } from '@musrenbang/shared';

const result = webEnvSchema.safeParse(import.meta.env);

if (!result.success) {
  const detail = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');
  throw new Error(
    `Konfigurasi environment frontend tidak valid:\n${detail}\n\nSalin web/.env.example menjadi web/.env lalu isi dari Dashboard Supabase.`,
  );
}

export const env = result.data;
