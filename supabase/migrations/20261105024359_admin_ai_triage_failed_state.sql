-- Triase admin dijalankan per klik dan tidak diulang oleh worker. Kegagalan harus
-- berakhir 'failed' (bukan 'retry'/'pending') agar admin bisa mencoba lagi.
-- claim_admin_ai_triage selalu mengatur attempts=1, sehingga finish_proposal_ai
-- selalu memilih 'retry'. Tandai percobaan terakhir hanya untuk lease yang sah.
-- CREATE OR REPLACE mempertahankan grant service_role-only yang sudah ada.
CREATE OR REPLACE FUNCTION public.finish_admin_ai_triage(p_admin uuid, p_review bigint, p_token uuid, p_flags jsonb, p_reason text, p_model text, p_failed boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_admin AND peran='admin') THEN
  RAISE EXCEPTION 'Hanya admin' USING ERRCODE='42501';
 END IF;
 IF p_failed THEN
  UPDATE private.proposal_ai_jobs SET attempts=3
  WHERE review_id=p_review AND lease_token=p_token;
 END IF;
 RETURN private.finish_proposal_ai(p_review,p_token,p_flags,p_reason,p_model,p_failed);
END $$;
