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

-- Snapshot stores bounded, minimal category/id references; no resident names or contact data.
CREATE TABLE private.aspiration_summaries (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 period_from timestamptz NOT NULL, period_to timestamptz NOT NULL,
 moderation text NOT NULL, category text,
 fingerprint text NOT NULL,
 statistics jsonb NOT NULL,
 sources jsonb NOT NULL CHECK (jsonb_typeof(sources)='array'),
 coverage text NOT NULL CHECK (coverage IN ('complete','sample')),
 state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','processing','completed','failed')),
 narrative jsonb,
 lease_token uuid, lease_until timestamptz, attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
 CHECK ((lease_token IS NULL) = (lease_until IS NULL)),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (fingerprint)
);
ALTER TABLE private.aspiration_summaries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.aspiration_summaries FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE private.aspiration_summaries_id_seq FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION private.aspiration_source_data(p_from timestamptz,p_to timestamptz,p_moderation text,p_category text)
RETURNS TABLE(fingerprint text, sources jsonb, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 WITH selected AS (
  SELECT p.id,p.kategori,p.moderasi,p.dibuat_pada,private.proposal_ai_hash(p) AS content_hash,
   r.state AS review_state, r.flags,
   EXISTS (SELECT 1 FROM private.proposal_ai_reviews h WHERE h.proposal_id=p.id) AS has_history
  FROM public.proposals p LEFT JOIN private.proposal_ai_reviews r
   ON r.proposal_id=p.id AND r.content_hash=private.proposal_ai_hash(p) AND r.rules_version='v1'
  WHERE p.dibuat_pada>=p_from AND p.dibuat_pada<p_to
   AND (p_moderation='Semua' OR p.moderasi=p_moderation)
   AND (p_category IS NULL OR p.kategori=p_category)
 ), time_buckets AS (
  SELECT s.*,ntile(10) OVER (PARTITION BY s.kategori ORDER BY s.dibuat_pada,s.id) AS time_bucket FROM selected s
 ), ranked AS (
  SELECT t.*,row_number() OVER (PARTITION BY t.kategori,t.time_bucket ORDER BY t.dibuat_pada,t.id) AS bucket_rank FROM time_buckets t
 ), sample AS (
  SELECT id,kategori FROM ranked ORDER BY bucket_rank,kategori,time_bucket,id LIMIT 100
 )
 SELECT pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  pg_catalog.jsonb_build_array(p_from,p_to,p_moderation,p_category,
   COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(s) ORDER BY s.id) FROM selected s),'[]'::jsonb))::text,'UTF8')),'hex'),
  COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(s) ORDER BY s.id) FROM sample s),'[]'::jsonb),
  (SELECT count(*) FROM selected)
