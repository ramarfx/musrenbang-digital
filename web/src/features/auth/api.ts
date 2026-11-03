import { bacaHalamanAsal, simpanKembaliGoogle } from '@/lib/halamanAsal';
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

/**
 * Profil dibuat oleh trigger database saat akun terdaftar; API tidak boleh INSERT ke `profiles`
 * (ditolak RLS sejak migrasi foundation_security). Di sini profil hanya dibaca, dengan beberapa
 * kali coba ulang singkat kalau-kalau baris trigger belum terbaca tepat setelah masuk.
 */
async function ensureProfile(user: User): Promise<Profile> {
  for (let percobaan = 0; percobaan < 3; percobaan += 1) {
    const profil = await getProfile(user.id);
    if (profil) return profil;
    await new Promise((selesai) => setTimeout(selesai, 400));
  }
  throw new AppError(
    'Profil akunmu belum tersedia di server. Coba masuk lagi sebentar lagi, atau hubungi admin.',
  );
}

/** Warga hanya boleh mengubah namanya sendiri; email dan peran dijaga trigger dan RLS. */
export async function updateProfileName(userId: string, nama: string): Promise<Profile> {
  const bersih = parseWith(registerSchema.shape.nama, nama, 'nama');
  const { data, error } = await supabase
    .from('profiles')
    .update({ nama: bersih })
    .eq('id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw toAppError(error, 'Gagal menyimpan nama.');
  if (!data) throw new AppError('Profil tidak ditemukan. Coba masuk lagi.');
  return parseWith(profileSchema, data, 'profil');
}

const KUNCI_BARU_MASUK = 'musrenbang:baru-masuk';

/**
 * Menandai bahwa pengguna baru saja memulai proses masuk, supaya notifikasi "Berhasil masuk"
 * tampil sekali setelah sesinya terbentuk. Perlu penanda karena sesi Google baru ada setelah
 * halaman dimuat ulang, dan sesi yang dipulihkan biasa (buka tab lagi) tidak boleh memunculkannya.
 */
export function tandaiBaruMasuk() {
  try {
    sessionStorage.setItem(KUNCI_BARU_MASUK, '1');
  } catch {
    // Penyimpanan diblokir: notifikasi saja yang hilang, masuknya tetap jalan.
  }
}

/** Mengambil lalu menghapus penanda baru masuk; benar hanya sekali per proses masuk. */
export function ambilBaruMasuk(): boolean {
  try {
    const ada = sessionStorage.getItem(KUNCI_BARU_MASUK) === '1';
    sessionStorage.removeItem(KUNCI_BARU_MASUK);
    return ada;
  } catch {
    return false;
  }
}

export async function signIn(input: LoginInput) {
  const parsed = parseWith(loginSchema, input, 'login');
  const { data, error } = await supabase.auth.signInWithPassword(parsed);
  if (error) throw friendlyAuthError(error, 'Gagal masuk.');
  if (!data.user) throw new AppError('Sesi login tidak terbentuk. Coba lagi.');
  tandaiBaruMasuk();
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

  tandaiBaruMasuk();
  const profile = await ensureProfile(data.user);
  return { session: data.session, profile };
}

/**
 * Masuk dengan akun Google lewat Supabase Auth. Browser dialihkan ke Google, lalu kembali ke
 * beranda dengan sesi aktif. Alamat beranda (dan alamat dev yang dipakai) harus terdaftar di
 * Authorized JavaScript origins dan Redirect URLs milik proyek Supabase dan Google.
 */
export async function signInWithGoogle() {
  tandaiBaruMasuk();
  simpanKembaliGoogle(bacaHalamanAsal() ?? '/');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/` },
  });
  if (error) {
    try {
      sessionStorage.removeItem(KUNCI_BARU_MASUK);
    } catch {
      // Tidak ada penanda yang perlu dihapus.
    }
    throw friendlyAuthError(error, 'Gagal membuka login Google.');
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw friendlyAuthError(error, 'Gagal keluar.');
}
