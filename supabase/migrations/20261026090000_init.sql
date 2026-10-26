-- =============================================================================
-- Musrenbang Digital — skema inti
-- Jalankan berurutan: init -> rls -> views -> rpc.
--
-- Prinsip:
-- 1. Semua aturan data yang bisa dijaga database diletakkan di database.
-- 2. Kolom teks yang berisi enumerasi diberi CHECK constraint.
-- 3. Riwayat status bersifat append-only dan hanya ditulis admin lewat RPC.
-- 4. Profil dibuat otomatis oleh trigger saat auth.users bertambah, sehingga
--    frontend tidak lagi melakukan insert profil manual setelah sign up.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabel
-- -----------------------------------------------------------------------------

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
  kategori text NOT NULL REFERENCES public.categories (nama) ON UPDATE CASCADE,
  nominal_rp bigint NOT NULL DEFAULT 0 CHECK (nominal_rp >= 0),
  tahun integer NOT NULL CHECK (tahun BETWEEN 2000 AND 2100),
  kota text NOT NULL,
  sumber text NOT NULL DEFAULT '',
  status_verifikasi text NOT NULL DEFAULT 'perlu_lampiran'
    CHECK (status_verifikasi IN ('verified_program', 'perlu_lampiran')),
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  diubah_pada timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.proposals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  judul text NOT NULL CHECK (char_length(btrim(judul)) BETWEEN 8 AND 120),
  deskripsi text NOT NULL
    CHECK (char_length(btrim(deskripsi)) BETWEEN 20 AND 2000),
  kategori text NOT NULL REFERENCES public.categories (nama) ON UPDATE CASCADE,
  lokasi text,
  latitude double precision CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude double precision CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  estimasi_biaya bigint NOT NULL DEFAULT 0 CHECK (estimasi_biaya >= 0),
  pengusul_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Diajukan'
    CHECK (status IN ('Diajukan', 'Diverifikasi', 'Masuk APBD', 'Dikerjakan', 'Selesai')),
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  diubah_pada timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.proposal_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proposal_id bigint NOT NULL REFERENCES public.proposals (id) ON DELETE CASCADE,
  status_lama text,
  status_baru text NOT NULL
    CHECK (status_baru IN ('Diajukan', 'Diverifikasi', 'Masuk APBD', 'Dikerjakan', 'Selesai')),
  diubah_oleh uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  diubah_pada timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.votes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  proposal_id bigint NOT NULL REFERENCES public.proposals (id) ON DELETE CASCADE,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, proposal_id)
);

CREATE TABLE IF NOT EXISTS public.comments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proposal_id bigint NOT NULL REFERENCES public.proposals (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  isi text NOT NULL CHECK (char_length(btrim(isi)) BETWEEN 1 AND 2000),
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.allocations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  kategori text NOT NULL REFERENCES public.categories (nama) ON UPDATE CASCADE,
  jumlah bigint NOT NULL DEFAULT 0 CHECK (jumlah >= 0),
  diubah_pada timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kategori)
);

CREATE TABLE IF NOT EXISTS public.config (
  kunci text PRIMARY KEY,
  nilai text NOT NULL
);

-- -----------------------------------------------------------------------------
-- Kategori awal (Lampiran B PRD). Seed boleh meng-upsert ulang.
-- -----------------------------------------------------------------------------

INSERT INTO public.categories (nama)
VALUES
  ('Infrastruktur dan Jalan'),
  ('Pendidikan'),
  ('Kesehatan'),
  ('Lingkungan dan Sampah'),
  ('Air Bersih dan Drainase'),
  ('Transportasi Publik'),
  ('Keamanan dan Penerangan'),
  ('Ekonomi dan UMKM'),
  ('Sosial dan Budaya'),
  ('Teknologi dan Layanan Digital')
ON CONFLICT (nama) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Index untuk query yang dipakai halaman publik dan admin
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS proposals_dibuat_pada_idx
  ON public.proposals (dibuat_pada DESC);
CREATE INDEX IF NOT EXISTS proposals_status_idx ON public.proposals (status);
CREATE INDEX IF NOT EXISTS proposals_kategori_idx ON public.proposals (kategori);
CREATE INDEX IF NOT EXISTS proposal_status_history_proposal_idx
  ON public.proposal_status_history (proposal_id, diubah_pada);
CREATE INDEX IF NOT EXISTS votes_proposal_idx ON public.votes (proposal_id);
CREATE INDEX IF NOT EXISTS comments_proposal_idx
  ON public.comments (proposal_id, dibuat_pada);
CREATE INDEX IF NOT EXISTS allocations_kategori_idx ON public.allocations (kategori);
CREATE INDEX IF NOT EXISTS apbd_items_kategori_idx
  ON public.apbd_items (kategori, tahun);

-- -----------------------------------------------------------------------------
-- Helper functions
-- -----------------------------------------------------------------------------

-- Cek peran admin tanpa memicu rekursi RLS pada tabel profiles.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.peran = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.diubah_pada := now();
  RETURN NEW;
END;
$$;

-- Profil dibuat otomatis saat user Supabase Auth baru terdaftar.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_nama text;
  v_email text;
BEGIN
  v_email := COALESCE(NEW.email, NEW.id::text || '@unknown.local');
  v_nama := NULLIF(btrim(NEW.raw_user_meta_data ->> 'nama'), '');
  IF v_nama IS NULL THEN
    v_nama := split_part(v_email, '@', 1);
  END IF;

  INSERT INTO public.profiles (id, email, nama)
  VALUES (NEW.id, v_email, v_nama)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Status hanya boleh berubah lewat RPC change_proposal_status (admin) atau
-- service role (seed/dashboard). Ini menutup celah pemilik usulan yang bisa
-- mengubah statusnya sendiri lewat UPDATE biasa.
CREATE OR REPLACE FUNCTION public.guard_proposal_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mengubah status usulan.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- Peran dan email profil tidak boleh diubah sendiri oleh warga.
CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.peran IS DISTINCT FROM OLD.peran THEN
      RAISE EXCEPTION 'Peran profil hanya dapat diubah admin.' USING ERRCODE = '42501';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Email profil hanya dapat diubah admin.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Trigger
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS proposals_set_updated_at ON public.proposals;
CREATE TRIGGER proposals_set_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS allocations_set_updated_at ON public.allocations;
CREATE TRIGGER allocations_set_updated_at
  BEFORE UPDATE ON public.allocations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS apbd_items_set_updated_at ON public.apbd_items;
CREATE TRIGGER apbd_items_set_updated_at
  BEFORE UPDATE ON public.apbd_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS proposals_guard_status ON public.proposals;
CREATE TRIGGER proposals_guard_status
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.guard_proposal_status();

DROP TRIGGER IF EXISTS profiles_guard_role ON public.profiles;
CREATE TRIGGER profiles_guard_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Config awal. Nilai sebenarnya diisi ulang oleh skrip seed.
-- -----------------------------------------------------------------------------

INSERT INTO public.config (kunci, nilai)
VALUES
  ('kota', 'DKI Jakarta'),
  ('tahun_anggaran', '2026'),
  ('virtual_budget_per_warga', '10000000')
ON CONFLICT (kunci) DO NOTHING;
