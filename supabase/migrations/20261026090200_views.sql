-- =============================================================================
-- Musrenbang Digital — read model
--
-- View di sini adalah kontrak baca frontend. Frontend tidak perlu join manual
-- dan tidak pernah menerima email pengguna lain.
--
-- security_invoker = false dipakai secara sadar untuk view yang perlu membaca
-- lintas baris (agregat alokasi) atau kolom profil (nama penulis). View hanya
-- mengekspos kolom aman, dan tabel dasarnya tetap dilindungi RLS.
-- =============================================================================

-- Usulan lengkap untuk daftar, detail, dan admin.
CREATE OR REPLACE VIEW public.v_proposals
WITH (security_invoker = false)
AS
SELECT
  p.id,
  p.judul,
  p.deskripsi,
  p.kategori,
  p.lokasi,
  p.latitude,
  p.longitude,
  p.estimasi_biaya,
  p.pengusul_id,
  COALESCE(pr.nama, 'Warga') AS pengusul_nama,
  p.status,
  p.dibuat_pada,
  p.diubah_pada,
  COALESCE(v.jumlah_suara, 0)::integer AS jumlah_suara
FROM public.proposals p
LEFT JOIN public.profiles pr ON pr.id = p.pengusul_id
LEFT JOIN (
  SELECT proposal_id, COUNT(*)::integer AS jumlah_suara
  FROM public.votes
  GROUP BY proposal_id
) v ON v.proposal_id = p.id;

COMMENT ON VIEW public.v_proposals IS
  'Read model usulan: nama pengusul dan jumlah suara tanpa mengekspos email.';

-- Komentar beserta nama penulis.
CREATE OR REPLACE VIEW public.v_comments
WITH (security_invoker = false)
AS
SELECT
  c.id,
  c.proposal_id,
  c.isi,
  c.dibuat_pada,
  COALESCE(pr.nama, 'Warga') AS penulis_nama
FROM public.comments c
LEFT JOIN public.profiles pr ON pr.id = c.user_id;

COMMENT ON VIEW public.v_comments IS
  'Read model komentar: isi dan nama penulis, tanpa user_id/email.';

-- Linimasa status usulan.
CREATE OR REPLACE VIEW public.v_proposal_status_history
WITH (security_invoker = false)
AS
SELECT
  h.id,
  h.proposal_id,
  h.status_lama,
  h.status_baru,
  h.diubah_pada,
  COALESCE(pr.nama, 'Sistem') AS diubah_oleh_nama
FROM public.proposal_status_history h
LEFT JOIN public.profiles pr ON pr.id = h.diubah_oleh;

COMMENT ON VIEW public.v_proposal_status_history IS
  'Read model riwayat status: nama admin yang mengubah, bukan user id.';

-- Gap Warga-APBD. APBD diagregasi per kategori agar baris ganda tidak
-- menggandakan persentase. Bila belum ada alokasi warga, persen_warga = 0.
CREATE OR REPLACE VIEW public.v_gap
WITH (security_invoker = false)
AS
WITH warga AS (
  SELECT kategori, COALESCE(SUM(jumlah), 0)::bigint AS total
  FROM public.allocations
  GROUP BY kategori
),
total_warga AS (
  SELECT COALESCE(SUM(jumlah), 0)::bigint AS total FROM public.allocations
),
apbd AS (
  SELECT kategori, COALESCE(SUM(nominal_rp), 0)::bigint AS total
  FROM public.apbd_items
  GROUP BY kategori
),
total_apbd AS (
  SELECT COALESCE(SUM(nominal_rp), 0)::bigint AS total FROM public.apbd_items
)
SELECT
  c.nama AS kategori,
  CASE WHEN tw.total > 0
    THEN ROUND(COALESCE(w.total, 0) * 100.0 / tw.total, 2)
    ELSE 0
  END AS persen_warga,
  CASE WHEN ta.total > 0
    THEN ROUND(COALESCE(a.total, 0) * 100.0 / ta.total, 2)
    ELSE 0
  END AS persen_apbd,
  CASE
    WHEN tw.total > 0 AND ta.total > 0
      THEN ROUND(
        COALESCE(w.total, 0) * 100.0 / tw.total
        - COALESCE(a.total, 0) * 100.0 / ta.total,
        2
      )
    WHEN tw.total > 0
      THEN ROUND(COALESCE(w.total, 0) * 100.0 / tw.total, 2)
    WHEN ta.total > 0
      THEN ROUND(-COALESCE(a.total, 0) * 100.0 / ta.total, 2)
    ELSE 0
  END AS gap_poin_persen,
  COALESCE(a.total, 0) AS nominal_apbd,
  COALESCE(w.total, 0) AS total_alokasi_warga
FROM public.categories c
LEFT JOIN warga w ON w.kategori = c.nama
LEFT JOIN apbd a ON a.kategori = c.nama
CROSS JOIN total_warga tw
CROSS JOIN total_apbd ta;

COMMENT ON VIEW public.v_gap IS
  'Agregat gap warga vs APBD per kategori; hanya kolom agregat yang diekspos.';

GRANT SELECT ON public.v_proposals TO anon, authenticated;
GRANT SELECT ON public.v_comments TO anon, authenticated;
GRANT SELECT ON public.v_proposal_status_history TO anon, authenticated;
GRANT SELECT ON public.v_gap TO anon, authenticated;
