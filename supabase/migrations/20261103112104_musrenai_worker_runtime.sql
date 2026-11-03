-- Role is NOLOGIN and has no table privileges. Binding a login requires separate operator approval.
CREATE ROLE musrenai_worker_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA private TO musrenai_worker_runtime;
GRANT EXECUTE ON FUNCTION private.reconcile_proposal_ai(integer) TO musrenai_worker_runtime;
GRANT EXECUTE ON FUNCTION private.claim_proposal_ai() TO musrenai_worker_runtime;
GRANT EXECUTE ON FUNCTION private.finish_proposal_ai(bigint,uuid,jsonb,text,text,boolean) TO musrenai_worker_runtime;
GRANT EXECUTE ON FUNCTION private.claim_aspiration_summary() TO musrenai_worker_runtime;
GRANT EXECUTE ON FUNCTION private.finish_aspiration_summary(bigint,uuid,jsonb,boolean) TO musrenai_worker_runtime;
GRANT EXECUTE ON FUNCTION public.reserve_musrenai_provider_attempt(text) TO musrenai_worker_runtime;

-- No cron job is created. Only completed/failed AI cache rows may be pruned.
CREATE FUNCTION private.prune_aspiration_summaries(p_before timestamptz,p_limit integer DEFAULT 100)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n integer;
BEGIN
 IF p_before IS NULL OR p_before > now()-interval '30 days' OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 1000 THEN
  RAISE EXCEPTION 'Parameter retensi tidak valid' USING ERRCODE='22023';
 END IF;
 WITH candidates AS (
  SELECT id FROM private.aspiration_summaries
  WHERE created_at<p_before AND state IN ('completed','failed') ORDER BY id FOR UPDATE SKIP LOCKED LIMIT p_limit
 ), removed AS (DELETE FROM private.aspiration_summaries a USING candidates c WHERE a.id=c.id RETURNING a.id)
 SELECT count(*) INTO n FROM removed;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION private.prune_aspiration_summaries(timestamptz,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION private.prune_aspiration_summaries(timestamptz,integer) TO musrenai_worker_runtime;
