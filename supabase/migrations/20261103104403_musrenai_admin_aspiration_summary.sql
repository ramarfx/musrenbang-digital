-- Statistik selalu dihitung dari proposal yang sesuai filter, tidak oleh model AI.
CREATE FUNCTION public.get_aspiration_statistics(
 p_from timestamptz DEFAULT now() - interval '30 days',
 p_to timestamptz DEFAULT now(),
 p_moderation text DEFAULT 'Menunggu',
 p_category text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_result jsonb;
BEGIN
 IF NOT private.is_admin() THEN RAISE EXCEPTION 'Hanya admin' USING ERRCODE='42501'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_from >= p_to OR p_to - p_from > interval '366 days'
 OR p_moderation IS NULL OR p_moderation NOT IN ('Menunggu','Disetujui','Semua')
 OR (p_category IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.nama=p_category)) THEN
  RAISE EXCEPTION 'Filter tidak valid' USING ERRCODE='22023';
 END IF;
 WITH selected AS (
  SELECT p.id,p.kategori,p.moderasi,
   CASE WHEN r.state='completed' THEN 'analyzed'
        WHEN r.state='failed' THEN 'failed'
        WHEN r.state='stale' OR (r.id IS NULL AND EXISTS (SELECT 1 FROM private.proposal_ai_reviews old WHERE old.proposal_id=p.id)) THEN 'stale'
        ELSE 'not_analyzed' END AS analysis_state,
   CASE WHEN r.state='completed' THEN r.flags ELSE '[]'::jsonb END AS flags
  FROM public.proposals p
  LEFT JOIN private.proposal_ai_reviews r ON r.proposal_id=p.id AND r.content_hash=private.proposal_ai_hash(p) AND r.rules_version='v1'
  WHERE p.dibuat_pada >= p_from AND p.dibuat_pada < p_to
    AND (p_moderation='Semua' OR p.moderasi=p_moderation)
    AND (p_category IS NULL OR p.kategori=p_category)
 ), categories AS (
  SELECT kategori,count(*) AS n FROM selected GROUP BY kategori
 ), moderation AS (
  SELECT moderasi,count(*) AS n FROM selected GROUP BY moderasi
 ), analysis AS (
  SELECT analysis_state,count(*) AS n FROM selected GROUP BY analysis_state
 )
 SELECT pg_catalog.jsonb_build_object(
  'period_from',p_from,'period_to',p_to,'moderation_filter',p_moderation,'category_filter',p_category,
  'total', (SELECT count(*) FROM selected),
  'categories',COALESCE((SELECT jsonb_object_agg(kategori,n) FROM categories),'{}'::jsonb),
  'moderation',COALESCE((SELECT jsonb_object_agg(moderasi,n) FROM moderation),'{}'::jsonb),
  'analysis',COALESCE((SELECT jsonb_object_agg(analysis_state,n) FROM analysis),'{}'::jsonb),
  'indicated', (SELECT count(*) FROM selected WHERE flags ?| ARRAY['spam','promotion','irrelevant'])
 ) INTO v_result;
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.get_aspiration_statistics(timestamptz,timestamptz,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_aspiration_statistics(timestamptz,timestamptz,text,text) TO authenticated;
