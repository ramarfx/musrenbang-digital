-- Tahap 1: moderasi dan batas akses. Data lama tetap ada, tetapi wajib ditinjau.
ALTER TABLE public.proposals
  ADD COLUMN moderasi text NOT NULL DEFAULT 'Menunggu'
    CHECK (moderasi IN ('Menunggu', 'Disetujui', 'Ditolak')),
  ADD COLUMN catatan_moderasi text,
  ADD COLUMN dimoderasi_oleh uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN dimoderasi_pada timestamptz,
  ADD CONSTRAINT proposals_alasan_penolakan CHECK (
    moderasi <> 'Ditolak' OR COALESCE(char_length(btrim(catatan_moderasi)), 0) > 0
  ),
  ADD CONSTRAINT proposals_catatan_moderasi_length CHECK (
    catatan_moderasi IS NULL OR char_length(catatan_moderasi) <= 2000
  );

CREATE INDEX proposals_moderasi_pengusul_idx ON public.proposals(moderasi, pengusul_id);
CREATE INDEX proposals_pengusul_idx ON public.proposals(pengusul_id);

-- Tidak diekspos sebagai schema Data API. Dipakai tabel dan view dengan aturan sama.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE FUNCTION private.can_read_proposal(p_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proposals p WHERE p.id = p_id
    AND (p.moderasi = 'Disetujui' OR p.pengusul_id = auth.uid() OR public.is_admin())
  );
$$;
REVOKE ALL ON FUNCTION private.can_read_proposal(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_read_proposal(bigint) TO anon, authenticated;

-- Guard tetap memeriksa nilai, walaupun payload melewati shared schema.
CREATE OR REPLACE FUNCTION public.guard_proposal_status()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status <> 'Diajukan' OR NEW.moderasi <> 'Menunggu'
         OR NEW.catatan_moderasi IS NOT NULL OR NEW.dimoderasi_oleh IS NOT NULL
         OR NEW.dimoderasi_pada IS NOT NULL THEN
        RAISE EXCEPTION 'Usulan baru wajib Diajukan dan Menunggu moderasi.' USING ERRCODE = '42501';
      END IF;
      NEW.dibuat_pada := now();
      NEW.diubah_pada := now();
    ELSE
      IF OLD.moderasi <> 'Menunggu'
         OR NEW.id IS DISTINCT FROM OLD.id
         OR NEW.pengusul_id IS DISTINCT FROM OLD.pengusul_id
         OR NEW.dibuat_pada IS DISTINCT FROM OLD.dibuat_pada
         OR NEW.status IS DISTINCT FROM OLD.status
         OR NEW.moderasi IS DISTINCT FROM OLD.moderasi
         OR NEW.catatan_moderasi IS DISTINCT FROM OLD.catatan_moderasi
         OR NEW.dimoderasi_oleh IS DISTINCT FROM OLD.dimoderasi_oleh
         OR NEW.dimoderasi_pada IS DISTINCT FROM OLD.dimoderasi_pada THEN
        RAISE EXCEPTION 'Warga hanya boleh mengedit isi usulan miliknya yang Menunggu.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  IF auth.uid() IS NOT NULL AND public.is_admin() THEN
    IF TG_OP = 'INSERT' OR NEW.moderasi IS DISTINCT FROM OLD.moderasi
       OR NEW.catatan_moderasi IS DISTINCT FROM OLD.catatan_moderasi THEN
      NEW.dimoderasi_oleh := CASE WHEN NEW.moderasi = 'Menunggu' THEN NULL ELSE auth.uid() END;
      NEW.dimoderasi_pada := CASE WHEN NEW.moderasi = 'Menunggu' THEN NULL ELSE now() END;
    ELSIF NEW.dimoderasi_oleh IS DISTINCT FROM OLD.dimoderasi_oleh
       OR NEW.dimoderasi_pada IS DISTINCT FROM OLD.dimoderasi_pada THEN
      RAISE EXCEPTION 'Identitas dan waktu moderasi ditentukan sistem.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER proposals_guard_status ON public.proposals;
CREATE TRIGGER proposals_guard_status BEFORE INSERT OR UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.guard_proposal_status();

-- Profil hanya dibuat oleh trigger Auth atau pengelola SQL, bukan INSERT dari API.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles(id, email, nama, peran)
  VALUES (
    NEW.id, COALESCE(NEW.email, NEW.id::text || '@unknown.local'),
    COALESCE(NULLIF(btrim(NEW.raw_user_meta_data ->> 'nama'), ''), 'Warga'), 'warga'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Akun lama sebelum trigger dipasang dipulihkan tanpa mengambil role dari metadata.
INSERT INTO public.profiles(id, email, nama, peran)
SELECT u.id, COALESCE(u.email, u.id::text || '@unknown.local'),
  COALESCE(NULLIF(btrim(u.raw_user_meta_data ->> 'nama'), ''), 'Warga'), 'warga'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
    NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email
    OR NEW.peran IS DISTINCT FROM OLD.peran OR NEW.dibuat_pada IS DISTINCT FROM OLD.dibuat_pada
  ) THEN
    RAISE EXCEPTION 'API hanya dapat mengubah nama profil sendiri.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- Ganti policy lama, jangan biarkan policy permisif lama ter-OR dengan policy baru.
DROP POLICY "profil milik sendiri" ON public.profiles;
DROP POLICY "admin kelola profil" ON public.profiles;
-- Policy SELECT sendiri/admin dan UPDATE sendiri tetap digunakan.

DROP POLICY "publik baca usulan" ON public.proposals;
CREATE POLICY "baca usulan sesuai moderasi" ON public.proposals FOR SELECT TO anon, authenticated
  USING (moderasi = 'Disetujui' OR pengusul_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
DROP POLICY "warga buat usulan" ON public.proposals;
CREATE POLICY "warga buat usulan" ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (pengusul_id = (SELECT auth.uid()) AND status = 'Diajukan' AND moderasi = 'Menunggu');
DROP POLICY "pemilik ubah usulan" ON public.proposals;
CREATE POLICY "pemilik ubah usulan menunggu" ON public.proposals FOR UPDATE TO authenticated
  USING (pengusul_id = (SELECT auth.uid()) AND moderasi = 'Menunggu')
  WITH CHECK (pengusul_id = (SELECT auth.uid()) AND moderasi = 'Menunggu');

DROP POLICY "publik baca komentar" ON public.comments;
CREATE POLICY "baca komentar usulan terlihat" ON public.comments FOR SELECT TO anon, authenticated
  USING (private.can_read_proposal(proposal_id));
DROP POLICY "warga tulis komentar" ON public.comments;
CREATE POLICY "warga tulis komentar usulan disetujui" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.moderasi = 'Disetujui'
  ));
