-- =============================================================================
-- Musrenbang Digital — RPC untuk invariant lintas baris
--
-- RLS menjaga "baris siapa yang boleh diubah". RPC di bawah menjaga aturan
-- yang tidak bisa dinyatakan sebagai policy, yaitu:
--   1. total alokasi seorang warga tidak melebihi anggaran virtual;
--   2. perubahan status usulan selalu menulis riwayat dan hanya oleh admin.
-- =============================================================================

-- Simpan seluruh alokasi seorang warga secara atomik.
CREATE OR REPLACE FUNCTION public.save_allocations(p_rows jsonb)
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

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Payload alokasi harus berupa array JSON.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_rows) AS r
    WHERE jsonb_typeof(r -> 'kategori') IS DISTINCT FROM 'string'
       OR btrim(r ->> 'kategori') = ''
  ) THEN
    RAISE EXCEPTION 'Setiap alokasi harus punya kategori yang valid.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_rows) AS r
    WHERE jsonb_typeof(r -> 'jumlah') IS DISTINCT FROM 'number'
  ) THEN
    RAISE EXCEPTION 'Jumlah alokasi harus berupa angka.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_rows) AS r
    WHERE (r ->> 'jumlah')::numeric < 0
       OR (r ->> 'jumlah')::numeric <> trunc((r ->> 'jumlah')::numeric)
  ) THEN
    RAISE EXCEPTION 'Jumlah alokasi harus bilangan bulat tidak negatif.'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_rows) AS r
    WHERE NOT EXISTS (
      SELECT 1 FROM public.categories c WHERE c.nama = r ->> 'kategori'
    )
  ) THEN
    RAISE EXCEPTION 'Ada kategori yang tidak dikenal.' USING ERRCODE = '22023';
  END IF;

  IF (
    SELECT COUNT(DISTINCT r ->> 'kategori')
    FROM jsonb_array_elements(p_rows) AS r
  ) <> jsonb_array_length(p_rows) THEN
    RAISE EXCEPTION 'Kategori alokasi tidak boleh duplikat.' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(NULLIF(btrim(nilai), '')::bigint, 10000000)
  INTO v_budget
  FROM public.config
  WHERE kunci = 'virtual_budget_per_warga';

  v_budget := COALESCE(v_budget, 10000000);
  IF v_budget <= 0 THEN
    v_budget := 10000000;
  END IF;

  SELECT COALESCE(SUM((r ->> 'jumlah')::bigint), 0)
  INTO v_total
  FROM jsonb_array_elements(p_rows) AS r;

  IF v_total > v_budget THEN
    RAISE EXCEPTION 'Total alokasi % melebihi anggaran virtual %.', v_total, v_budget
      USING ERRCODE = '22003';
  END IF;

  -- Ganti seluruh alokasi milik user agar kategori yang dikosongkan ikut hilang.
  DELETE FROM public.allocations WHERE user_id = v_user_id;

  INSERT INTO public.allocations (user_id, kategori, jumlah)
  SELECT v_user_id, r ->> 'kategori', (r ->> 'jumlah')::bigint
  FROM jsonb_array_elements(p_rows) AS r;
END;
$$;

COMMENT ON FUNCTION public.save_allocations(jsonb) IS
  'Validasi total anggaran virtual dan ganti alokasi milik user yang login dalam satu transaksi.';

-- Ubah status usulan dan catat riwayat dalam satu transaksi.
CREATE OR REPLACE FUNCTION public.change_proposal_status(
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
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Masuk dulu untuk mengubah status.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mengubah status usulan.' USING ERRCODE = '42501';
  END IF;

  IF p_status IS NULL OR p_status <> ALL (
    ARRAY['Diajukan', 'Diverifikasi', 'Masuk APBD', 'Dikerjakan', 'Selesai']
  ) THEN
    RAISE EXCEPTION 'Status usulan tidak dikenal.' USING ERRCODE = '22023';
  END IF;

  SELECT status INTO v_status_lama
  FROM public.proposals
  WHERE id = p_proposal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usulan tidak ditemukan.' USING ERRCODE = 'P0002';
  END IF;

  IF v_status_lama = p_status THEN
    RETURN;
  END IF;

  UPDATE public.proposals
  SET status = p_status
  WHERE id = p_proposal_id;

  INSERT INTO public.proposal_status_history (
    proposal_id,
    status_lama,
    status_baru,
    diubah_oleh
  )
  VALUES (p_proposal_id, v_status_lama, p_status, v_user_id);
END;
$$;

COMMENT ON FUNCTION public.change_proposal_status(bigint, text) IS
  'Ubah status usulan oleh admin dan tulis riwayat status secara atomik.';

REVOKE ALL ON FUNCTION public.save_allocations(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_allocations(jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.change_proposal_status(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_proposal_status(bigint, text) TO authenticated;
