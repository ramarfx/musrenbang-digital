-- Batas laju tulis untuk warga agar satu akun atau bot tidak membanjiri komentar dan usulan.
-- Admin, service role, dan SQL tanpa sesi (auth.uid() kosong) tidak dibatasi.
-- Waktu dibuat dikunci ke now() supaya batas tidak bisa diakali dengan memundurkan tanggal.
CREATE FUNCTION private.limit_citizen_writes() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid(); v_count integer;
BEGIN
 IF v_uid IS NULL OR private.is_admin() THEN RETURN NEW; END IF;
 -- Satu kunci per warga: dua permintaan bersamaan tidak bisa sama-sama lolos di batas.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('citizen-write:' || v_uid::text));
 IF TG_TABLE_NAME = 'comments' THEN
  NEW.dibuat_pada := pg_catalog.now();
  SELECT count(*) INTO v_count FROM public.comments
   WHERE user_id = v_uid AND dibuat_pada > pg_catalog.now() - interval '1 minute';
  IF v_count >= 5 THEN
   RAISE EXCEPTION 'Terlalu banyak komentar. Coba lagi dalam satu menit.';
  END IF;
  SELECT count(*) INTO v_count FROM public.comments
   WHERE user_id = v_uid AND dibuat_pada > pg_catalog.now() - interval '1 day';
  IF v_count >= 50 THEN
   RAISE EXCEPTION 'Batas 50 komentar per hari tercapai. Coba lagi besok.';
  END IF;
 ELSIF TG_TABLE_NAME = 'proposals' THEN
  SELECT count(*) INTO v_count FROM public.proposals
   WHERE pengusul_id = v_uid AND dibuat_pada > pg_catalog.now() - interval '1 day';
  IF v_count >= 5 THEN
   RAISE EXCEPTION 'Batas 5 usulan per hari tercapai. Coba lagi besok.';
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.limit_citizen_writes() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER comments_limit_citizen_writes BEFORE INSERT ON public.comments
 FOR EACH ROW EXECUTE FUNCTION private.limit_citizen_writes();
-- Nama diurutkan setelah proposals_guard_status, yang lebih dulu mengunci dibuat_pada.
CREATE TRIGGER proposals_limit_citizen_writes BEFORE INSERT ON public.proposals
 FOR EACH ROW EXECUTE FUNCTION private.limit_citizen_writes();
