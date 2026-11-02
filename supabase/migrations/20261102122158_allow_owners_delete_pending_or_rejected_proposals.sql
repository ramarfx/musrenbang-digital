CREATE POLICY "pemilik hapus usulan menunggu atau ditolak"
ON public.proposals
FOR DELETE
TO authenticated
USING (
    pengusul_id = (SELECT auth.uid())
    AND moderasi IN ('Menunggu', 'Ditolak')
);
