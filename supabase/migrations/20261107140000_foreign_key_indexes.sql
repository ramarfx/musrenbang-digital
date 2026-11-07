-- Indeks untuk foreign key yang dicatat advisor (unindexed_foreign_keys). Tanpa indeks,
-- menghapus akun, kategori, atau review memindai seluruh tabel anak; komentar per warga
-- juga dipakai batas laju sehingga indeksnya menyertakan dibuat_pada.
CREATE INDEX IF NOT EXISTS comments_user_dibuat_idx ON public.comments (user_id, dibuat_pada);
CREATE INDEX IF NOT EXISTS proposals_dimoderasi_oleh_idx ON public.proposals (dimoderasi_oleh);
CREATE INDEX IF NOT EXISTS proposal_status_history_diubah_oleh_idx
  ON public.proposal_status_history (diubah_oleh);
CREATE INDEX IF NOT EXISTS priority_rankings_kategori_idx ON public.priority_rankings (kategori);
CREATE INDEX IF NOT EXISTS proposal_ai_review_events_review_idx
  ON private.proposal_ai_review_events (review_id);
