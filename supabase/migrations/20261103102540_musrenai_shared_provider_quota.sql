-- Kuota percobaan provider terpisah dari kuota pesan pengguna pada migration 11.
CREATE TABLE private.musrenai_provider_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
 daily_limit integer NOT NULL CHECK (daily_limit BETWEEN 1 AND 100000)
);
INSERT INTO private.musrenai_provider_settings(singleton,daily_limit) VALUES (true,300);
CREATE TABLE private.musrenai_provider_attempts (
 feature text NOT NULL CHECK (feature IN ('warga','admin')),
 attempted_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX musrenai_provider_attempts_time_idx ON private.musrenai_provider_attempts(attempted_at);
ALTER TABLE private.musrenai_provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.musrenai_provider_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.musrenai_provider_settings, private.musrenai_provider_attempts FROM PUBLIC, anon, authenticated, service_role;

-- Satu transaksi reservasi untuk setiap percobaan jaringan, termasuk retry.
CREATE FUNCTION public.reserve_musrenai_provider_attempt(p_feature text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 v_now timestamptz; v_start timestamptz; v_limit integer;
BEGIN
 IF p_feature IS NULL OR p_feature NOT IN ('warga','admin') THEN
  RAISE EXCEPTION 'Fitur tidak valid' USING ERRCODE='22023';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(738120261104::bigint);
 v_now := pg_catalog.clock_timestamp();
 v_start := pg_catalog.date_trunc('day', v_now AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta';
 SELECT daily_limit INTO v_limit FROM private.musrenai_provider_settings WHERE singleton;
 IF v_limit IS NULL THEN RAISE EXCEPTION 'Konfigurasi kuota provider tidak tersedia' USING ERRCODE='55000'; END IF;
 DELETE FROM private.musrenai_provider_attempts WHERE attempted_at < v_start;
 IF (SELECT count(*) FROM private.musrenai_provider_attempts WHERE attempted_at >= v_start) >= v_limit THEN RETURN false; END IF;
 INSERT INTO private.musrenai_provider_attempts(feature,attempted_at) VALUES(p_feature,v_now);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reserve_musrenai_provider_attempt(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_musrenai_provider_attempt(text) TO service_role;
