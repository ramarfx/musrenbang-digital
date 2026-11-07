-- Advisor auth_rls_initplan: auth.uid() di policy dievaluasi ulang untuk setiap baris.
-- Membungkusnya dengan (select ...) membuat Postgres menghitungnya sekali per query.
-- Arti policy tidak berubah; nama, perintah, dan peran tetap sama.
ALTER POLICY "profil sendiri atau admin" ON public.profiles
  USING (((select auth.uid()) = id) OR (select public.is_admin()));

ALTER POLICY "ubah profil sendiri" ON public.profiles
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

ALTER POLICY "warga batalkan suara" ON public.votes
  USING ((select auth.uid()) = user_id);
