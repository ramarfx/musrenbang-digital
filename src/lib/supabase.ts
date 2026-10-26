import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('SUPABASE_URL dan SUPABASE_ANON_KEY wajib diisi (lihat .env.example).');
}

/** Client Supabase untuk aplikasi (kunci publik saja, aman dipakai di browser). */
export const supabase = createClient(url, anonKey);
