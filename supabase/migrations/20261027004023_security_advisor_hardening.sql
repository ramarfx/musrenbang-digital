-- Tahap 1D.1: jadikan view sebagai invoker dan batasi SECURITY DEFINER
-- hanya pada helper/RPC yang memang memerlukan hak database tambahan.

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.peran = 'admin'
  );
$$;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$ SELECT private.is_admin(); $$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- View invoker tetap dapat menampilkan kolom aman tanpa membuka profiles.email
-- atau mengubah policy profiles yang dipakai endpoint profil warga.
CREATE OR REPLACE FUNCTION private.profile_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.nama FROM public.profiles p
  WHERE p.id = p_user_id AND (
    p.id = auth.uid() OR private.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.proposals q
      WHERE q.pengusul_id = p.id AND private.can_read_proposal(q.id)
    )
    OR EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.user_id = p.id AND private.can_read_proposal(c.proposal_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.proposal_status_history h
      WHERE h.diubah_oleh = p.id AND private.can_read_proposal(h.proposal_id)
    )
  );
$$;
REVOKE ALL ON FUNCTION private.profile_name(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.profile_name(uuid) TO anon, authenticated;

-- Vote individual tetap tertutup RLS. Helper internal ini hanya mengembalikan
-- jumlah untuk proposal yang terlihat, termasuk pada pemanggilan SQL langsung.
CREATE OR REPLACE FUNCTION private.proposal_vote_count(p_proposal_id bigint)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE WHEN private.can_read_proposal(p_proposal_id) THEN (
    SELECT count(*)::integer FROM public.votes v WHERE v.proposal_id = p_proposal_id
  ) ELSE 0 END;
$$;
REVOKE ALL ON FUNCTION private.proposal_vote_count(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.proposal_vote_count(bigint) TO anon, authenticated;

-- Agregasi seluruh warga dipertahankan; RLS allocations tetap menyembunyikan
-- baris individual. Output helper hanya kategori dan total, tanpa user_id.
CREATE OR REPLACE FUNCTION private.gap_allocation_totals()
RETURNS TABLE(kategori text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.kategori, COALESCE(sum(a.jumlah), 0)::bigint
  FROM public.allocations a
  GROUP BY a.kategori;
$$;
REVOKE ALL ON FUNCTION private.gap_allocation_totals() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.gap_allocation_totals() TO anon, authenticated;

-- Worker privat memvalidasi ulang admin; endpoint SECURITY DEFINER di bawah
-- memakai search_path kosong dan mengotorisasi pemanggil sebelum delegasi.
CREATE OR REPLACE FUNCTION private.change_proposal_status(
  p_proposal_id bigint,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_status_lama text;
BEGIN
  IF v_user_id IS NULL OR NOT private.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mengubah status usulan.' USING ERRCODE = '42501';
  END IF;
  IF p_status IS NULL OR p_status <> ALL (
    ARRAY['Diajukan', 'Diverifikasi', 'Masuk APBD', 'Dikerjakan', 'Selesai']
  ) THEN
    RAISE EXCEPTION 'Status usulan tidak dikenal.' USING ERRCODE = '22023';
  END IF;
  SELECT status INTO v_status_lama FROM public.proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usulan tidak ditemukan.' USING ERRCODE = 'P0002';
  END IF;
  IF v_status_lama = p_status THEN RETURN; END IF;
  UPDATE public.proposals SET status = p_status WHERE id = p_proposal_id;
  INSERT INTO public.proposal_status_history(proposal_id, status_lama, status_baru, diubah_oleh)
  VALUES (p_proposal_id, v_status_lama, p_status, v_user_id);
END;
$$;
REVOKE ALL ON FUNCTION private.change_proposal_status(bigint, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.change_proposal_status(p_proposal_id bigint, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mengubah status usulan.' USING ERRCODE = '42501';
  END IF;
  PERFORM private.change_proposal_status(p_proposal_id, p_status);
END;
$$;
REVOKE ALL ON FUNCTION public.change_proposal_status(bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_proposal_status(bigint, text) TO authenticated;

CREATE OR REPLACE FUNCTION private.moderate_proposal(
  p_proposal_id bigint,
  p_moderasi text,
  p_catatan text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat memoderasi usulan.' USING ERRCODE = '42501';
  END IF;
  IF p_moderasi IS NULL OR p_moderasi NOT IN ('Menunggu', 'Disetujui', 'Ditolak') THEN
    RAISE EXCEPTION 'Status moderasi tidak dikenal.' USING ERRCODE = '22023';
  END IF;
  IF p_moderasi = 'Ditolak' AND COALESCE(char_length(btrim(p_catatan)), 0) = 0 THEN
    RAISE EXCEPTION 'Penolakan wajib disertai alasan.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.proposals
    SET moderasi = p_moderasi, catatan_moderasi = NULLIF(btrim(p_catatan), '')
    WHERE id = p_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usulan tidak ditemukan.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION private.moderate_proposal(bigint, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.moderate_proposal(
  p_proposal_id bigint,
  p_moderasi text,
  p_catatan text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat memoderasi usulan.' USING ERRCODE = '42501';
  END IF;
  PERFORM private.moderate_proposal(p_proposal_id, p_moderasi, p_catatan);
END;
$$;
REVOKE ALL ON FUNCTION public.moderate_proposal(bigint, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_proposal(bigint, text, text) TO authenticated;

-- Pindahkan row lock ke worker berhak agar semua pemanggil RPC tetap serial.
CREATE OR REPLACE FUNCTION private.save_allocations(p_rows jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_budget bigint;
  v_total bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Masuk dulu untuk menyimpan alokasi.' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil pengguna belum tersedia.' USING ERRCODE = '42501';
  END IF;
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Payload alokasi harus berupa array JSON.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_rows) AS r
    WHERE jsonb_typeof(r -> 'kategori') IS DISTINCT FROM 'string'
       OR btrim(r ->> 'kategori') = ''
  ) THEN
    RAISE EXCEPTION 'Setiap alokasi harus punya kategori yang valid.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_rows) AS r
    WHERE jsonb_typeof(r -> 'jumlah') IS DISTINCT FROM 'number'
  ) THEN
    RAISE EXCEPTION 'Jumlah alokasi harus berupa angka.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_rows) AS r
    WHERE (r ->> 'jumlah')::numeric < 0
       OR (r ->> 'jumlah')::numeric <> trunc((r ->> 'jumlah')::numeric)
  ) THEN
    RAISE EXCEPTION 'Jumlah alokasi harus bilangan bulat tidak negatif.'
      USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_rows) AS r
    WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.nama = r ->> 'kategori')
  ) THEN
    RAISE EXCEPTION 'Ada kategori yang tidak dikenal.' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(DISTINCT r ->> 'kategori') FROM jsonb_array_elements(p_rows) AS r)
     <> jsonb_array_length(p_rows) THEN
    RAISE EXCEPTION 'Kategori alokasi tidak boleh duplikat.' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(NULLIF(btrim(nilai), '')::bigint, 10000000)
    INTO v_budget FROM public.config WHERE kunci = 'virtual_budget_per_warga';
  v_budget := COALESCE(v_budget, 10000000);
  IF v_budget <= 0 THEN v_budget := 10000000; END IF;
  SELECT COALESCE(sum((r ->> 'jumlah')::bigint), 0)
    INTO v_total FROM jsonb_array_elements(p_rows) AS r;
  IF v_total > v_budget THEN
    RAISE EXCEPTION 'Total alokasi % melebihi anggaran virtual %.', v_total, v_budget
      USING ERRCODE = '22003';
  END IF;
  DELETE FROM public.allocations WHERE user_id = v_user_id;
  INSERT INTO public.allocations(user_id, kategori, jumlah)
    SELECT v_user_id, r ->> 'kategori', (r ->> 'jumlah')::bigint
    FROM jsonb_array_elements(p_rows) AS r;
END;
$$;
REVOKE ALL ON FUNCTION private.save_allocations(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_allocations(p_rows jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Masuk dulu untuk menyimpan alokasi.' USING ERRCODE = '42501';
  END IF;
  PERFORM private.save_allocations(p_rows);
END;
$$;
REVOKE ALL ON FUNCTION public.save_allocations(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_allocations(jsonb) TO authenticated;

-- Tiga view row-scoped menjadi invoker; lookup nama/vote terpisah dari sumber
-- sensitif sehingga grants/RLS tabel tetap tidak membuka profil atau votes.
CREATE OR REPLACE VIEW public.v_proposals
WITH (security_invoker = true, security_barrier = true) AS
SELECT p.id, p.judul, p.deskripsi, p.kategori, p.lokasi, p.latitude, p.longitude,
  p.estimasi_biaya, p.pengusul_id,
  COALESCE(private.profile_name(p.pengusul_id), 'Warga') AS pengusul_nama,
  p.status, p.dibuat_pada, p.diubah_pada,
  private.proposal_vote_count(p.id) AS jumlah_suara,
  p.moderasi,
  CASE WHEN p.pengusul_id = auth.uid() OR private.is_admin() THEN p.catatan_moderasi END AS catatan_moderasi,
  CASE WHEN p.pengusul_id = auth.uid() OR private.is_admin() THEN p.dimoderasi_oleh END AS dimoderasi_oleh,
  p.dimoderasi_pada
FROM public.proposals p;

CREATE OR REPLACE VIEW public.v_comments
WITH (security_invoker = true, security_barrier = true) AS
SELECT c.id, c.proposal_id, c.isi, c.dibuat_pada,
  COALESCE(private.profile_name(c.user_id), 'Warga') AS penulis_nama
FROM public.comments c;

CREATE OR REPLACE VIEW public.v_proposal_status_history
WITH (security_invoker = true, security_barrier = true) AS
SELECT h.id, h.proposal_id, h.status_lama, h.status_baru, h.diubah_pada,
  COALESCE(private.profile_name(h.diubah_oleh), 'Sistem') AS diubah_oleh_nama
FROM public.proposal_status_history h;

-- v_gap memakai invoker untuk categories/APBD; hanya totals alokasi menggunakan
-- worker internal. Query agregat dan nilai semua kolom tetap identik.
CREATE OR REPLACE VIEW public.v_gap
WITH (security_invoker = true, security_barrier = true) AS
WITH warga AS (
  SELECT kategori, total FROM private.gap_allocation_totals()
),
total_warga AS (
  SELECT COALESCE(sum(total), 0)::bigint AS total FROM warga
),
apbd AS (
  SELECT kategori, COALESCE(sum(nominal_rp), 0)::bigint AS total
  FROM public.apbd_items GROUP BY kategori
),
total_apbd AS (
  SELECT COALESCE(sum(nominal_rp), 0)::bigint AS total FROM public.apbd_items
)
SELECT c.nama AS kategori,
  CASE WHEN tw.total > 0 THEN round(COALESCE(w.total, 0) * 100.0 / tw.total, 2) ELSE 0 END AS persen_warga,
  CASE WHEN ta.total > 0 THEN round(COALESCE(a.total, 0) * 100.0 / ta.total, 2) ELSE 0 END AS persen_apbd,
  CASE
    WHEN tw.total > 0 AND ta.total > 0 THEN round(
      COALESCE(w.total, 0) * 100.0 / tw.total - COALESCE(a.total, 0) * 100.0 / ta.total, 2)
    WHEN tw.total > 0 THEN round(COALESCE(w.total, 0) * 100.0 / tw.total, 2)
    WHEN ta.total > 0 THEN round(-COALESCE(a.total, 0) * 100.0 / ta.total, 2)
    ELSE 0
  END AS gap_poin_persen,
  COALESCE(a.total, 0) AS nominal_apbd,
  COALESCE(w.total, 0) AS total_alokasi_warga
FROM public.categories c
LEFT JOIN warga w ON w.kategori = c.nama
LEFT JOIN apbd a ON a.kategori = c.nama
CROSS JOIN total_warga tw
CROSS JOIN total_apbd ta;

REVOKE ALL ON public.v_proposals, public.v_comments,
  public.v_proposal_status_history, public.v_gap FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_proposals, public.v_comments,
  public.v_proposal_status_history, public.v_gap TO anon, authenticated;

COMMENT ON VIEW public.v_proposals IS
  'Read model invoker; RLS menyaring usulan dan helper internal memberi nama/jumlah suara aman.';
COMMENT ON VIEW public.v_comments IS
  'Read model invoker; RLS menyaring komentar mengikuti moderasi usulan.';
COMMENT ON VIEW public.v_proposal_status_history IS
  'Read model invoker; RLS menyaring riwayat mengikuti moderasi usulan.';
COMMENT ON VIEW public.v_gap IS
  'Agregat invoker dengan total alokasi lintas warga dari helper internal; kolom output tetap agregat.';
