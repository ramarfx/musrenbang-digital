-- =============================================================================
-- Musrenbang Digital — Row Level Security dan hak akses peran API
--
-- Semua pembatasan baris ditegakkan di sini. Frontend hanya menyembunyikan
-- tombol; database tetap menolak operasi yang tidak berhak.
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apbd_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- profiles: email tidak dibuka ke publik. Nama penulis dibaca lewat view
-- v_proposals / v_comments yang hanya mengekspos kolom aman.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "profil sendiri atau admin" ON public.profiles;
CREATE POLICY "profil sendiri atau admin" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profil milik sendiri" ON public.profiles;
CREATE POLICY "profil milik sendiri" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "ubah profil sendiri" ON public.profiles;
CREATE POLICY "ubah profil sendiri" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admin kelola profil" ON public.profiles;
CREATE POLICY "admin kelola profil" ON public.profiles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- Data referensi publik
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "publik baca kategori" ON public.categories;
CREATE POLICY "publik baca kategori" ON public.categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin kelola kategori" ON public.categories;
CREATE POLICY "admin kelola kategori" ON public.categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "publik baca apbd" ON public.apbd_items;
CREATE POLICY "publik baca apbd" ON public.apbd_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin kelola apbd" ON public.apbd_items;
CREATE POLICY "admin kelola apbd" ON public.apbd_items
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "publik baca config" ON public.config;
CREATE POLICY "publik baca config" ON public.config
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin kelola config" ON public.config;
CREATE POLICY "admin kelola config" ON public.config
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- proposals: baca publik, tulis oleh pemilik, status hanya lewat RPC admin.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "publik baca usulan" ON public.proposals;
CREATE POLICY "publik baca usulan" ON public.proposals
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "warga buat usulan" ON public.proposals;
CREATE POLICY "warga buat usulan" ON public.proposals
  FOR INSERT WITH CHECK (auth.uid() = pengusul_id);

DROP POLICY IF EXISTS "pemilik ubah usulan" ON public.proposals;
CREATE POLICY "pemilik ubah usulan" ON public.proposals
  FOR UPDATE USING (auth.uid() = pengusul_id) WITH CHECK (auth.uid() = pengusul_id);

DROP POLICY IF EXISTS "admin kelola usulan" ON public.proposals;
CREATE POLICY "admin kelola usulan" ON public.proposals
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- proposal_status_history: append-only. Tidak ada policy UPDATE/DELETE.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "publik baca riwayat status" ON public.proposal_status_history;
CREATE POLICY "publik baca riwayat status" ON public.proposal_status_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin tulis riwayat status" ON public.proposal_status_history;
CREATE POLICY "admin tulis riwayat status" ON public.proposal_status_history
  FOR INSERT WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- votes: publik hanya melihat agregat lewat v_proposals. Baris suara (siapa
-- memilih apa) hanya dapat dibaca pemiliknya.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "pemilik baca suara" ON public.votes;
CREATE POLICY "pemilik baca suara" ON public.votes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "warga beri suara" ON public.votes;
CREATE POLICY "warga beri suara" ON public.votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "warga batalkan suara" ON public.votes;
CREATE POLICY "warga batalkan suara" ON public.votes
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin kelola suara" ON public.votes;
CREATE POLICY "admin kelola suara" ON public.votes
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- comments: isi komentar publik, penulis hanya bisa menambah.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "publik baca komentar" ON public.comments;
CREATE POLICY "publik baca komentar" ON public.comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "warga tulis komentar" ON public.comments;
CREATE POLICY "warga tulis komentar" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin kelola komentar" ON public.comments;
CREATE POLICY "admin kelola komentar" ON public.comments
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- allocations: baris alokasi hanya milik sendiri. Agregat lintas warga
-- diekspos oleh view v_gap, bukan oleh tabel ini.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "warga kelola alokasi sendiri" ON public.allocations;
CREATE POLICY "warga kelola alokasi sendiri" ON public.allocations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin baca alokasi" ON public.allocations;
CREATE POLICY "admin baca alokasi" ON public.allocations
  FOR SELECT USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- Hak akses peran API. RLS menyaring baris; GRANT membuka pintu PostgREST.
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

GRANT UPDATE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT INSERT, DELETE ON public.votes TO authenticated;
GRANT INSERT ON public.comments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.allocations TO authenticated;
GRANT INSERT ON public.proposal_status_history TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.apbd_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.config TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Fungsi helper dipanggil policy dan trigger.
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
