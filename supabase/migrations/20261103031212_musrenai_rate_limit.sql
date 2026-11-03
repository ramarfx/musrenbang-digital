-- Counter operasional, tanpa isi percakapan. Tidak dapat diakses role API biasa.
CREATE TABLE private.musrenai_requests (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX musrenai_requests_user_time ON private.musrenai_requests(user_id, requested_at);
CREATE INDEX musrenai_requests_time ON private.musrenai_requests(requested_at);
REVOKE ALL ON private.musrenai_requests FROM PUBLIC, anon, authenticated;

-- Konfigurasi hanya dapat dikelola administrator database melalui jalur tepercaya.
CREATE TABLE private.musrenai_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  global_daily_limit integer NOT NULL CHECK (global_daily_limit BETWEEN 1 AND 100000)
);
INSERT INTO private.musrenai_settings(singleton, global_daily_limit) VALUES (true, 300);
REVOKE ALL ON private.musrenai_settings FROM PUBLIC, anon, authenticated, service_role;

-- 300/hari adalah nilai awal operasional, bukan jaminan batas biaya provider.
CREATE FUNCTION public.consume_musrenai_quota(p_user_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_global_limit integer;
  v_now timestamptz := clock_timestamp();
  v_day_start timestamptz := (date_trunc('day', v_now AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta');
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Identitas tidak valid' USING ERRCODE = '42501';
  END IF;
  -- Satu lock untuk semua instance melindungi batas global dan per akun sekaligus.
  PERFORM pg_catalog.pg_advisory_xact_lock(738120261103::bigint);
  v_now := clock_timestamp();
  v_day_start := (date_trunc('day', v_now AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta');
  SELECT global_daily_limit INTO v_global_limit FROM private.musrenai_settings WHERE singleton;
  IF v_global_limit IS NULL THEN RAISE EXCEPTION 'Konfigurasi limiter tidak tersedia' USING ERRCODE = '55000'; END IF;
  DELETE FROM private.musrenai_requests WHERE requested_at < LEAST(v_day_start, v_now - interval '60 seconds');
  IF (SELECT count(*) FROM private.musrenai_requests WHERE user_id=p_user_id AND requested_at > v_now - interval '60 seconds') >= 5 THEN RETURN 'minute'; END IF;
  IF (SELECT count(*) FROM private.musrenai_requests WHERE user_id=p_user_id AND requested_at >= v_day_start) >= 30 THEN RETURN 'day'; END IF;
  IF (SELECT count(*) FROM private.musrenai_requests WHERE requested_at >= v_day_start) >= v_global_limit THEN RETURN 'global'; END IF;
  INSERT INTO private.musrenai_requests(user_id, requested_at) VALUES (p_user_id, v_now);
  RETURN 'ok';
END;
$$;
REVOKE ALL ON FUNCTION public.consume_musrenai_quota(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_musrenai_quota(uuid) TO service_role;