$$;
REVOKE ALL ON FUNCTION private.aspiration_source_data(timestamptz,timestamptz,text,text) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.request_aspiration_summary(p_from timestamptz,p_to timestamptz,p_moderation text DEFAULT 'Menunggu',p_category text DEFAULT NULL)
RETURNS TABLE(summary_id bigint,state text,coverage text,sampling_method text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_stats jsonb; v_fingerprint text; v_sources jsonb; v_total bigint; v_id bigint;
BEGIN
 IF NOT private.is_admin() THEN RAISE EXCEPTION 'Hanya admin' USING ERRCODE='42501'; END IF;
 -- Same SQL statement and MVCC snapshot for the counts and source set.
 SELECT public.get_aspiration_statistics(p_from,p_to,p_moderation,p_category), s.*
 INTO v_stats,v_fingerprint,v_sources,v_total FROM private.aspiration_source_data(p_from,p_to,p_moderation,p_category) s;
 INSERT INTO private.aspiration_summaries(period_from,period_to,moderation,category,fingerprint,statistics,sources,coverage)
 VALUES(p_from,p_to,p_moderation,p_category,v_fingerprint,v_stats,v_sources,
  CASE WHEN v_total>100 THEN 'sample' ELSE 'complete' END)
 ON CONFLICT (fingerprint) DO UPDATE SET fingerprint=EXCLUDED.fingerprint RETURNING id INTO v_id;
 RETURN QUERY SELECT a.id,a.state,a.coverage,'category_time_decile_round_robin_v1'::text FROM private.aspiration_summaries a WHERE a.id=v_id;
END $$;
REVOKE ALL ON FUNCTION public.request_aspiration_summary(timestamptz,timestamptz,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_aspiration_summary(timestamptz,timestamptz,text,text) TO authenticated;

CREATE FUNCTION public.get_aspiration_summary(p_summary_id bigint)
RETURNS TABLE(summary_id bigint,state text,stale boolean,coverage text,sampling_method text,statistics jsonb,sources jsonb,narrative jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT private.is_admin() THEN RAISE EXCEPTION 'Hanya admin' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT a.id,a.state,(a.fingerprint<>s.fingerprint),a.coverage,'category_time_decile_round_robin_v1'::text,a.statistics,a.sources,
  CASE WHEN a.fingerprint<>s.fingerprint THEN NULL ELSE a.narrative END
 FROM private.aspiration_summaries a
 CROSS JOIN LATERAL private.aspiration_source_data(a.period_from,a.period_to,a.moderation,a.category) s
 WHERE a.id=p_summary_id;
END $$;
REVOKE ALL ON FUNCTION public.get_aspiration_summary(bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_aspiration_summary(bigint) TO authenticated;

-- Trusted local worker only. Every claim is fenced with a short-lived lease token.
CREATE FUNCTION private.claim_aspiration_summary()
RETURNS TABLE(summary_id bigint, token uuid, sources jsonb, coverage text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id bigint; v_token uuid;
BEGIN
 UPDATE private.aspiration_summaries a SET state='failed',lease_token=NULL,lease_until=NULL
 WHERE a.state='processing' AND a.lease_until<now() AND a.attempts>=3;
 SELECT a.id INTO v_id FROM private.aspiration_summaries a
 WHERE (a.state='pending' OR (a.state='processing' AND a.lease_until<now())) AND a.attempts<3
 ORDER BY a.id FOR UPDATE SKIP LOCKED LIMIT 1;
 IF v_id IS NULL THEN RETURN; END IF;
 v_token := pg_catalog.gen_random_uuid();
 UPDATE private.aspiration_summaries a SET state='processing',lease_token=v_token,
  lease_until=now()+interval '2 minutes',attempts=attempts+1 WHERE a.id=v_id;
 RETURN QUERY SELECT a.id,v_token,a.sources,a.coverage FROM private.aspiration_summaries a WHERE a.id=v_id;
END $$;
REVOKE ALL ON FUNCTION private.claim_aspiration_summary() FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION private.finish_aspiration_summary(p_id bigint,p_token uuid,p_narrative jsonb,p_failed boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row private.aspiration_summaries%ROWTYPE; v_hash text; v_theme jsonb;
BEGIN
 SELECT * INTO v_row FROM private.aspiration_summaries WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR p_token IS NULL OR v_row.lease_token IS DISTINCT FROM p_token OR v_row.lease_until<=now() THEN
  RAISE EXCEPTION 'Lease tidak valid' USING ERRCODE='42501';
 END IF;
 SELECT s.fingerprint INTO v_hash FROM private.aspiration_source_data(v_row.period_from,v_row.period_to,v_row.moderation,v_row.category) s;
 IF v_hash IS DISTINCT FROM v_row.fingerprint THEN
  UPDATE private.aspiration_summaries SET state='failed',lease_token=NULL,lease_until=NULL WHERE id=p_id;
  RETURN 'stale';
 END IF;
 IF p_failed THEN
  UPDATE private.aspiration_summaries SET state='failed',lease_token=NULL,lease_until=NULL WHERE id=p_id;
  RETURN 'failed';
 END IF;
 IF p_narrative IS NULL OR jsonb_typeof(p_narrative)<>'object' THEN RAISE EXCEPTION 'Narasi tidak valid' USING ERRCODE='22023'; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_narrative) k WHERE k NOT IN ('themes','limitations'))
 OR jsonb_typeof(p_narrative->'themes') IS DISTINCT FROM 'array'
 OR jsonb_typeof(p_narrative->'limitations') IS DISTINCT FROM 'string'
 OR length(p_narrative->>'limitations')>500 OR (p_narrative->>'limitations') ~ '[0-9]'
 OR jsonb_array_length(p_narrative->'themes')>10 THEN
  RAISE EXCEPTION 'Narasi tidak valid' USING ERRCODE='22023';
 END IF;
 FOR v_theme IN SELECT * FROM jsonb_array_elements(p_narrative->'themes') LOOP
  IF jsonb_typeof(v_theme)<>'object' THEN RAISE EXCEPTION 'Tema tidak valid' USING ERRCODE='22023'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(v_theme) k WHERE k NOT IN ('topic','explanation','source_ids'))
   OR jsonb_typeof(v_theme->'topic') IS DISTINCT FROM 'string'
   OR jsonb_typeof(v_theme->'explanation') IS DISTINCT FROM 'string'
   OR length(btrim(v_theme->>'topic')) NOT BETWEEN 1 AND 120
   OR length(btrim(v_theme->>'explanation')) NOT BETWEEN 1 AND 500
   OR (v_theme->>'topic') ~ '[0-9]' OR (v_theme->>'explanation') ~ '[0-9]'
   OR jsonb_typeof(v_theme->'source_ids') IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'Tema tidak valid' USING ERRCODE='22023';
  END IF;
  IF jsonb_array_length(v_theme->'source_ids') NOT BETWEEN 1 AND 100 OR EXISTS (
   SELECT 1 FROM jsonb_array_elements(v_theme->'source_ids') x
   WHERE jsonb_typeof(x)<>'number' OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_row.sources) s WHERE s->'id'=x)
  ) THEN RAISE EXCEPTION 'Referensi tidak valid' USING ERRCODE='22023'; END IF;
 END LOOP;
 IF jsonb_array_length(v_row.sources)=0 AND jsonb_array_length(p_narrative->'themes')>0 THEN RAISE EXCEPTION 'Sumber kosong' USING ERRCODE='22023'; END IF;
 UPDATE private.aspiration_summaries SET state='completed',narrative=p_narrative,lease_token=NULL,lease_until=NULL WHERE id=p_id;
 RETURN 'completed';
END $$;
REVOKE ALL ON FUNCTION private.finish_aspiration_summary(bigint,uuid,jsonb,boolean) FROM PUBLIC,anon,authenticated,service_role;

-- Admin dapat meminta retry secara eksplisit; kuota provider tetap berlaku untuk setiap percobaan.
CREATE FUNCTION public.retry_aspiration_summary(p_summary_id bigint) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row private.aspiration_summaries%ROWTYPE; v_hash text;
BEGIN
 IF NOT private.is_admin() THEN RAISE EXCEPTION 'Hanya admin' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_row FROM private.aspiration_summaries WHERE id=p_summary_id FOR UPDATE;
 IF NOT FOUND OR v_row.state<>'failed' THEN RETURN false; END IF;
 SELECT s.fingerprint INTO v_hash FROM private.aspiration_source_data(v_row.period_from,v_row.period_to,v_row.moderation,v_row.category) s;
 IF v_hash IS DISTINCT FROM v_row.fingerprint THEN RETURN false; END IF;
 UPDATE private.aspiration_summaries SET state='pending',attempts=0,narrative=NULL,lease_token=NULL,lease_until=NULL WHERE id=p_summary_id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.retry_aspiration_summary(bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.retry_aspiration_summary(bigint) TO authenticated;
