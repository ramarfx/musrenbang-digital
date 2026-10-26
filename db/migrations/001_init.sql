-- Skema awal Musrenbang Digital untuk Supabase Postgres (lihat ARSITEKTUR.md).
-- Cara pakai: tempel seluruh berkas ini di Dashboard Supabase > SQL Editor, lalu Run.
-- Urutan penting: tabel dulu, RLS dan policy setelahnya, view terakhir.

-- Profil pengguna. id merujuk ke auth.users bawaan Supabase.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  nama text NOT NULL,
  peran text NOT NULL DEFAULT 'warga' CHECK (peran IN ('warga', 'admin')),
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.apbd_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kategori text NOT NULL,
  nominal_rp bigint NOT NULL DEFAULT 0,
  tahun integer NOT NULL,
  kota text NOT NULL,
  sumber text NOT NULL DEFAULT '',
  status_verifikasi text NOT NULL DEFAULT 'perlu_lampiran'
);

CREATE TABLE IF NOT EXISTS public.proposals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  judul text NOT NULL,
  deskripsi text NOT NULL DEFAULT '',
  kategori text NOT NULL,
  lokasi text,
  latitude double precision,
  longitude double precision,
  estimasi_biaya bigint NOT NULL DEFAULT 0,
  pengusul_id uuid REFERENCES public.profiles (id),
  status text NOT NULL DEFAULT 'Diajukan'
    CHECK (status IN ('Diajukan', 'Diverifikasi', 'Masuk APBD', 'Dikerjakan', 'Selesai')),
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  diubah_pada timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.proposal_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proposal_id bigint NOT NULL REFERENCES public.proposals (id),
  status_lama text,
  status_baru text NOT NULL,
  diubah_oleh uuid REFERENCES public.profiles (id),
  diubah_pada timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.votes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id),
  proposal_id bigint NOT NULL REFERENCES public.proposals (id),
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, proposal_id)
);

CREATE TABLE IF NOT EXISTS public.comments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proposal_id bigint NOT NULL REFERENCES public.proposals (id),
  user_id uuid NOT NULL REFERENCES public.profiles (id),
  isi text NOT NULL,
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.allocations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id),
  kategori text NOT NULL,
  jumlah bigint NOT NULL DEFAULT 0,
  diubah_pada timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kategori)
);

CREATE TABLE IF NOT EXISTS public.config (
  kunci text PRIMARY KEY,
  nilai text NOT NULL
);

-- View Gap Warga-APBD. Dibaca frontend apa adanya, tanpa menghitung sendiri.
-- Persentase dihitung terhadap total yang terisi (bukan total APBD resmi),
-- karena 2 kategori seed masih kosong. Bila belum ada alokasi warga,
-- persen_warga nol dan gap sama dengan negatif persen_apbd.
CREATE OR REPLACE VIEW public.v_gap AS
WITH warga AS (
  SELECT kategori, COALESCE(SUM(jumlah), 0) AS total
  FROM public.allocations
  GROUP BY kategori
),
total_warga AS (
  SELECT COALESCE(SUM(jumlah), 0) AS total FROM public.allocations
),
total_apbd AS (
  SELECT COALESCE(SUM(nominal_rp), 0) AS total FROM public.apbd_items
)
SELECT
  c.nama AS kategori,
  CASE WHEN tw.total > 0
    THEN ROUND(COALESCE(w.total, 0) * 100.0 / tw.total, 2) ELSE 0 END AS persen_warga,
  CASE WHEN ta.total > 0
    THEN ROUND(COALESCE(p.nominal_rp, 0) * 100.0 / ta.total, 2) ELSE 0 END AS persen_apbd,
  CASE
    WHEN tw.total > 0 AND ta.total > 0
      THEN ROUND(COALESCE(w.total, 0) * 100.0 / tw.total
        - COALESCE(p.nominal_rp, 0) * 100.0 / ta.total, 2)
    WHEN tw.total > 0
      THEN ROUND(COALESCE(w.total, 0) * 100.0 / tw.total, 2)
    WHEN ta.total > 0
      THEN ROUND(-COALESCE(p.nominal_rp, 0) * 100.0 / ta.total, 2)
    ELSE 0 END AS gap_poin_persen,
  COALESCE(p.nominal_rp, 0) AS nominal_apbd,
  COALESCE(w.total, 0) AS total_alokasi_warga
FROM public.categories c
LEFT JOIN warga w ON w.kategori = c.nama
LEFT JOIN public.apbd_items p ON p.kategori = c.nama
CROSS JOIN total_warga tw
CROSS JOIN total_apbd ta;

-- Row Level Security.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apbd_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- Baca publik: APBD, kategori, config, usulan, riwayat status, komentar.
CREATE POLICY "publik baca apbd" ON public.apbd_items
  FOR SELECT USING (true);
CREATE POLICY "publik baca kategori" ON public.categories
  FOR SELECT USING (true);
CREATE POLICY "publik baca config" ON public.config
  FOR SELECT USING (true);
CREATE POLICY "publik baca usulan" ON public.proposals
  FOR SELECT USING (true);
CREATE POLICY "publik baca riwayat status" ON public.proposal_status_history
  FOR SELECT USING (true);
CREATE POLICY "publik baca komentar" ON public.comments
  FOR SELECT USING (true);
CREATE POLICY "publik baca profil" ON public.profiles
  FOR SELECT USING (true);
-- Baris suara hanya berisi user_id dan proposal_id, jadi aman dibaca publik.
-- Ini yang dipakai frontend untuk menampilkan jumlah suara tiap usulan.
CREATE POLICY "publik baca suara" ON public.votes
  FOR SELECT USING (true);

-- Tulis hanya untuk pengguna login atas namanya sendiri.
CREATE POLICY "profil milik sendiri" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "warga buat usulan" ON public.proposals
  FOR INSERT WITH CHECK (auth.uid() = pengusul_id);
CREATE POLICY "pemilik ubah usulan" ON public.proposals
  FOR UPDATE USING (auth.uid() = pengusul_id);
CREATE POLICY "warga beri suara" ON public.votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "warga batalkan suara" ON public.votes
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "warga tulis komentar" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "warga kelola alokasi sendiri" ON public.allocations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admin: peran dibaca dari profiles. Policy permissive bersifat OR,
-- jadi policy admin menambah hak, bukan menggantikan policy pemilik.
CREATE POLICY "admin kelola apbd" ON public.apbd_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND peran = 'admin')
  );
CREATE POLICY "admin ubah usulan" ON public.proposals
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND peran = 'admin')
  );
CREATE POLICY "admin tulis riwayat status" ON public.proposal_status_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND peran = 'admin')
  );

-- Hak akses peran API. RLS yang menyaring baris, tetapi tanpa GRANT,
-- PostgREST menolak sebelum policy sempat dievaluasi.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.v_gap TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT INSERT, DELETE ON public.votes TO authenticated;
GRANT INSERT ON public.comments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.allocations TO authenticated;
GRANT INSERT ON public.proposal_status_history TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.apbd_items TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
