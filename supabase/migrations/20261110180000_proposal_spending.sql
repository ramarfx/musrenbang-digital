-- =============================================================================
-- Pengeluaran pengerjaan usulan (transparansi anggaran)
--
-- Admin mencatat dana yang benar-benar terpakai untuk mengerjakan sebuah usulan, supaya warga
-- bisa membandingkannya dengan estimasi dan dengan APBD bidangnya. Aturannya ditegakkan di
-- database:
--   * hanya admin yang boleh mencatat,
--   * hanya saat status usulan Masuk APBD, Dikerjakan, atau Selesai,
--   * catatannya tambah-saja (tanpa UPDATE/DELETE) seperti riwayat tahap; salah catat dikoreksi
--     dengan entri berjumlah negatif, jadi jejaknya tetap terlihat,
--   * total pengeluaran satu usulan tidak pernah negatif,
--   * siapa pun dapat melihat catatan dari usulan yang memang terlihat olehnya.
--
-- Dijalankan sekali di Supabase SQL Editor. Aman diulang.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.proposal_spending (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proposal_id bigint NOT NULL REFERENCES public.proposals (id) ON DELETE CASCADE,
  -- Rupiah. Positif = pengeluaran, negatif = koreksi atas catatan sebelumnya.
  jumlah bigint NOT NULL CHECK (jumlah <> 0 AND abs(jumlah) <= 100000000000000),
  -- Untuk apa dana itu dipakai, mis. "Pembelian 2 unit pompa mobile, termin 1".
  keterangan text NOT NULL CHECK (char_length(btrim(keterangan)) BETWEEN 3 AND 300),
  -- Rujukan yang bisa diperiksa: nomor kontrak, nomor SP2D, atau tautan dokumen. Boleh kosong.
  sumber text CHECK (sumber IS NULL OR char_length(btrim(sumber)) <= 300),
  dicatat_oleh uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  dicatat_pada timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proposal_spending_proposal_idx
  ON public.proposal_spending (proposal_id, dicatat_pada);
CREATE INDEX IF NOT EXISTS proposal_spending_dicatat_oleh_idx
  ON public.proposal_spending (dicatat_oleh);

-- -----------------------------------------------------------------------------
-- Penjaga: status usulan, total tidak negatif, dan pengisi dari database (bukan dari klien).
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.guard_proposal_spending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  status_usulan text;
  total_sekarang bigint;
BEGIN
  SELECT p.status INTO status_usulan FROM public.proposals p WHERE p.id = NEW.proposal_id;
  IF status_usulan IS NULL THEN
    RAISE EXCEPTION 'Usulan tidak ditemukan' USING ERRCODE = 'P0002';
  END IF;
  IF status_usulan NOT IN ('Masuk APBD', 'Dikerjakan', 'Selesai') THEN
    RAISE EXCEPTION 'Pengeluaran hanya bisa dicatat saat usulan berstatus Masuk APBD, Dikerjakan, atau Selesai'
      USING ERRCODE = '22023';
  END IF;
  SELECT coalesce(sum(s.jumlah), 0) INTO total_sekarang
    FROM public.proposal_spending s WHERE s.proposal_id = NEW.proposal_id;
  IF total_sekarang + NEW.jumlah < 0 THEN
    RAISE EXCEPTION 'Koreksi melebihi total yang sudah dicatat' USING ERRCODE = '23514';
  END IF;
  NEW.dicatat_oleh := auth.uid();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_proposal_spending() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS proposal_spending_guard ON public.proposal_spending;
CREATE TRIGGER proposal_spending_guard
  BEFORE INSERT ON public.proposal_spending
  FOR EACH ROW EXECUTE FUNCTION private.guard_proposal_spending();

-- -----------------------------------------------------------------------------
-- RLS dan hak akses. Tidak ada policy UPDATE atau DELETE, jadi catatan tidak bisa diubah.
-- -----------------------------------------------------------------------------

ALTER TABLE public.proposal_spending ENABLE ROW LEVEL SECURITY;

-- Subquery ke proposals memakai RLS proposals: catatan hanya terlihat bila usulannya terlihat.
DROP POLICY IF EXISTS "baca pengeluaran sesuai usulan" ON public.proposal_spending;
CREATE POLICY "baca pengeluaran sesuai usulan" ON public.proposal_spending
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id));

DROP POLICY IF EXISTS "admin catat pengeluaran" ON public.proposal_spending;
CREATE POLICY "admin catat pengeluaran" ON public.proposal_spending
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

GRANT SELECT ON public.proposal_spending TO anon, authenticated;
GRANT INSERT ON public.proposal_spending TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.proposal_spending_id_seq TO authenticated;

-- -----------------------------------------------------------------------------
-- Cara memeriksa setelah dijalankan (di SQL Editor):
--   SELECT policyname FROM pg_policies WHERE tablename = 'proposal_spending';   -- 2 baris
--   SELECT count(*) FROM pg_trigger WHERE tgname = 'proposal_spending_guard';   -- 1
-- -----------------------------------------------------------------------------
