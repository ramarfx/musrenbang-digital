-- Service role only. Identity supplied by the Auth-verified Edge Function.
CREATE FUNCTION public.claim_admin_ai_triage(p_admin uuid, p_proposal_id bigint)
RETURNS TABLE(review_id bigint, token uuid, judul text, deskripsi text, kategori text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id bigint; v_hash text; v_token uuid; v_state text;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_admin AND peran='admin') THEN
  RAISE EXCEPTION 'Hanya admin' USING ERRCODE='42501';
 END IF;
 SELECT private.proposal_ai_hash(p) INTO v_hash FROM public.proposals p WHERE p.id=p_proposal_id FOR SHARE;
 IF v_hash IS NULL THEN RAISE EXCEPTION 'Usulan tidak ditemukan' USING ERRCODE='P0002'; END IF;
 INSERT INTO private.proposal_ai_reviews(proposal_id, content_hash)
 VALUES(p_proposal_id,v_hash)
 ON CONFLICT (proposal_id,content_hash,rules_version) DO NOTHING;
 SELECT r.id,r.state INTO v_id,v_state FROM private.proposal_ai_reviews r
 WHERE r.proposal_id=p_proposal_id AND r.content_hash=v_hash AND r.rules_version='v1' FOR UPDATE;
 IF v_state='completed' THEN RETURN; END IF;
 IF v_state='processing' AND EXISTS (SELECT 1 FROM private.proposal_ai_jobs j WHERE j.review_id=v_id AND j.lease_until > now()) THEN
  RAISE EXCEPTION 'Analisis sedang diproses' USING ERRCODE='55P03';
 END IF;
 INSERT INTO private.proposal_ai_jobs(review_id) VALUES(v_id) ON CONFLICT ON CONSTRAINT proposal_ai_jobs_pkey DO NOTHING;
 v_token := pg_catalog.gen_random_uuid();
 UPDATE private.proposal_ai_jobs SET attempts=1, lease_token=v_token,
  lease_until=now()+interval '2 minutes', available_at=now() WHERE private.proposal_ai_jobs.review_id=v_id;
 UPDATE private.proposal_ai_reviews SET state='processing', updated_at=now() WHERE id=v_id;
 INSERT INTO private.proposal_ai_review_events(review_id,event) VALUES(v_id,'leased');
 RETURN QUERY SELECT v_id,v_token,p.judul,p.deskripsi,p.kategori FROM public.proposals p WHERE p.id=p_proposal_id;
END $$;
REVOKE ALL ON FUNCTION public.claim_admin_ai_triage(uuid,bigint) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_admin_ai_triage(uuid,bigint) TO service_role;

CREATE FUNCTION public.finish_admin_ai_triage(p_admin uuid, p_review bigint, p_token uuid, p_flags jsonb, p_reason text, p_model text, p_failed boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_admin AND peran='admin') THEN
  RAISE EXCEPTION 'Hanya admin' USING ERRCODE='42501';
 END IF;
 RETURN private.finish_proposal_ai(p_review,p_token,p_flags,p_reason,p_model,p_failed);
END $$;
REVOKE ALL ON FUNCTION public.finish_admin_ai_triage(uuid,bigint,uuid,jsonb,text,text,boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finish_admin_ai_triage(uuid,bigint,uuid,jsonb,text,text,boolean) TO service_role;
