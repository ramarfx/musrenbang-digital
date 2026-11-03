-- Count all Warga and Admin provider attempts together. The same advisory lock
-- serializes validation, pruning, and reservation across all database sessions.
-- Existing grants on this function are preserved by CREATE OR REPLACE.
CREATE OR REPLACE FUNCTION public.reserve_musrenai_provider_attempt(p_feature text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_now timestamptz;
  v_pacific_start timestamptz;
  v_keep_from timestamptz;
  v_limit integer;
BEGIN
  IF p_feature IS NULL OR p_feature NOT IN ('warga', 'admin') THEN
    RAISE EXCEPTION 'Fitur tidak valid' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(738120261104::bigint);
  v_now := pg_catalog.clock_timestamp();
  v_pacific_start := pg_catalog.date_trunc('day', v_now AT TIME ZONE 'America/Los_Angeles')
    AT TIME ZONE 'America/Los_Angeles';
  v_keep_from := LEAST(v_now - interval '24 hours', v_pacific_start);

  SELECT LEAST(daily_limit, 300) INTO v_limit
    FROM private.musrenai_provider_settings WHERE singleton;
  IF v_limit IS NULL OR v_limit < 1 THEN
    RAISE EXCEPTION 'Konfigurasi kuota provider tidak tersedia' USING ERRCODE = '55000';
  END IF;

  DELETE FROM private.musrenai_provider_attempts WHERE attempted_at < v_keep_from;
  IF (SELECT count(*) FROM private.musrenai_provider_attempts
      WHERE attempted_at > v_now - interval '60 seconds') >= 10
    OR (SELECT count(*) FROM private.musrenai_provider_attempts
        WHERE attempted_at > v_now - interval '24 hours') >= v_limit
    OR (SELECT count(*) FROM private.musrenai_provider_attempts
        WHERE attempted_at >= v_pacific_start) >= v_limit THEN
    RETURN false;
  END IF;

  INSERT INTO private.musrenai_provider_attempts(feature, attempted_at)
    VALUES (p_feature, v_now);
  RETURN true;
END $$;
