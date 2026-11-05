-- Trigger proposal_ai_enqueue membuat review 'pending' untuk setiap usulan baru, tetapi
-- worker tidak dijalankan di MVP. Admin menganalisis lewat klik, jadi 'pending' berarti
-- belum ada yang menganalisis. Laporkan sebagai 'not_analyzed' agar UI tidak
-- mengunci tombol Analisis AI. Status 'processing' tetap terlihat saat analisis berjalan.
-- CREATE OR REPLACE mempertahankan grant yang sudah ada.
CREATE OR REPLACE FUNCTION public.get_proposal_ai_review(p_proposal_id bigint)
RETURNS TABLE(state text, flags jsonb, reason text, model text, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT private.is_admin() THEN RAISE EXCEPTION 'Hanya admin' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT
  CASE WHEN r.state IS NULL OR r.state='pending' THEN 'not_analyzed' ELSE r.state END,
  COALESCE(r.flags,'[]'::jsonb), r.reason, r.model, r.updated_at
 FROM public.proposals p LEFT JOIN private.proposal_ai_reviews r
  ON r.proposal_id=p.id AND r.content_hash=private.proposal_ai_hash(p) AND r.rules_version='v1'
 WHERE p.id=p_proposal_id;
END $$;
