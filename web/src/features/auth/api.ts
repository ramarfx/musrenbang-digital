import {
  loginSchema,
  profileSchema,
  registerSchema,
  type LoginInput,
  type Profile,
  type RegisterInput,
} from '@musrenbang/shared';
import type { User } from '@supabase/supabase-js';
import { AppError, parseWith, toAppError } from '@/lib/api';
import { supabase } from '@/lib/supabase';

function friendlyAuthError(error: unknown, fallback: string): AppError {
  const appError = toAppError(error, fallback);
  const message = appError.message;

  if (/invalid login credentials/i.test(message)) {
    return new AppError('Email atau password salah.', { cause: error });
  }
  if (/email not confirmed/i.test(message)) {
    return new AppError('Email belum dikonfirmasi. Cek inbox lalu coba lagi.', { cause: error });
  }
  if (/user already registered|already been registered/i.test(message)) {
    return new AppError('Email ini sudah terdaftar. Silakan masuk.', { cause: error });
  }
  if (/password should be at least/i.test(message)) {
    return new AppError('Password terlalu pendek. Gunakan minimal 8 karakter.', { cause: error });
  }
  return appError;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw friendlyAuthError(error, 'Gagal memuat sesi.');
  return data.session;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw toAppError(error, 'Gagal memuat profil.');
  if (!data) return null;
  return parseWith(profileSchema, data, 'profil');
}

function namaDariUser(user: User): string {
  const metadataNama = user.user_metadata?.nama;
  if (typeof metadataNama === 'string' && metadataNama.trim().length > 0) {
    return metadataNama.trim();
  }
  return user.email?.split('@')[0] ?? 'Warga';
}

/**
 * Trigger database sudah membuat profil saat sign up. Fungsi ini menjadi
 * jaring pengaman untuk akun lama yang dibuat sebelum trigger dipasang.
 */
async function ensureProfile(user: User): Promise<Profile> {
  const existing = await getProfile(user.id);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email ?? `${user.id}@unknown.local`,
      nama: namaDariUser(user),
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      const raced = await getProfile(user.id);
      if (raced) return raced;
    }
    throw toAppError(error, 'Gagal membuat profil.');
  }

  return parseWith(profileSchema, data, 'profil');
}

export async function signIn(input: LoginInput) {
  const parsed = parseWith(loginSchema, input, 'login');
  const { data, error } = await supabase.auth.signInWithPassword(parsed);
  if (error) throw friendlyAuthError(error, 'Gagal masuk.');
  if (!data.user) throw new AppError('Sesi login tidak terbentuk. Coba lagi.');
  const profile = await ensureProfile(data.user);
  return { session: data.session, profile };
}

export async function signUp(input: RegisterInput) {
  const parsed = parseWith(registerSchema, input, 'pendaftaran');
  const { data, error } = await supabase.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: {
      data: { nama: parsed.nama },
    },
  });
  if (error) throw friendlyAuthError(error, 'Gagal mendaftar.');

  if (!data.session || !data.user) {
    return { session: null, profile: null as Profile | null };
  }

  const profile = await ensureProfile(data.user);
  return { session: data.session, profile };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw friendlyAuthError(error, 'Gagal keluar.');
}
