-- Auto-flagging is advisory only. No moderation column is modified.
CREATE TABLE private.proposal_ai_reviews (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 proposal_id bigint NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
 content_hash text NOT NULL,
 rules_version text NOT NULL DEFAULT 'v1',
 state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','processing','completed','failed','stale')),
 flags jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(flags) = 'array'),
 reason text,
 model text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(proposal_id, content_hash, rules_version)
);
CREATE TABLE private.proposal_ai_review_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 review_id bigint NOT NULL REFERENCES private.proposal_ai_reviews(id) ON DELETE CASCADE,
 event text NOT NULL CHECK (event IN ('queued','leased','completed','retry','failed','stale')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE private.proposal_ai_jobs (
 review_id bigint PRIMARY KEY REFERENCES private.proposal_ai_reviews(id) ON DELETE CASCADE,
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
 available_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, lease_token uuid,
 CHECK ((lease_until IS NULL) = (lease_token IS NULL))
);
ALTER TABLE private.proposal_ai_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.proposal_ai_review_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.proposal_ai_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.proposal_ai_reviews, private.proposal_ai_review_events, private.proposal_ai_jobs FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE private.proposal_ai_reviews_id_seq, private.proposal_ai_review_events_id_seq FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION private.proposal_ai_hash(p public.proposals) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
 SELECT pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.jsonb_build_array(p.judul,p.deskripsi,p.kategori,p.lokasi)::text,'UTF8')),'hex')
