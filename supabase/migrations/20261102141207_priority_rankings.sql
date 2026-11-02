-- Ranking prioritas disimpan terpisah dari allocations; tidak mengubah data lama.
CREATE TABLE public.priority_rankings (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kategori text NOT NULL REFERENCES public.categories(nama) ON UPDATE CASCADE,
  posisi smallint NOT NULL CHECK (posisi BETWEEN 1 AND 10),
  PRIMARY KEY (user_id, kategori),
  UNIQUE (user_id, posisi)
);
ALTER TABLE public.priority_rankings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.priority_rankings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.priority_rankings TO authenticated;
CREATE POLICY priority_rankings_select_own ON public.priority_rankings
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE FUNCTION public.save_priority_rankings(p_rows jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Masuk dulu untuk menyimpan ranking.' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil pengguna belum tersedia.' USING ERRCODE = '42501';
  END IF;
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Ranking harus berupa array.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_rows) <> 10 OR (SELECT count(*) FROM public.categories) <> 10 THEN
    RAISE EXCEPTION 'Ranking memerlukan tepat 10 kategori.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_rows) r
    WHERE jsonb_typeof(r) IS DISTINCT FROM 'object'
       OR jsonb_typeof(r->'kategori') IS DISTINCT FROM 'string'
       OR jsonb_typeof(r->'posisi') IS DISTINCT FROM 'number') THEN
    RAISE EXCEPTION 'Kategori dan posisi ranking tidak valid.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_rows) r
    WHERE (r->>'posisi')::numeric NOT BETWEEN 1 AND 10
       OR (r->>'posisi')::numeric <> trunc((r->>'posisi')::numeric)
       OR NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.nama = r->>'kategori'))
    OR (SELECT count(DISTINCT r->>'kategori') FROM jsonb_array_elements(p_rows) r) <> 10
    OR (SELECT count(DISTINCT (r->>'posisi')::numeric) FROM jsonb_array_elements(p_rows) r) <> 10 THEN
    RAISE EXCEPTION 'Ranking harus memakai semua kategori dan posisi 1–10 tepat sekali.' USING ERRCODE = '22023';
  END IF;
  DELETE FROM public.priority_rankings WHERE user_id = v_user_id;
  INSERT INTO public.priority_rankings(user_id, kategori, posisi)
    SELECT v_user_id, r->>'kategori', (r->>'posisi')::smallint FROM jsonb_array_elements(p_rows) r;
END;
$$;
REVOKE ALL ON FUNCTION public.save_priority_rankings(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_priority_rankings(jsonb) TO authenticated;

CREATE FUNCTION public.get_priority_rankings()
RETURNS TABLE(kategori text, posisi smallint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT r.kategori, r.posisi FROM public.priority_rankings r
  WHERE r.user_id = (SELECT auth.uid()) ORDER BY r.posisi;
$$;
REVOKE ALL ON FUNCTION public.get_priority_rankings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_priority_rankings() TO authenticated;

-- Agregat hanya untuk admin, dan tidak dihasilkan jika partisipan kurang dari dua.
-- Skor Borda: posisi 1 mendapat 10 poin, posisi 10 mendapat 1 poin.
CREATE FUNCTION public.get_priority_ranking_summary()
RETURNS TABLE(kategori text, skor bigint, jumlah_partisipan bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat melihat agregat ranking.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT r.kategori, sum(11 - r.posisi)::bigint, count(*)::bigint
    FROM public.priority_rankings r
    WHERE (SELECT count(DISTINCT all_r.user_id) FROM public.priority_rankings all_r) >= 2
    GROUP BY r.kategori ORDER BY sum(11 - r.posisi) DESC, r.kategori;
END;
$$;
REVOKE ALL ON FUNCTION public.get_priority_ranking_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_priority_ranking_summary() TO authenticated;
