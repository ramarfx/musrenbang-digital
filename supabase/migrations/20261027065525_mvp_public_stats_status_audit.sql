-- Tahap MVP: provenance APBD, audit status yang wajib bercatatan, dan statistik.
-- Tidak menghapus data, mengubah nominal, atau mengubah rumus alokasi.
-- Label verified lama tanpa tautan sumber diturunkan menjadi perlu_lampiran.

ALTER TABLE public.apbd_items
  ADD COLUMN sumber_url text,
  ADD COLUMN catatan_pemetaan text,
  ADD CONSTRAINT apbd_items_sumber_url_format CHECK (
    sumber_url IS NULL OR (
      sumber_url = btrim(sumber_url)
      AND sumber_url ~ '^https?://[^[:space:]]+$'
    )
  ),
  ADD CONSTRAINT apbd_items_catatan_pemetaan_length CHECK (
    catatan_pemetaan IS NULL OR char_length(catatan_pemetaan) <= 4000
  );

-- Data lama yang diberi label verified tanpa tautan tidak boleh masuk agregat
-- publik. Status saja yang diturunkan; nominal dan sumber teks tetap dipertahankan.
UPDATE public.apbd_items
SET status_verifikasi = 'perlu_lampiran'
WHERE status_verifikasi = 'verified_program'
  AND sumber_url IS NULL;

ALTER TABLE public.proposal_status_history
  ADD COLUMN catatan text,
  ADD CONSTRAINT proposal_status_history_catatan_length CHECK (
    catatan IS NULL OR char_length(catatan) <= 2000
  );

-- Verifikasi program harus memiliki tautan sumber. Data lama tanpa tautan tetap
-- terbaca dan tidak dihapus, tetapi tidak dapat diperbarui sebagai verified.
CREATE FUNCTION public.guard_apbd_provenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(char_length(btrim(NEW.sumber)), 0) = 0 THEN
      RAISE EXCEPTION 'Sumber APBD wajib diisi.' USING ERRCODE = '22023';
    END IF;
    IF NEW.status_verifikasi = 'verified_program' AND NEW.sumber_url IS NULL THEN
      RAISE EXCEPTION 'Program APBD terverifikasi wajib memiliki URL sumber.' USING ERRCODE = '22023';
    END IF;
  ELSE
    IF (NEW.sumber IS DISTINCT FROM OLD.sumber OR NEW.status_verifikasi = 'verified_program')
       AND COALESCE(char_length(btrim(NEW.sumber)), 0) = 0 THEN
      RAISE EXCEPTION 'Sumber APBD wajib diisi.' USING ERRCODE = '22023';
    END IF;
    IF NEW.status_verifikasi = 'verified_program'
       AND (
         NEW.status_verifikasi IS DISTINCT FROM OLD.status_verifikasi
         OR NEW.sumber_url IS DISTINCT FROM OLD.sumber_url
         OR NEW.kategori IS DISTINCT FROM OLD.kategori
         OR NEW.nominal_rp IS DISTINCT FROM OLD.nominal_rp
         OR NEW.tahun IS DISTINCT FROM OLD.tahun
         OR NEW.kota IS DISTINCT FROM OLD.kota
         OR NEW.sumber IS DISTINCT FROM OLD.sumber
         OR NEW.catatan_pemetaan IS DISTINCT FROM OLD.catatan_pemetaan
       )
       AND NEW.sumber_url IS NULL THEN
      RAISE EXCEPTION 'Program APBD terverifikasi wajib memiliki URL sumber.' USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_apbd_provenance() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER apbd_items_guard_provenance
  BEFORE INSERT OR UPDATE OF kategori, nominal_rp, tahun, kota, sumber,
    status_verifikasi, sumber_url, catatan_pemetaan
  ON public.apbd_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_apbd_provenance();

-- Estimasi usulan harus positif pada jalur API maupun service-role. Trigger ini
-- tidak memblokir edit field lain pada legacy row yang mungkin masih bernilai 0.
CREATE FUNCTION public.guard_proposal_estimate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.estimasi_biaya IS NULL OR NEW.estimasi_biaya <= 0 THEN
    RAISE EXCEPTION 'Estimasi biaya harus lebih besar dari nol.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_proposal_estimate() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER proposals_guard_positive_estimate
  BEFORE INSERT OR UPDATE OF estimasi_biaya ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.guard_proposal_estimate();

