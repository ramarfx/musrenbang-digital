-- Usulan serupa untuk admin: kemiripan teks (pg_trgm) dan kedekatan lokasi, tanpa AI.
-- Membantu menemukan usulan ganda tentang masalah yang sama tanpa memakai kuota Gemini.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE FUNCTION public.get_similar_proposals(p_proposal_id bigint, p_limit integer DEFAULT 3)
RETURNS TABLE(id bigint, judul text, kategori text, moderasi text, status text, kemiripan real, jarak_m integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE src public.proposals%ROWTYPE;
BEGIN
 IF NOT private.is_admin() THEN RAISE EXCEPTION 'Hanya admin' USING ERRCODE = '42501'; END IF;
 SELECT * INTO src FROM public.proposals p WHERE p.id = p_proposal_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Usulan tidak ditemukan' USING ERRCODE = 'P0002'; END IF;
 RETURN QUERY
 WITH kandidat AS (
  SELECT p.id AS pid, p.judul AS pjudul, p.kategori AS pkategori, p.moderasi AS pmoderasi,
         p.status AS pstatus,
         extensions.similarity(lower(src.judul || ' ' || src.deskripsi),
                               lower(p.judul || ' ' || p.deskripsi)) AS skor,
         CASE WHEN src.latitude IS NULL OR src.longitude IS NULL
                OR p.latitude IS NULL OR p.longitude IS NULL THEN NULL
              -- Rumus haversine; cukup akurat untuk jarak antarusulan dalam satu kota.
              ELSE round(6371000 * 2 * asin(sqrt(
                     power(sin(radians(p.latitude - src.latitude) / 2), 2)
                     + cos(radians(src.latitude)) * cos(radians(p.latitude))
                     * power(sin(radians(p.longitude - src.longitude) / 2), 2))))::integer
         END AS jarak
  FROM public.proposals p
  WHERE p.id <> src.id)
 SELECT k.pid, k.pjudul, k.pkategori, k.pmoderasi, k.pstatus, k.skor, k.jarak
 FROM kandidat k
 -- Teks sangat mirip, atau kategori sama di lokasi berdekatan dengan teks cukup mirip.
 WHERE k.skor >= 0.3
    OR (k.pkategori = src.kategori AND k.jarak IS NOT NULL AND k.jarak <= 500 AND k.skor >= 0.15)
 ORDER BY k.skor DESC, k.jarak NULLS LAST
 LIMIT LEAST(GREATEST(COALESCE(p_limit, 3), 1), 10);
END $$;

REVOKE ALL ON FUNCTION public.get_similar_proposals(bigint, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_similar_proposals(bigint, integer) TO authenticated;
