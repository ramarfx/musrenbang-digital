import type { Session } from '@supabase/supabase-js';
import { apbdContoh, configContoh, gapContoh, kategoriContoh, usulanContoh } from './contoh';
import type { ApbdItem, GapItem, Profile, Proposal } from './supabase';
import { modeContoh, supabase } from './supabase';

/**
 * Satu pintu untuk semua akses data. Halaman tidak memanggil Supabase langsung,
 * supaya mode contoh dan mode Supabase berperilaku sama dari sisi tampilan.
 * Fungsi baca melempar Error bila gagal; fungsi tulis mengembalikan { error }.
 */

export const PESAN_MODE_CONTOH =
  'Mode contoh: aplikasi belum tersambung ke Supabase, jadi perubahan tidak disimpan.';

export type HasilTulis = { error: string | null };

export type Komentar = {
  id: number;
  isi: string;
  dibuat_pada: string;
  nama: string | null;
};

function db() {
  if (!supabase) throw new Error(PESAN_MODE_CONTOH);
  return supabase;
}

function cek<T>(hasil: { data: T | null; error: { message: string } | null }): T {
  if (hasil.error) throw new Error(hasil.error.message);
  return hasil.data as T;
}

// ---------- Auth ----------

export async function ambilSesi(): Promise<Session | null> {
  if (modeContoh) return null;
  const { data } = await db().auth.getSession();
  return data.session;
}

export function dengarkanAuth(cb: (sesi: Session | null) => void): () => void {
  if (modeContoh) return () => {};
  const { data } = db().auth.onAuthStateChange((_event, sesi) => cb(sesi));
  return () => data.subscription.unsubscribe();
}

export async function ambilProfil(userId: string): Promise<Profile | null> {
  if (modeContoh) return null;
  const hasil = await db()
    .from('profiles')
    .select('id, email, nama, peran')
    .eq('id', userId)
    .maybeSingle();
  return (hasil.data as Profile | null) ?? null;
}

async function pastikanProfil(userId: string, email: string, nama: string) {
  const { data } = await db().from('profiles').select('id').eq('id', userId).maybeSingle();
  if (!data) {
    await db()
      .from('profiles')
      .insert({ id: userId, email, nama: nama || email.split('@')[0] });
  }
}

export async function masuk(email: string, password: string, nama: string): Promise<HasilTulis> {
  if (modeContoh) return { error: PESAN_MODE_CONTOH };
  const { data, error } = await db().auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  await pastikanProfil(data.user.id, email, nama);
  return { error: null };
}

export async function daftar(
  email: string,
  password: string,
  nama: string,
): Promise<HasilTulis & { perluKonfirmasi: boolean }> {
  if (modeContoh) return { error: PESAN_MODE_CONTOH, perluKonfirmasi: false };
  const { data, error } = await db().auth.signUp({ email, password });
  if (error) return { error: error.message, perluKonfirmasi: false };
  if (!data.session) return { error: null, perluKonfirmasi: true };
  await pastikanProfil(data.session.user.id, email, nama);
  return { error: null, perluKonfirmasi: false };
}

export async function keluar(): Promise<void> {
  if (modeContoh) return;
  await db().auth.signOut();
}

// ---------- Data publik ----------

export async function ambilConfig(): Promise<Record<string, string>> {
  if (modeContoh) return configContoh;
  const rows = cek(await db().from('config').select('kunci, nilai')) as {
    kunci: string;
    nilai: string;
  }[];
  return Object.fromEntries(rows.map((r) => [r.kunci, r.nilai]));
}

export async function ambilKategori(): Promise<string[]> {
  if (modeContoh) return [...kategoriContoh].sort((a, b) => a.localeCompare(b, 'id'));
  const rows = cek(await db().from('categories').select('nama').order('nama')) as {
    nama: string;
  }[];
  return rows.map((r) => r.nama);
}

export async function ambilApbd(): Promise<ApbdItem[]> {
  if (modeContoh) return [...apbdContoh].sort((a, b) => a.kategori.localeCompare(b.kategori, 'id'));
  return cek(await db().from('apbd_items').select('*').order('kategori')) as ApbdItem[];
}

export async function ambilGap(): Promise<GapItem[]> {
  if (modeContoh) return gapContoh();
  return cek(await db().from('v_gap').select('*')) as GapItem[];
}

export async function ambilUsulan(): Promise<Proposal[]> {
  if (modeContoh) return usulanContoh;
  return cek(
    await db().from('proposals').select('*').order('dibuat_pada', { ascending: false }),
  ) as Proposal[];
}