$$;
REVOKE ALL ON FUNCTION private.proposal_ai_hash(public.proposals) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION private.enqueue_proposal_ai(p_id bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id bigint; v_hash text;
BEGIN
 SELECT private.proposal_ai_hash(p) INTO v_hash FROM public.proposals p WHERE p.id=p_id;
 IF v_hash IS NULL THEN RETURN; END IF;
 INSERT INTO private.proposal_ai_reviews(proposal_id, content_hash) VALUES (p_id,v_hash)
 ON CONFLICT (proposal_id,content_hash,rules_version) DO NOTHING RETURNING id INTO v_id;
 IF v_id IS NOT NULL THEN
  INSERT INTO private.proposal_ai_jobs(review_id) VALUES(v_id);
  INSERT INTO private.proposal_ai_review_events(review_id,event) VALUES(v_id,'queued');
 END IF;
END $$;
REVOKE ALL ON FUNCTION private.enqueue_proposal_ai(bigint) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION private.proposal_ai_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF TG_OP = 'INSERT' OR private.proposal_ai_hash(NEW) IS DISTINCT FROM private.proposal_ai_hash(OLD) THEN
  BEGIN PERFORM private.enqueue_proposal_ai(NEW.id); EXCEPTION WHEN OTHERS THEN NULL; END;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.proposal_ai_trigger() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER proposal_ai_enqueue AFTER INSERT OR UPDATE OF judul, deskripsi, kategori, lokasi ON public.proposals
FOR EACH ROW EXECUTE FUNCTION private.proposal_ai_trigger();

-- Trusted database worker only; reconcile recovers missed enqueue without resetting failures.
CREATE FUNCTION private.reconcile_proposal_ai(p_limit integer DEFAULT 100) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p record; n integer := 0;
BEGIN
 IF p_limit NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'invalid limit'; END IF;
 FOR p IN SELECT q.id FROM public.proposals q WHERE NOT EXISTS (
  SELECT 1 FROM private.proposal_ai_reviews r WHERE r.proposal_id=q.id
   AND r.content_hash=private.proposal_ai_hash(q) AND r.rules_version='v1') ORDER BY q.id LIMIT p_limit
 LOOP PERFORM private.enqueue_proposal_ai(p.id); n := n+1; END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION private.reconcile_proposal_ai(integer) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.get_proposal_ai_review(p_proposal_id bigint)
RETURNS TABLE(state text, flags jsonb, reason text, model text, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT private.is_admin() THEN RAISE EXCEPTION 'Hanya admin' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT COALESCE(r.state,'not_analyzed'), COALESCE(r.flags,'[]'::jsonb), r.reason, r.model, r.updated_at
 FROM public.proposals p LEFT JOIN private.proposal_ai_reviews r
  ON r.proposal_id=p.id AND r.content_hash=private.proposal_ai_hash(p) AND r.rules_version='v1'
 WHERE p.id=p_proposal_id;
END $$;
REVOKE ALL ON FUNCTION public.get_proposal_ai_review(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_proposal_ai_review(bigint) TO authenticated;


-- The worker uses a direct, trusted database connection; no browser-facing grants.
CREATE FUNCTION private.claim_proposal_ai() RETURNS TABLE(review_id bigint, token uuid, judul text, deskripsi text, kategori text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id bigint; v_token uuid;
BEGIN
 WITH expired AS (
  SELECT x.review_id FROM private.proposal_ai_jobs x
  WHERE x.attempts = 3 AND x.lease_until < now() FOR UPDATE SKIP LOCKED
 ), changed AS (
  UPDATE private.proposal_ai_reviews SET state='failed',updated_at=now()
  WHERE id IN (SELECT e.review_id FROM expired e) RETURNING id
 ), events AS (
  INSERT INTO private.proposal_ai_review_events(review_id,event)
  SELECT changed.id,'failed' FROM changed RETURNING private.proposal_ai_review_events.review_id
 ) DELETE FROM private.proposal_ai_jobs j WHERE j.review_id IN (SELECT e.review_id FROM events e);
 SELECT j.review_id INTO v_id FROM private.proposal_ai_jobs j
 WHERE j.available_at <= now() AND (j.lease_until IS NULL OR j.lease_until < now()) AND j.attempts < 3
 ORDER BY j.available_at,j.review_id FOR UPDATE SKIP LOCKED LIMIT 1;
 IF v_id IS NULL THEN RETURN; END IF;
 v_token := pg_catalog.gen_random_uuid();
 UPDATE private.proposal_ai_jobs SET attempts=attempts+1, lease_token=v_token, lease_until=now()+interval '2 minutes' WHERE private.proposal_ai_jobs.review_id=v_id;
 UPDATE private.proposal_ai_reviews SET state='processing',updated_at=now() WHERE id=v_id;
 INSERT INTO private.proposal_ai_review_events(review_id,event) VALUES(v_id,'leased');
 RETURN QUERY SELECT v_id,v_token,p.judul,p.deskripsi,p.kategori FROM private.proposal_ai_reviews r JOIN public.proposals p ON p.id=r.proposal_id WHERE r.id=v_id;
END $$;
REVOKE ALL ON FUNCTION private.claim_proposal_ai() FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION private.finish_proposal_ai(p_review bigint, p_token uuid, p_flags jsonb, p_reason text, p_model text DEFAULT NULL, p_failed boolean DEFAULT false) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE j private.proposal_ai_jobs%ROWTYPE; r private.proposal_ai_reviews%ROWTYPE; current_hash text; result text;
BEGIN
 SELECT * INTO j FROM private.proposal_ai_jobs WHERE review_id=p_review FOR UPDATE;
 IF NOT FOUND OR j.lease_token IS DISTINCT FROM p_token OR p_token IS NULL OR j.lease_until <= now() THEN RAISE EXCEPTION 'invalid lease'; END IF;
 SELECT * INTO r FROM private.proposal_ai_reviews WHERE id=p_review FOR UPDATE;
 SELECT private.proposal_ai_hash(p) INTO current_hash FROM public.proposals p WHERE p.id=r.proposal_id FOR SHARE;
 IF current_hash IS DISTINCT FROM r.content_hash THEN result := 'stale';
 ELSIF p_failed AND j.attempts < 3 THEN result := 'retry';
 ELSIF p_failed THEN result := 'failed';
 ELSE
  IF p_flags IS NULL OR pg_catalog.jsonb_typeof(p_flags) <> 'array' OR pg_catalog.jsonb_array_length(p_flags)>3 OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(p_flags) x WHERE pg_catalog.jsonb_typeof(x)<>'string' OR x #>> '{}' NOT IN ('spam','promotion','irrelevant','needs_review')) OR p_reason IS NULL OR pg_catalog.length(pg_catalog.btrim(p_reason)) NOT BETWEEN 1 AND 500 OR pg_catalog.length(COALESCE(p_model,'')) > 80 THEN RAISE EXCEPTION 'invalid result'; END IF;
  result := 'completed';
 END IF;
 UPDATE private.proposal_ai_reviews SET state=CASE WHEN result='retry' THEN 'pending' ELSE result END,
  flags=CASE WHEN result='completed' THEN p_flags ELSE '[]'::jsonb END,
  reason=CASE WHEN result='completed' THEN p_reason ELSE NULL END,
  model=CASE WHEN result='completed' THEN p_model ELSE NULL END,updated_at=now() WHERE id=p_review;
 INSERT INTO private.proposal_ai_review_events(review_id,event) VALUES(p_review,result);
 IF result='retry' THEN UPDATE private.proposal_ai_jobs SET lease_token=NULL,lease_until=NULL,available_at=now()+interval '1 minute' * j.attempts WHERE review_id=p_review;
 ELSE DELETE FROM private.proposal_ai_jobs WHERE review_id=p_review; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION private.finish_proposal_ai(bigint,uuid,jsonb,text,text,boolean) FROM PUBLIC, anon, authenticated, service_role;