DROP POLICY "admin kelola komentar" ON public.comments;
CREATE POLICY "admin hapus komentar" ON public.comments FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY "publik baca riwayat status" ON public.proposal_status_history;
CREATE POLICY "baca riwayat usulan terlihat" ON public.proposal_status_history FOR SELECT TO anon, authenticated
  USING (private.can_read_proposal(proposal_id));
DROP POLICY "admin tulis riwayat status" ON public.proposal_status_history;

DROP POLICY "pemilik baca suara" ON public.votes;
CREATE POLICY "pemilik baca suara usulan terlihat" ON public.votes FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND private.can_read_proposal(proposal_id));
DROP POLICY "warga beri suara" ON public.votes;
CREATE POLICY "warga beri suara usulan disetujui" ON public.votes FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.moderasi = 'Disetujui'
  ));
DROP POLICY "admin kelola suara" ON public.votes;
CREATE POLICY "admin baca suara" ON public.votes FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));
-- Pemilik tetap dapat membatalkan suaranya setelah usulan disembunyikan.

DROP POLICY "warga kelola alokasi sendiri" ON public.allocations;
CREATE POLICY "warga baca alokasi sendiri" ON public.allocations FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
-- Policy admin baca alokasi tetap digunakan; tidak ada policy tulis API.

-- Hilangkan hak bawaan Supabase, termasuk TRUNCATE yang tidak disaring RLS.
REVOKE ALL ON public.profiles, public.proposals, public.comments, public.votes,
  public.proposal_status_history, public.allocations, public.categories,
  public.apbd_items, public.config FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles, public.allocations, public.votes TO authenticated;
GRANT UPDATE(nama) ON public.profiles TO authenticated;
GRANT SELECT ON public.proposals, public.comments, public.proposal_status_history,
  public.categories, public.apbd_items, public.config TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT INSERT, DELETE ON public.comments, public.votes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories, public.apbd_items, public.config TO authenticated;