-- Baseline legacy tidak mengklaim seluruh histori lama diketahui. Jika ada
-- transisi tersimpan, catat status_lama dari transisi paling awal. Tanpa transisi,
-- catat snapshot status saat migration. Catatan menjelaskan batas bukti tersebut.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.proposal_status_history
    WHERE status_lama IS NULL
    GROUP BY proposal_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Ada proposal dengan lebih dari satu riwayat awal; rekonsiliasi diperlukan.';
  END IF;

END;
$$;

INSERT INTO public.proposal_status_history (
  proposal_id, status_lama, status_baru, diubah_oleh, diubah_pada, catatan
)
SELECT
  p.id,
  NULL,
  COALESCE(first_transition.status_lama, p.status),
  NULL,
  CASE
    WHEN first_transition.id IS NOT NULL
      THEN first_transition.diubah_pada - interval '1 microsecond'
    ELSE pg_catalog.now()
  END,
  CASE
    WHEN first_transition.id IS NOT NULL
      THEN 'Status sebelum transisi paling awal yang tersimpan; riwayat terdahulu mungkin tidak lengkap.'
    ELSE 'Snapshot status saat migration; riwayat sebelumnya tidak tersedia.'
  END
FROM public.proposals p
LEFT JOIN LATERAL (
  SELECT h.id, h.status_lama, h.diubah_pada
  FROM public.proposal_status_history h
  WHERE h.proposal_id = p.id
    AND h.status_lama IS NOT NULL
  ORDER BY h.diubah_pada, h.id
  LIMIT 1
) first_transition ON true
WHERE NOT EXISTS (
  SELECT 1 FROM public.proposal_status_history h
  WHERE h.proposal_id = p.id AND h.status_lama IS NULL
);

CREATE UNIQUE INDEX proposal_status_history_one_initial_idx
  ON public.proposal_status_history (proposal_id)
  WHERE status_lama IS NULL;

