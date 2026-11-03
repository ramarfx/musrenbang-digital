-- Executed against a local isolated database after the migration; caller owns the transaction.
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('a1000000-0000-4000-8000-000000000001','musrenai-fixture@example.invalid','{}');
DO $$
DECLARE i int; v text; u uuid := 'a1000000-0000-4000-8000-000000000001';
BEGIN
  IF has_function_privilege('anon','public.consume_musrenai_quota(uuid)','EXECUTE') OR has_function_privilege('authenticated','public.consume_musrenai_quota(uuid)','EXECUTE') OR NOT has_function_privilege('service_role','public.consume_musrenai_quota(uuid)','EXECUTE') THEN RAISE EXCEPTION 'grants limiter invalid'; END IF;
  FOR i IN 1..5 LOOP SELECT public.consume_musrenai_quota(u) INTO v; IF v <> 'ok' THEN RAISE EXCEPTION 'first five failed'; END IF; END LOOP;
  IF public.consume_musrenai_quota(u) <> 'minute' THEN RAISE EXCEPTION 'minute limit failed'; END IF;
  DELETE FROM private.musrenai_requests;
  INSERT INTO private.musrenai_requests(user_id,requested_at) SELECT u, clock_timestamp() - interval '2 minutes' FROM generate_series(1,30);
  IF public.consume_musrenai_quota(u) <> 'day' THEN RAISE EXCEPTION 'day limit failed'; END IF;
  DELETE FROM private.musrenai_requests;
  INSERT INTO private.musrenai_requests(user_id,requested_at) SELECT u, clock_timestamp() - interval '2 minutes' FROM generate_series(1,300);
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('a2000000-0000-4000-8000-000000000002','musrenai-other@example.invalid','{}');
  IF public.consume_musrenai_quota('a2000000-0000-4000-8000-000000000002') <> 'global' THEN RAISE EXCEPTION 'global limit failed'; END IF;
  RAISE NOTICE 'LIMITER_ASSERTIONS_OK: grants, minute, day, global';
END $$;