-- Kolom lama dan jenisnya tetap; kolom moderasi ditambahkan di akhir kontrak view.
CREATE OR REPLACE VIEW public.v_proposals
WITH (security_invoker = false, security_barrier = true) AS
SELECT p.id, p.judul, p.deskripsi, p.kategori, p.lokasi, p.latitude, p.longitude,
  p.estimasi_biaya, p.pengusul_id, COALESCE(pr.nama, 'Warga') AS pengusul_nama,
  p.status, p.dibuat_pada, p.diubah_pada,
  COALESCE(v.jumlah_suara, 0)::integer AS jumlah_suara,
  p.moderasi,
  CASE WHEN p.pengusul_id = auth.uid() OR public.is_admin() THEN p.catatan_moderasi END AS catatan_moderasi,
  CASE WHEN p.pengusul_id = auth.uid() OR public.is_admin() THEN p.dimoderasi_oleh END AS dimoderasi_oleh,
  p.dimoderasi_pada
FROM public.proposals p
LEFT JOIN public.profiles pr ON pr.id = p.pengusul_id
LEFT JOIN (SELECT proposal_id, COUNT(*)::integer AS jumlah_suara FROM public.votes GROUP BY proposal_id) v
  ON v.proposal_id = p.id
WHERE p.moderasi = 'Disetujui' OR p.pengusul_id = auth.uid() OR public.is_admin();

CREATE OR REPLACE VIEW public.v_comments
WITH (security_invoker = false, security_barrier = true) AS
SELECT c.id, c.proposal_id, c.isi, c.dibuat_pada, COALESCE(pr.nama, 'Warga') AS penulis_nama
FROM public.comments c LEFT JOIN public.profiles pr ON pr.id = c.user_id
WHERE private.can_read_proposal(c.proposal_id);

CREATE OR REPLACE VIEW public.v_proposal_status_history
WITH (security_invoker = false, security_barrier = true) AS
SELECT h.id, h.proposal_id, h.status_lama, h.status_baru, h.diubah_pada,
  COALESCE(pr.nama, 'Sistem') AS diubah_oleh_nama
FROM public.proposal_status_history h LEFT JOIN public.profiles pr ON pr.id = h.diubah_oleh
WHERE private.can_read_proposal(h.proposal_id);

REVOKE ALL ON public.v_proposals, public.v_comments, public.v_proposal_status_history,
  public.v_gap FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_proposals, public.v_comments, public.v_proposal_status_history,
  public.v_gap TO anon, authenticated;

-- Moderasi terpisah dari lima tahapan kemajuan. Alasan penolakan wajib diisi.
CREATE FUNCTION public.moderate_proposal(p_proposal_id bigint, p_moderasi text, p_catatan text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat memoderasi usulan.' USING ERRCODE = '42501';
  END IF;
  IF p_moderasi IS NULL OR p_moderasi NOT IN ('Menunggu', 'Disetujui', 'Ditolak') THEN
    RAISE EXCEPTION 'Status moderasi tidak dikenal.' USING ERRCODE = '22023';
  END IF;
  IF p_moderasi = 'Ditolak' AND COALESCE(char_length(btrim(p_catatan)), 0) = 0 THEN
    RAISE EXCEPTION 'Penolakan wajib disertai alasan.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.proposals SET moderasi = p_moderasi, catatan_moderasi = NULLIF(btrim(p_catatan), '')
  WHERE id = p_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usulan tidak ditemukan.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.moderate_proposal(bigint, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_proposal(bigint, text, text) TO authenticated;

-- Fungsi trigger tidak perlu dapat dipanggil melalui Data API.
REVOKE ALL ON FUNCTION public.handle_new_user(), public.guard_profile_role(),
  public.guard_proposal_status(), public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_allocations(jsonb), public.change_proposal_status(bigint, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_allocations(jsonb), public.change_proposal_status(bigint, text)
  TO authenticated;

-- Pertahankan validator lama. Wrapper mengunci profil sebelum penggantian set,
-- termasuk ketika pengguna belum punya baris alokasi sama sekali.
ALTER FUNCTION public.save_allocations(jsonb) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.save_allocations(jsonb) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.save_allocations(p_rows jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Masuk dulu untuk menyimpan alokasi.' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil pengguna belum tersedia.' USING ERRCODE = '42501';
  END IF;
  PERFORM private.save_allocations(p_rows);
END;
$$;
REVOKE ALL ON FUNCTION public.save_allocations(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_allocations(jsonb) TO authenticated;