-- Marker perubahan status hanya dapat dibuat helper tepercaya dan hanya hidup
-- selama transaksi. Tabel private tidak memiliki grants untuk role API.
CREATE TABLE private.proposal_status_change_context (
  transaction_id bigint NOT NULL,
  proposal_id bigint NOT NULL,
  actor_id uuid NOT NULL,
  catatan text NOT NULL CHECK (char_length(btrim(catatan)) BETWEEN 1 AND 2000),
  PRIMARY KEY (transaction_id, proposal_id)
);
ALTER TABLE private.proposal_status_change_context ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.proposal_status_change_context FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.status_change_context_valid(p_proposal_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND private.is_admin()
    AND EXISTS (
      SELECT 1
      FROM private.proposal_status_change_context c
      WHERE c.transaction_id = pg_catalog.txid_current()
        AND c.proposal_id = p_proposal_id
        AND c.actor_id = auth.uid()
    );
$$;
REVOKE ALL ON FUNCTION private.status_change_context_valid(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.status_change_context_valid(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_proposal_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
     AND NOT private.status_change_context_valid(OLD.id) THEN
    RAISE EXCEPTION 'Perubahan status wajib memakai RPC bercatatan.' USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status <> 'Diajukan' OR NEW.moderasi <> 'Menunggu'
         OR NEW.catatan_moderasi IS NOT NULL OR NEW.dimoderasi_oleh IS NOT NULL
         OR NEW.dimoderasi_pada IS NOT NULL THEN
        RAISE EXCEPTION 'Usulan baru wajib Diajukan dan Menunggu moderasi.' USING ERRCODE = '42501';
      END IF;
      NEW.dibuat_pada := pg_catalog.now();
      NEW.diubah_pada := pg_catalog.now();
    ELSE
      IF OLD.moderasi <> 'Menunggu'
         OR NEW.id IS DISTINCT FROM OLD.id
         OR NEW.pengusul_id IS DISTINCT FROM OLD.pengusul_id
         OR NEW.dibuat_pada IS DISTINCT FROM OLD.dibuat_pada
         OR NEW.status IS DISTINCT FROM OLD.status
         OR NEW.moderasi IS DISTINCT FROM OLD.moderasi
         OR NEW.catatan_moderasi IS DISTINCT FROM OLD.catatan_moderasi
         OR NEW.dimoderasi_oleh IS DISTINCT FROM OLD.dimoderasi_oleh
         OR NEW.dimoderasi_pada IS DISTINCT FROM OLD.dimoderasi_pada THEN
        RAISE EXCEPTION 'Warga hanya boleh mengedit isi usulan miliknya yang Menunggu.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  IF auth.uid() IS NOT NULL AND public.is_admin() THEN
    IF TG_OP = 'INSERT' OR NEW.moderasi IS DISTINCT FROM OLD.moderasi
       OR NEW.catatan_moderasi IS DISTINCT FROM OLD.catatan_moderasi THEN
      NEW.dimoderasi_oleh := CASE WHEN NEW.moderasi = 'Menunggu' THEN NULL ELSE auth.uid() END;
      NEW.dimoderasi_pada := CASE WHEN NEW.moderasi = 'Menunggu' THEN NULL ELSE pg_catalog.now() END;
    ELSIF NEW.dimoderasi_oleh IS DISTINCT FROM OLD.dimoderasi_oleh
       OR NEW.dimoderasi_pada IS DISTINCT FROM OLD.dimoderasi_pada THEN
      RAISE EXCEPTION 'Identitas dan waktu moderasi ditentukan sistem.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION private.record_initial_proposal_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.proposal_status_history (
    proposal_id, status_lama, status_baru, diubah_oleh, diubah_pada, catatan
  ) VALUES (
    NEW.id, NULL, NEW.status, NEW.pengusul_id, NEW.dibuat_pada,
    CASE WHEN NEW.status = 'Diajukan' THEN 'Usulan diajukan.'
      ELSE 'Status awal saat usulan dicatat.' END
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.record_initial_proposal_status() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER proposals_record_initial_status
  AFTER INSERT ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION private.record_initial_proposal_status();

CREATE FUNCTION private.record_proposal_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_catatan text;
BEGIN
  DELETE FROM private.proposal_status_change_context c
  WHERE c.transaction_id = pg_catalog.txid_current()
    AND c.proposal_id = NEW.id
    AND c.actor_id = auth.uid()
  RETURNING c.catatan INTO v_catatan;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Konteks perubahan status tidak ditemukan.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.proposal_status_history (
    proposal_id, status_lama, status_baru, diubah_oleh, diubah_pada, catatan
  ) VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), pg_catalog.now(), v_catatan);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.record_proposal_status_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER proposals_record_status_change
  AFTER UPDATE OF status ON public.proposals
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION private.record_proposal_status_change();

CREATE FUNCTION private.change_proposal_status_with_note(
  p_proposal_id bigint,
  p_status text,
  p_catatan text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_status_lama text;
  v_catatan text := NULLIF(btrim(p_catatan), '');
BEGIN
  IF v_actor_id IS NULL OR NOT private.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mengubah status usulan.' USING ERRCODE = '42501';
  END IF;
  IF p_status IS NULL OR p_status <> ALL (
    ARRAY['Diajukan', 'Diverifikasi', 'Masuk APBD', 'Dikerjakan', 'Selesai']
  ) THEN
    RAISE EXCEPTION 'Status usulan tidak dikenal.' USING ERRCODE = '22023';
  END IF;
  IF v_catatan IS NULL OR char_length(v_catatan) > 2000 THEN
    RAISE EXCEPTION 'Catatan perubahan status wajib berisi 1 sampai 2000 karakter.'
      USING ERRCODE = '22023';
  END IF;

  SELECT p.status INTO v_status_lama
  FROM public.proposals p
  WHERE p.id = p_proposal_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usulan tidak ditemukan.' USING ERRCODE = 'P0002';
  END IF;
  IF v_status_lama = p_status THEN
    RETURN;
  END IF;

  INSERT INTO private.proposal_status_change_context (
    transaction_id, proposal_id, actor_id, catatan
  ) VALUES (pg_catalog.txid_current(), p_proposal_id, v_actor_id, v_catatan);

  UPDATE public.proposals SET status = p_status WHERE id = p_proposal_id;
END;
$$;
REVOKE ALL ON FUNCTION private.change_proposal_status_with_note(bigint, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.change_proposal_status_with_note(bigint, text, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.change_proposal_status_with_note(
  p_proposal_id bigint,
  p_status text,
  p_catatan text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.change_proposal_status_with_note(p_proposal_id, p_status, p_catatan);
END;
$$;
REVOKE ALL ON FUNCTION public.change_proposal_status_with_note(bigint, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_proposal_status_with_note(bigint, text, text)
  TO authenticated;

-- Pertahankan nama RPC lama agar klien mendapat error yang menjelaskan kontrak baru.
-- Perubahan status tanpa catatan tidak lagi diterima.
CREATE OR REPLACE FUNCTION public.change_proposal_status(p_proposal_id bigint, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Gunakan change_proposal_status_with_note dan kirim catatan admin.'
    USING ERRCODE = '22023';
END;
$$;
REVOKE ALL ON FUNCTION public.change_proposal_status(bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_proposal_status(bigint, text) TO authenticated;
COMMENT ON FUNCTION public.change_proposal_status(bigint, text) IS
  'Deprecated. Gunakan change_proposal_status_with_note dengan catatan wajib.';

-- Helper agregat tidak mengembalikan ID atau baris individual.
CREATE FUNCTION private.public_statistics()
RETURNS TABLE (
  jumlah_usulan_disetujui bigint,
  jumlah_pemberi_suara bigint,
  jumlah_partisipan_alokasi bigint,
  total_alokasi_warga bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT count(*)::bigint FROM public.proposals p WHERE p.moderasi = 'Disetujui'),
    (SELECT count(DISTINCT v.user_id)::bigint
      FROM public.votes v JOIN public.proposals p ON p.id = v.proposal_id
      WHERE p.moderasi = 'Disetujui'),
    (SELECT count(*)::bigint FROM (
      SELECT a.user_id FROM public.allocations a
      GROUP BY a.user_id HAVING sum(a.jumlah) > 0
    ) participants),
    (SELECT COALESCE(sum(a.jumlah), 0)::bigint FROM public.allocations a);
$$;
REVOKE ALL ON FUNCTION private.public_statistics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.public_statistics() TO anon, authenticated;

CREATE OR REPLACE VIEW public.v_public_stats
WITH (security_invoker = true, security_barrier = true)
AS
SELECT * FROM private.public_statistics();
REVOKE ALL ON public.v_public_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_public_stats TO anon, authenticated;
COMMENT ON VIEW public.v_public_stats IS
  'Statistik publik agregat untuk usulan disetujui, pemberi suara, dan alokasi; tanpa identitas warga.';

-- Satu baris statistik admin. RLS pada tabel sumber tetap diterapkan karena view
-- menggunakan invoker, dan private.is_admin hanya menentukan apakah baris tampil.
CREATE OR REPLACE VIEW public.v_admin_stats
WITH (security_invoker = true, security_barrier = true)
AS
SELECT
  (SELECT count(*)::bigint FROM public.profiles) AS total_pengguna,
  (SELECT count(*)::bigint FROM public.proposals) AS total_usulan,
  (SELECT jsonb_object_agg(s.status, s.jumlah ORDER BY s.status)
   FROM (
     SELECT labels.status, count(p.id)::bigint AS jumlah
     FROM (VALUES ('Diajukan'), ('Diverifikasi'), ('Masuk APBD'), ('Dikerjakan'), ('Selesai'))
       AS labels(status)
     LEFT JOIN public.proposals p ON p.status = labels.status
     GROUP BY labels.status
   ) s) AS usulan_per_status,
  (SELECT jsonb_object_agg(s.moderasi, s.jumlah ORDER BY s.moderasi)
   FROM (
     SELECT labels.moderasi, count(p.id)::bigint AS jumlah
     FROM (VALUES ('Menunggu'), ('Disetujui'), ('Ditolak')) AS labels(moderasi)
     LEFT JOIN public.proposals p ON p.moderasi = labels.moderasi
     GROUP BY labels.moderasi
   ) s) AS usulan_per_moderasi,
  (SELECT count(*)::bigint FROM public.votes) AS total_suara,
  (SELECT count(*)::bigint FROM (
    SELECT a.user_id FROM public.allocations a
    GROUP BY a.user_id HAVING sum(a.jumlah) > 0
  ) participants) AS jumlah_partisipan_alokasi,
  (SELECT COALESCE(sum(a.jumlah), 0)::bigint FROM public.allocations a) AS total_alokasi_warga
WHERE private.is_admin();
REVOKE ALL ON public.v_admin_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_admin_stats TO authenticated;
COMMENT ON VIEW public.v_admin_stats IS
  'Statistik operasional admin; invoker RLS dan filter private.is_admin mencegah akses warga.';

-- Statistik alokasi lintas warga hanya berisi jumlah partisipan dan total nominal.
CREATE FUNCTION private.gap_participant_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT count(*)::bigint FROM (
    SELECT a.user_id FROM public.allocations a
    GROUP BY a.user_id HAVING sum(a.jumlah) > 0
  ) participants;
$$;
REVOKE ALL ON FUNCTION private.gap_participant_count() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.gap_participant_count() TO anon, authenticated;

CREATE OR REPLACE VIEW public.v_gap
WITH (security_invoker = true, security_barrier = true)
AS
WITH warga AS (
  SELECT kategori, total FROM private.gap_allocation_totals()
),
total_warga AS (
  SELECT COALESCE(sum(total), 0)::bigint AS total FROM warga
),
selected_config AS (
  SELECT
    (SELECT nilai FROM public.config WHERE kunci = 'kota') AS kota,
    (SELECT nilai FROM public.config WHERE kunci = 'tahun_anggaran') AS tahun
),
apbd AS (
  SELECT a.kategori, COALESCE(sum(a.nominal_rp), 0)::bigint AS total
  FROM public.apbd_items a CROSS JOIN selected_config s
  WHERE a.kota = s.kota
    AND a.tahun::text = s.tahun
    AND a.status_verifikasi = 'verified_program'
    AND a.sumber_url IS NOT NULL
  GROUP BY a.kategori
),
total_apbd AS (
  SELECT COALESCE(sum(a.nominal_rp), 0)::bigint AS total
  FROM public.apbd_items a CROSS JOIN selected_config s
  WHERE a.kota = s.kota
    AND a.tahun::text = s.tahun
    AND a.status_verifikasi = 'verified_program'
    AND a.sumber_url IS NOT NULL
),
apbd_availability AS (
  SELECT EXISTS (
    SELECT 1 FROM public.apbd_items a CROSS JOIN selected_config s
    WHERE a.kota = s.kota
      AND a.tahun::text = s.tahun
      AND a.status_verifikasi = 'verified_program'
      AND a.sumber_url IS NOT NULL
  ) AS tersedia
)
SELECT
  c.nama AS kategori,
  CASE WHEN tw.total > 0
    THEN round(COALESCE(w.total, 0) * 100.0 / tw.total, 2)
    ELSE 0
  END AS persen_warga,
  CASE WHEN ta.total > 0
    THEN round(COALESCE(a.total, 0) * 100.0 / ta.total, 2)
    ELSE 0
  END AS persen_apbd,
  CASE
    WHEN tw.total > 0 AND ta.total > 0 THEN round(
      COALESCE(w.total, 0) * 100.0 / tw.total
        - COALESCE(a.total, 0) * 100.0 / ta.total, 2)
    WHEN tw.total > 0 THEN round(COALESCE(w.total, 0) * 100.0 / tw.total, 2)
    WHEN ta.total > 0 THEN round(-COALESCE(a.total, 0) * 100.0 / ta.total, 2)
    ELSE 0
  END AS gap_poin_persen,
  COALESCE(a.total, 0) AS nominal_apbd,
  COALESCE(w.total, 0) AS total_alokasi_warga,
  private.gap_participant_count() AS jumlah_partisipan,
  availability.tersedia AS apbd_tersedia
FROM public.categories c
LEFT JOIN warga w ON w.kategori = c.nama
LEFT JOIN apbd a ON a.kategori = c.nama
CROSS JOIN total_warga tw
CROSS JOIN total_apbd ta
CROSS JOIN apbd_availability availability;
REVOKE ALL ON public.v_gap FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_gap TO anon, authenticated;
COMMENT ON VIEW public.v_gap IS
  'Agregat lintas warga. APBD dibatasi kota/tahun terpilih dan item verified_program; rumus warga tetap rasio jumlah nominal.';

CREATE OR REPLACE VIEW public.v_proposal_status_history
WITH (security_invoker = true, security_barrier = true)
AS
SELECT h.id, h.proposal_id, h.status_lama, h.status_baru, h.diubah_pada,
  COALESCE(private.profile_name(h.diubah_oleh), 'Sistem') AS diubah_oleh_nama,
  h.catatan
FROM public.proposal_status_history h;
REVOKE ALL ON public.v_proposal_status_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_proposal_status_history TO anon, authenticated;