export async function ambilUsulanById(id: number): Promise<Proposal | null> {
  if (modeContoh) return usulanContoh.find((u) => u.id === id) ?? null;
  return cek(
    await db().from('proposals').select('*').eq('id', id).maybeSingle(),
  ) as Proposal | null;
}

// ---------- Suara dan komentar ----------

export async function hitungSuara(proposalId: number): Promise<number> {
  if (modeContoh) return 0;
  const { count, error } = await db()
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('proposal_id', proposalId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function sudahMemilih(proposalId: number, userId: string): Promise<boolean> {
  if (modeContoh) return false;
  const { data } = await db()
    .from('votes')
    .select('id')
    .eq('proposal_id', proposalId)
    .eq('user_id', userId)
    .maybeSingle();
  return Boolean(data);
}

export async function ubahSuara(
  proposalId: number,
  userId: string,
  beriSuara: boolean,
): Promise<HasilTulis> {
  if (modeContoh) return { error: PESAN_MODE_CONTOH };
  const { error } = beriSuara
    ? await db().from('votes').insert({ user_id: userId, proposal_id: proposalId })
    : await db().from('votes').delete().eq('proposal_id', proposalId).eq('user_id', userId);
  return { error: error?.message ?? null };
}

export async function ambilKomentar(proposalId: number): Promise<Komentar[]> {
  if (modeContoh) return [];
  type Baris = {
    id: number;
    isi: string;
    dibuat_pada: string;
    profiles: { nama: string }[] | { nama: string } | null;
  };
  const rows = cek(
    await db()
      .from('comments')
      .select('id, isi, dibuat_pada, profiles(nama)')
      .eq('proposal_id', proposalId)
      .order('dibuat_pada', { ascending: true }),
  ) as Baris[];
  return rows.map((r) => {
    const profil = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return { id: r.id, isi: r.isi, dibuat_pada: r.dibuat_pada, nama: profil?.nama ?? null };
  });
}

export async function kirimKomentar(
  proposalId: number,
  userId: string,
  isi: string,
): Promise<HasilTulis> {
  if (modeContoh) return { error: PESAN_MODE_CONTOH };
  const { error } = await db()
    .from('comments')
    .insert({ user_id: userId, proposal_id: proposalId, isi });
  return { error: error?.message ?? null };
}

// ---------- Alokasi ----------

export async function ambilAlokasiSaya(userId: string): Promise<Record<string, number>> {
  if (modeContoh) return {};
  const rows = cek(
    await db().from('allocations').select('kategori, jumlah').eq('user_id', userId),
  ) as { kategori: string; jumlah: number }[];
  return Object.fromEntries(rows.map((r) => [r.kategori, r.jumlah]));
}

export async function simpanAlokasi(
  userId: string,
  alokasi: Record<string, number>,
): Promise<HasilTulis> {
  if (modeContoh) return { error: PESAN_MODE_CONTOH };
  const rows = Object.entries(alokasi).map(([kategori, jumlah]) => ({
    user_id: userId,
    kategori,
    jumlah,
  }));
  const { error } = await db().from('allocations').upsert(rows, { onConflict: 'user_id,kategori' });
  return { error: error?.message ?? null };
}

// ---------- Usulan ----------

export type UsulanBaru = Omit<Proposal, 'id' | 'status' | 'dibuat_pada'>;

export async function buatUsulan(usulan: UsulanBaru): Promise<HasilTulis & { id: number | null }> {
  if (modeContoh) return { error: PESAN_MODE_CONTOH, id: null };
  const { data, error } = await db().from('proposals').insert(usulan).select('id').single();
  if (error) return { error: error.message, id: null };
  return { error: null, id: (data as { id: number }).id };
}

export async function ubahStatusUsulan(
  usulan: Proposal,
  statusBaru: string,
  adminId: string,
): Promise<HasilTulis> {
  if (modeContoh) return { error: PESAN_MODE_CONTOH };
  const { error } = await db().from('proposals').update({ status: statusBaru }).eq('id', usulan.id);
  if (error) return { error: error.message };
  // Catatan backend: sebaiknya riwayat ditulis trigger database, bukan dari sini.
  const riwayat = await db().from('proposal_status_history').insert({
    proposal_id: usulan.id,
    status_lama: usulan.status,
    status_baru: statusBaru,
    diubah_oleh: adminId,
  });
  return { error: riwayat.error?.message ?? null };
}
