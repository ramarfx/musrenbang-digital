import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY belum diisi. Salin .env.example menjadi .env di folder web, lalu isi dari Dashboard Supabase.',
  );
}

/** Client Supabase untuk aplikasi web (kunci publik saja). */
export const supabase = createClient(url, anonKey);

export type Profile = {
  id: string;
  email: string;
  nama: string;
  peran: 'warga' | 'admin';
};

export type Proposal = {
  id: number;
  judul: string;
  deskripsi: string;
  kategori: string;
  lokasi: string | null;
  latitude: number | null;
  longitude: number | null;
  estimasi_biaya: number;
  pengusul_id: string | null;
  status: string;
  dibuat_pada: string;
};

export type GapItem = {
  kategori: string;
  persen_warga: number;
  persen_apbd: number;
  gap_poin_persen: number;
  nominal_apbd: number;
  total_alokasi_warga: number;
};

export type ApbdItem = {
  id: number;
  kategori: string;
  nominal_rp: number;
  tahun: number;
  kota: string;
  sumber: string;
  status_verifikasi: string;
};
