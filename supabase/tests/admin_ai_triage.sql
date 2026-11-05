\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE SCHEMA private;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE public.profiles(id uuid PRIMARY KEY, peran text NOT NULL);
CREATE TABLE public.proposals(id bigint PRIMARY KEY, judul text, deskripsi text, kategori text, lokasi text, moderasi text);
CREATE FUNCTION private.is_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND peran='admin')
$$;
\i supabase/migrations/20261103100955_musrenai_admin_autoflag.sql
\i supabase/migrations/20261103232447_admin_ai_triage.sql
\i supabase/migrations/20261105024359_admin_ai_triage_failed_state.sql
INSERT INTO public.profiles VALUES
('11111111-1111-4111-8111-111111111111','admin'),
('22222222-2222-4222-8222-222222222222','warga');
INSERT INTO public.proposals VALUES (1,'Jalan rusak','Perbaiki jalan','Jalan','Kota','Menunggu');
DO $$
DECLARE j record; v_state text;
BEGIN
 IF has_function_privilege('anon','public.claim_admin_ai_triage(uuid,bigint)','execute')
 OR has_function_privilege('authenticated','public.claim_admin_ai_triage(uuid,bigint)','execute')
 OR NOT has_function_privilege('service_role','public.claim_admin_ai_triage(uuid,bigint)','execute') THEN
  RAISE EXCEPTION 'grant mismatch';
 END IF;
 BEGIN
  PERFORM public.claim_admin_ai_triage('22222222-2222-4222-8222-222222222222',1);
  RAISE EXCEPTION 'non-admin accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 SELECT * INTO j FROM public.claim_admin_ai_triage('11111111-1111-4111-8111-111111111111',1);
 IF j.review_id IS NULL THEN RAISE EXCEPTION 'missing claim'; END IF;
 v_state := public.finish_admin_ai_triage('11111111-1111-4111-8111-111111111111',j.review_id,j.token,'[]','Relevan','mock',false);
 IF v_state <> 'completed' OR (SELECT moderasi FROM public.proposals WHERE id=1) <> 'Menunggu' THEN
  RAISE EXCEPTION 'result or moderation mismatch';
 END IF;
 IF (SELECT reason FROM private.proposal_ai_reviews WHERE id=j.review_id) <> 'Relevan' THEN RAISE EXCEPTION 'missing result'; END IF;
 IF EXISTS(SELECT * FROM public.claim_admin_ai_triage('11111111-1111-4111-8111-111111111111',1)) THEN RAISE EXCEPTION 'duplicate analysis'; END IF;
 UPDATE public.proposals SET deskripsi='Isi berubah' WHERE id=1;
 SELECT * INTO j FROM public.claim_admin_ai_triage('11111111-1111-4111-8111-111111111111',1);
 UPDATE public.proposals SET deskripsi='Berubah lagi' WHERE id=1;
 v_state := public.finish_admin_ai_triage('11111111-1111-4111-8111-111111111111',j.review_id,j.token,'[]','Relevan','mock',false);
 IF v_state <> 'stale' THEN RAISE EXCEPTION 'stale result accepted'; END IF;
 -- Kegagalan berakhir 'failed' (bukan 'pending') dan admin bisa mengulang.
 INSERT INTO public.proposals VALUES (2,'Got mampet','Bersihkan got','Lingkungan','Kota','Menunggu');
 SELECT * INTO j FROM public.claim_admin_ai_triage('11111111-1111-4111-8111-111111111111',2);
 v_state := public.finish_admin_ai_triage('11111111-1111-4111-8111-111111111111',j.review_id,j.token,'[]',NULL,NULL,true);
 IF v_state <> 'failed' OR (SELECT state FROM private.proposal_ai_reviews WHERE id=j.review_id) <> 'failed' THEN
  RAISE EXCEPTION 'failure not final';
 END IF;
 IF EXISTS(SELECT 1 FROM private.proposal_ai_jobs WHERE review_id=j.review_id) THEN RAISE EXCEPTION 'job not cleared'; END IF;
 SELECT * INTO j FROM public.claim_admin_ai_triage('11111111-1111-4111-8111-111111111111',2);
 IF j.review_id IS NULL THEN RAISE EXCEPTION 'retry blocked'; END IF;
 -- Token salah ditolak dan tidak mengubah attempts.
 BEGIN
  PERFORM public.finish_admin_ai_triage('11111111-1111-4111-8111-111111111111',j.review_id,'00000000-0000-4000-8000-000000000000','[]',NULL,NULL,true);
  RAISE EXCEPTION 'bad token accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'invalid lease' THEN RAISE; END IF;
 END;
 IF (SELECT attempts FROM private.proposal_ai_jobs WHERE review_id=j.review_id) <> 1 THEN RAISE EXCEPTION 'attempts changed by bad token'; END IF;
 v_state := public.finish_admin_ai_triage('11111111-1111-4111-8111-111111111111',j.review_id,j.token,'[]','Relevan','mock',false);
 IF v_state <> 'completed' OR (SELECT moderasi FROM public.proposals WHERE id=2) <> 'Menunggu' THEN
  RAISE EXCEPTION 'retry result or moderation mismatch';
 END IF;
END $$;
ROLLBACK;
SELECT 'TRIAGE_LOCAL_SQL_PASS';
