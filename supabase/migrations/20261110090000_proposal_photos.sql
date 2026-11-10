-- =============================================================================
-- Foto pengerjaan usulan
--
-- Admin dapat mengunggah foto lapangan saat usulan berstatus Dikerjakan atau
-- Selesai, supaya warga melihat progres nyata. Aturannya ditegakkan di database:
--   * hanya admin yang boleh menambah dan menghapus foto,
--   * foto hanya diterima bila status usulan saat ini Dikerjakan atau Selesai,
--   * satu usulan paling banyak 12 foto,
--   * siapa pun dapat melihat foto dari usulan yang memang terlihat olehnya.
--
-- Dijalankan sekali di Supabase SQL Editor. Aman diulang (IF NOT EXISTS,
-- ON CONFLICT, DROP POLICY IF EXISTS).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Bucket Storage. Publik untuk dibaca (alamat berisi uuid acak), batas 5 MB,
--    hanya gambar.
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'foto-pengerjaan',
  'foto-pengerjaan',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Hanya admin yang boleh mengunggah dan menghapus berkas di bucket ini.
DROP POLICY IF EXISTS "admin unggah foto pengerjaan" ON storage.objects;
CREATE POLICY "admin unggah foto pengerjaan" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'foto-pengerjaan' AND (SELECT public.is_admin()));

DROP POLICY IF EXISTS "admin hapus foto pengerjaan" ON storage.objects;
CREATE POLICY "admin hapus foto pengerjaan" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'foto-pengerjaan' AND (SELECT public.is_admin()));

-- Baca dibuka karena bucket publik; policy ini juga diperlukan agar penghapusan
-- lewat API Storage dapat menemukan barisnya.
DROP POLICY IF EXISTS "baca foto pengerjaan" ON storage.objects;
CREATE POLICY "baca foto pengerjaan" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'foto-pengerjaan');

-- -----------------------------------------------------------------------------
-- 2. Tabel foto. Dipisah dari proposal_status_history karena tabel itu
--    append-only (tanpa UPDATE/DELETE), sedangkan foto harus bisa dihapus admin.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.proposal_photos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proposal_id bigint NOT NULL REFERENCES public.proposals (id) ON DELETE CASCADE,
  -- Lokasi berkas di bucket, selalu diawali id usulan: "<proposal_id>/<uuid>.webp".
  path text NOT NULL UNIQUE CHECK (path LIKE proposal_id::text || '/%'),
  -- Diisi trigger dari status usulan saat foto diunggah.
  status text NOT NULL CHECK (status IN ('Dikerjakan', 'Selesai')),
  keterangan text CHECK (keterangan IS NULL OR char_length(btrim(keterangan)) <= 200),
  diunggah_oleh uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proposal_photos_proposal_idx
  ON public.proposal_photos (proposal_id, dibuat_pada);
CREATE INDEX IF NOT EXISTS proposal_photos_diunggah_oleh_idx
  ON public.proposal_photos (diunggah_oleh);

-- -----------------------------------------------------------------------------
-- 3. Penjaga: status usulan harus Dikerjakan atau Selesai, maksimal 12 foto.
--    Status foto dan pengunggahnya diisi dari database, bukan dari klien.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.guard_proposal_photo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  status_usulan text;
  jumlah integer;
BEGIN
  SELECT p.status INTO status_usulan FROM public.proposals p WHERE p.id = NEW.proposal_id;
  IF status_usulan IS NULL THEN
    RAISE EXCEPTION 'Usulan tidak ditemukan' USING ERRCODE = 'P0002';
  END IF;
  IF status_usulan NOT IN ('Dikerjakan', 'Selesai') THEN
    RAISE EXCEPTION 'Foto hanya bisa ditambahkan saat usulan berstatus Dikerjakan atau Selesai'
      USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO jumlah FROM public.proposal_photos f WHERE f.proposal_id = NEW.proposal_id;
  IF jumlah >= 12 THEN
    RAISE EXCEPTION 'Satu usulan paling banyak 12 foto' USING ERRCODE = '23514';
  END IF;
  NEW.status := status_usulan;
  NEW.diunggah_oleh := auth.uid();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_proposal_photo() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS proposal_photos_guard ON public.proposal_photos;
CREATE TRIGGER proposal_photos_guard
  BEFORE INSERT ON public.proposal_photos
  FOR EACH ROW EXECUTE FUNCTION private.guard_proposal_photo();

-- -----------------------------------------------------------------------------
-- 4. RLS dan hak akses
-- -----------------------------------------------------------------------------

ALTER TABLE public.proposal_photos ENABLE ROW LEVEL SECURITY;

-- Subquery ke proposals memakai RLS proposals: foto hanya terlihat bila usulannya
-- terlihat oleh pembaca (Disetujui, milik sendiri, atau admin).
DROP POLICY IF EXISTS "baca foto sesuai usulan" ON public.proposal_photos;
CREATE POLICY "baca foto sesuai usulan" ON public.proposal_photos
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id));

DROP POLICY IF EXISTS "admin tambah foto" ON public.proposal_photos;
CREATE POLICY "admin tambah foto" ON public.proposal_photos
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "admin hapus foto" ON public.proposal_photos;
CREATE POLICY "admin hapus foto" ON public.proposal_photos
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

GRANT SELECT ON public.proposal_photos TO anon, authenticated;
GRANT INSERT, DELETE ON public.proposal_photos TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.proposal_photos_id_seq TO authenticated;

-- -----------------------------------------------------------------------------
-- Cara memeriksa setelah dijalankan (di SQL Editor):
--   SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'foto-pengerjaan';
--   SELECT policyname FROM pg_policies WHERE tablename = 'proposal_photos';
-- Uji dari aplikasi: akun warga biasa harus ditolak saat mengunggah, akun admin
-- ditolak bila status usulan belum Dikerjakan atau Selesai.
-- -----------------------------------------------------------------------------
