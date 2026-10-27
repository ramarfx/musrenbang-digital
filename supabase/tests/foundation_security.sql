-- Jalankan dengan koneksi pengelola pada database pengujian yang sudah dimigrasi.
-- Semua fixture dan helper di-ROLLBACK. Tidak menjalankan seed atau menghapus data asli.
BEGIN;
SET LOCAL statement_timeout = '30s';
CREATE TEMP TABLE security_results (nomor integer GENERATED ALWAYS AS IDENTITY, nama text, lulus boolean);
GRANT SELECT, INSERT ON security_results TO anon, authenticated;
GRANT USAGE ON SEQUENCE security_results_nomor_seq TO anon, authenticated;

CREATE FUNCTION pg_temp.check_true(p_ok boolean, p_nama text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF p_ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'GAGAL: %', p_nama; END IF;
  INSERT INTO security_results(nama, lulus) VALUES (p_nama, true);
END;
$$;
CREATE FUNCTION pg_temp.expect_error(p_sql text, p_code text, p_nama text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_code text;
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_code = RETURNED_SQLSTATE;
  END;
  PERFORM pg_temp.check_true(v_code = p_code, p_nama || ' [SQLSTATE ' || COALESCE(v_code, 'tanpa error') || ']');
END;
$$;

-- Metadata peran palsu tidak boleh menentukan role profil.
INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES
  ('11111111-1111-4111-8111-111111111111', 'foundation-a@example.invalid', '{"nama":"Warga A","peran":"admin","role":"admin"}'),
  ('22222222-2222-4222-8222-222222222222', 'foundation-b@example.invalid', '{"nama":"Warga B"}'),
  ('33333333-3333-4333-8333-333333333333', 'foundation-admin@example.invalid', '{"nama":"Admin"}');
UPDATE public.profiles SET peran = 'admin' WHERE id = '33333333-3333-4333-8333-333333333333';
SELECT pg_temp.check_true((SELECT peran = 'warga' FROM public.profiles
  WHERE id = '11111111-1111-4111-8111-111111111111'), 'Provisioning mengabaikan role metadata');

INSERT INTO public.proposals(id, judul, deskripsi, kategori, pengusul_id, moderasi, catatan_moderasi)
OVERRIDING SYSTEM VALUE VALUES
  (91000001, 'Usulan menunggu warga A', 'Deskripsi cukup panjang untuk usulan menunggu.', 'Pendidikan', '11111111-1111-4111-8111-111111111111', 'Menunggu', NULL),
  (91000002, 'Usulan disetujui warga A', 'Deskripsi cukup panjang untuk usulan disetujui.', 'Pendidikan', '11111111-1111-4111-8111-111111111111', 'Disetujui', NULL),
  (91000003, 'Usulan ditolak warga A', 'Deskripsi cukup panjang untuk usulan ditolak.', 'Pendidikan', '11111111-1111-4111-8111-111111111111', 'Ditolak', 'Alasan privat penolakan'),
  (91000004, 'Usulan menunggu warga B', 'Deskripsi cukup panjang untuk usulan warga B.', 'Pendidikan', '22222222-2222-4222-8222-222222222222', 'Menunggu', NULL);

INSERT INTO public.comments(id, proposal_id, user_id, isi) OVERRIDING SYSTEM VALUE
SELECT 91000100 + (id - 91000000), id, pengusul_id, 'Komentar fixture tersembunyi'
FROM public.proposals WHERE id BETWEEN 91000001 AND 91000004;
INSERT INTO public.proposal_status_history(id, proposal_id, status_baru) OVERRIDING SYSTEM VALUE
SELECT 91000200 + (id - 91000000), id, 'Diajukan'
FROM public.proposals WHERE id BETWEEN 91000001 AND 91000004;

-- Simulasikan suara historis pada usulan yang belum boleh dibaca publik.
INSERT INTO public.votes(proposal_id,user_id)
VALUES (91000001,'11111111-1111-4111-8111-111111111111');

-- Pengunjung tanpa login: hanya approved, termasuk melalui tabel turunan dan view.
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT pg_temp.check_true(current_user = 'anon' AND auth.uid() IS NULL, 'Konteks anon benar-benar tanpa UID');
SELECT pg_temp.check_true(NOT public.is_admin(), 'Helper is_admin anon selalu false');
SELECT pg_temp.check_true(private.profile_name('22222222-2222-4222-8222-222222222222') IS NULL, 'Helper nama anon tidak membaca profil yang hanya terkait data tersembunyi');
SELECT pg_temp.check_true(private.proposal_vote_count(91000001)=0, 'Helper vote anon tidak membaca agregat usulan tersembunyi');
SELECT pg_temp.check_true(NOT (SELECT prosecdef FROM pg_proc WHERE oid='public.is_admin()'::regprocedure), 'RPC public.is_admin berjalan sebagai invoker');
SELECT pg_temp.check_true((SELECT prosecdef FROM pg_proc WHERE oid='private.is_admin()'::regprocedure), 'Pemeriksaan peran terbatas pada helper private');
SELECT pg_temp.check_true(NOT has_schema_privilege('anon','private','CREATE') AND NOT has_schema_privilege('authenticated','private','CREATE'), 'Role aplikasi tidak dapat membuat objek dalam schema private');
SELECT pg_temp.check_true((SELECT count(*)=8 AND bool_and(prosecdef AND proconfig @> ARRAY['search_path=""'] AND pg_get_userbyid(proowner) NOT IN ('anon','authenticated')) FROM pg_proc WHERE pronamespace='private'::regnamespace), 'Seluruh helper private memiliki owner tepercaya dan search_path kosong');
SELECT pg_temp.check_true(NOT EXISTS (SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE p.pronamespace='private'::regnamespace AND a.grantee=0 AND a.privilege_type='EXECUTE'), 'Tidak ada EXECUTE helper private melalui grant PUBLIC');
SELECT pg_temp.check_true(has_function_privilege('anon','public.is_admin()','EXECUTE'), 'Anon tetap dapat memanggil pemeriksaan peran yang aman');
SELECT pg_temp.check_true((SELECT bool_and(prosecdef AND proconfig @> ARRAY['search_path=""']) FROM pg_proc WHERE oid IN ('public.change_proposal_status(bigint,text)'::regprocedure, 'public.moderate_proposal(bigint,text,text)'::regprocedure, 'public.save_allocations(jsonb)'::regprocedure)), 'RPC berhak istimewa memakai search_path kosong');
SELECT pg_temp.check_true((SELECT count(*)=4 FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('v_proposals','v_comments','v_proposal_status_history','v_gap') AND reloptions @> ARRAY['security_invoker=true']), 'Empat view memakai security_invoker');
SELECT pg_temp.check_true((SELECT count(*) = 1 FROM public.proposals WHERE id BETWEEN 91000001 AND 91000004), 'Anon tabel hanya disetujui');
SELECT pg_temp.check_true((SELECT count(*) = 1 FROM public.v_proposals WHERE id BETWEEN 91000001 AND 91000004), 'Anon view hanya disetujui');
SELECT pg_temp.check_true((SELECT count(*) = 1 FROM public.comments WHERE proposal_id BETWEEN 91000001 AND 91000004), 'Anon komentar tabel tersaring');
SELECT pg_temp.check_true((SELECT count(*) = 1 FROM public.v_comments WHERE proposal_id BETWEEN 91000001 AND 91000004), 'Anon komentar view tersaring');
SELECT pg_temp.check_true((SELECT count(*) = 1 FROM public.proposal_status_history WHERE proposal_id BETWEEN 91000001 AND 91000004), 'Anon riwayat tabel tersaring');
SELECT pg_temp.check_true((SELECT count(*) = 1 FROM public.v_proposal_status_history WHERE proposal_id BETWEEN 91000001 AND 91000004), 'Anon riwayat view tersaring');
SELECT pg_temp.check_true((SELECT pengusul_nama='Warga A' FROM public.v_proposals WHERE id=91000002), 'Anon tetap melihat nama penulis usulan publik');
SELECT pg_temp.expect_error('SELECT * FROM public.profiles', '42501', 'Anon tidak membaca profil');
SELECT pg_temp.expect_error('SELECT * FROM public.allocations', '42501', 'Anon tidak membaca alokasi individual');
SELECT pg_temp.expect_error('SELECT * FROM public.votes', '42501', 'Anon tidak membaca pemilih individual');
SELECT pg_temp.expect_error('SELECT public.save_allocations(''[]'')', '42501', 'Anon tidak memanggil RPC alokasi');
SELECT pg_temp.expect_error('SELECT public.moderate_proposal(91000001, ''Disetujui'')', '42501', 'Anon tidak memoderasi');
SELECT pg_temp.expect_error('SELECT public.change_proposal_status(91000002, ''Selesai'')', '42501', 'Anon tidak mengubah status');
SELECT pg_temp.expect_error('INSERT INTO public.comments(proposal_id,user_id,isi) VALUES (91000002,''11111111-1111-4111-8111-111111111111'',''Anon palsu'')', '42501', 'Anon tidak menulis komentar');
SELECT pg_temp.expect_error('INSERT INTO public.votes(proposal_id,user_id) VALUES (91000002,''11111111-1111-4111-8111-111111111111'')', '42501', 'Anon tidak memberi suara');

-- Warga A: milik sendiri termasuk hidden, milik B tetap tidak terlihat.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"11111111-1111-4111-8111-111111111111"}', true);
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
SELECT pg_temp.check_true(current_user = 'authenticated' AND auth.uid() = '11111111-1111-4111-8111-111111111111'::uuid, 'Konteks warga A memakai role dan UID benar');
SELECT pg_temp.check_true(private.profile_name('22222222-2222-4222-8222-222222222222') IS NULL, 'Helper nama A tidak membaca profil tersembunyi B');
SELECT pg_temp.check_true(private.proposal_vote_count(91000001)=1, 'Helper vote tetap lengkap untuk pemilik usulan');
SELECT pg_temp.check_true((SELECT count(*) = 3 FROM public.proposals WHERE id BETWEEN 91000001 AND 91000004), 'A membaca tabel milik sendiri dan publik');
SELECT pg_temp.check_true((SELECT count(*) = 3 FROM public.v_proposals WHERE id BETWEEN 91000001 AND 91000004), 'A membaca view milik sendiri dan publik');
SELECT pg_temp.check_true((SELECT catatan_moderasi = 'Alasan privat penolakan' FROM public.v_proposals WHERE id = 91000003), 'A membaca alasan penolakan sendiri');
SELECT pg_temp.check_true((SELECT count(*) = 3 FROM public.comments WHERE proposal_id BETWEEN 91000001 AND 91000004), 'A komentar tabel sesuai visibilitas');
SELECT pg_temp.check_true((SELECT count(*) = 3 FROM public.v_comments WHERE proposal_id BETWEEN 91000001 AND 91000004), 'A komentar view sesuai visibilitas');
SELECT pg_temp.check_true((SELECT count(*) = 3 FROM public.proposal_status_history WHERE proposal_id BETWEEN 91000001 AND 91000004), 'A riwayat tabel sesuai visibilitas');
SELECT pg_temp.check_true((SELECT count(*) = 3 FROM public.v_proposal_status_history WHERE proposal_id BETWEEN 91000001 AND 91000004), 'A riwayat view sesuai visibilitas');
SELECT pg_temp.check_true((SELECT pengusul_nama='Warga A' FROM public.v_proposals WHERE id=91000001), 'View invoker tetap menampilkan nama pemilik ke warga A');
INSERT INTO public.proposals(id, judul, deskripsi, kategori, pengusul_id) OVERRIDING SYSTEM VALUE
VALUES (91000005, 'Usulan baru warga A', 'Deskripsi cukup panjang untuk usulan baru.', 'Pendidikan', auth.uid());
SELECT pg_temp.check_true((SELECT status = 'Diajukan' AND moderasi = 'Menunggu' FROM public.proposals WHERE id = 91000005), 'INSERT warga memakai status awal database');
UPDATE public.proposals SET judul = 'Judul hasil edit warga A' WHERE id = 91000001;
SELECT pg_temp.check_true((SELECT judul = 'Judul hasil edit warga A' FROM public.proposals WHERE id = 91000001), 'A boleh edit isi saat Menunggu');
WITH perubahan AS (UPDATE public.proposals SET judul = 'Edit ilegal usulan disetujui' WHERE id = 91000002 RETURNING id)
SELECT pg_temp.check_true((SELECT count(*) = 0 FROM perubahan), 'A tidak mengedit usulan Disetujui');
WITH perubahan AS (UPDATE public.proposals SET judul = 'Edit ilegal usulan ditolak' WHERE id = 91000003 RETURNING id)
SELECT pg_temp.check_true((SELECT count(*) = 0 FROM perubahan), 'A tidak mengedit usulan Ditolak');
WITH perubahan AS (UPDATE public.proposals SET judul = 'Edit ilegal milik warga B' WHERE id = 91000004 RETURNING id)
SELECT pg_temp.check_true((SELECT count(*) = 0 FROM perubahan), 'A tidak mengedit usulan B');
SELECT pg_temp.expect_error('UPDATE public.proposals SET status=''Selesai'' WHERE id=91000001', '42501', 'A tidak menaikkan status');
SELECT pg_temp.expect_error('UPDATE public.proposals SET moderasi=''Disetujui'' WHERE id=91000001', '42501', 'A tidak menyetujui sendiri');
SELECT pg_temp.expect_error('UPDATE public.proposals SET pengusul_id=''22222222-2222-4222-8222-222222222222'' WHERE id=91000001', '42501', 'A tidak mengganti pemilik');
-- GENERATED ALWAYS menolak perubahan ID sebelum trigger dijalankan.
SELECT pg_temp.expect_error('UPDATE public.proposals SET id=91000999 WHERE id=91000001', '428C9', 'A tidak mengganti identitas usulan');
SELECT pg_temp.check_true((SELECT count(*) = 1 FROM public.proposals WHERE id=91000001) AND (SELECT count(*) = 0 FROM public.proposals WHERE id=91000999), 'Identitas usulan tetap setelah perubahan ditolak');
SELECT pg_temp.expect_error('UPDATE public.proposals SET dibuat_pada=''2000-01-01'' WHERE id=91000001', '42501', 'A tidak memalsukan waktu pembuatan');
SELECT pg_temp.expect_error('UPDATE public.proposals SET dimoderasi_oleh=auth.uid() WHERE id=91000001', '42501', 'A tidak memalsukan verifikator');
SELECT pg_temp.expect_error('INSERT INTO public.proposals(judul,deskripsi,kategori,pengusul_id,status) VALUES (''Status awal palsu'',''Deskripsi cukup panjang untuk tes.'',''Pendidikan'',auth.uid(),''Selesai'')', '42501', 'INSERT menolak status Selesai');
SELECT pg_temp.expect_error('INSERT INTO public.proposals(judul,deskripsi,kategori,pengusul_id,moderasi) VALUES (''Moderasi awal palsu'',''Deskripsi cukup panjang untuk tes.'',''Pendidikan'',auth.uid(),''Disetujui'')', '42501', 'INSERT menolak moderasi Disetujui');
SELECT pg_temp.expect_error('INSERT INTO public.proposals(judul,deskripsi,kategori,pengusul_id) VALUES (''Pemilik awal palsu'',''Deskripsi cukup panjang untuk tes.'',''Pendidikan'',''22222222-2222-4222-8222-222222222222'')', '42501', 'INSERT menolak pemilik lain');
SELECT pg_temp.expect_error('SELECT public.moderate_proposal(91000001,''Disetujui'')', '42501', 'A tidak memanggil RPC moderasi');
SELECT pg_temp.expect_error('SELECT public.change_proposal_status(91000001,''Selesai'')', '42501', 'A tidak memanggil RPC status admin');
SELECT pg_temp.expect_error('SELECT private.moderate_proposal(91000001,''Disetujui'')', '42501', 'Worker moderasi tidak dapat dipanggil langsung');
SELECT pg_temp.expect_error('SELECT private.change_proposal_status(91000001,''Selesai'')', '42501', 'Worker status tidak dapat dipanggil langsung');
UPDATE public.profiles SET nama = 'Nama A diperbarui' WHERE id = auth.uid();
SELECT pg_temp.check_true((SELECT nama = 'Nama A diperbarui' FROM public.profiles WHERE id = auth.uid()), 'A boleh ubah nama sendiri');
SELECT pg_temp.expect_error('UPDATE public.profiles SET peran=''admin'' WHERE id=auth.uid()', '42501', 'A tidak meningkatkan peran');
SELECT pg_temp.expect_error('UPDATE public.profiles SET email=''palsu@example.invalid'' WHERE id=auth.uid()', '42501', 'A tidak mengganti email profil');
SELECT pg_temp.expect_error('INSERT INTO public.profiles(id,email,nama,peran) VALUES (auth.uid(),''palsu@example.invalid'',''Palsu'',''admin'')', '42501', 'API tidak membuat profil admin');
SELECT pg_temp.expect_error('DELETE FROM public.profiles WHERE id=auth.uid()', '42501', 'A tidak menghapus profil untuk provisioning ulang');
SELECT pg_temp.check_true((SELECT count(*) = 1 FROM public.profiles), 'A tidak membaca profil B/admin');
SELECT pg_temp.expect_error('INSERT INTO public.comments(proposal_id,user_id,isi) VALUES (91000001,auth.uid(),''Komentar sebelum moderasi'')', '42501', 'A tidak komentar pada Menunggu');
SELECT pg_temp.expect_error('INSERT INTO public.votes(proposal_id,user_id) VALUES (91000003,auth.uid())', '42501', 'A tidak vote pada Ditolak');
SELECT pg_temp.expect_error('INSERT INTO public.proposal_status_history(proposal_id,status_baru) VALUES (91000001,''Selesai'')', '42501', 'A tidak memalsukan riwayat');
INSERT INTO public.comments(id,proposal_id,user_id,isi) OVERRIDING SYSTEM VALUE VALUES (91000110,91000002,auth.uid(),'Komentar warga A valid');
INSERT INTO public.votes(proposal_id,user_id) VALUES (91000002,auth.uid());
SELECT pg_temp.check_true((SELECT jumlah_suara = 1 FROM public.v_proposals WHERE id=91000002), 'Vote valid masuk agregat view');
SELECT pg_temp.expect_error('INSERT INTO public.votes(proposal_id,user_id) VALUES (91000002,auth.uid())', '23505', 'Vote ganda ditolak constraint');
SELECT pg_temp.expect_error('INSERT INTO public.allocations(user_id,kategori,jumlah) VALUES (auth.uid(),''Pendidikan'',999999999)', '42501', 'INSERT alokasi langsung ditolak');
SELECT pg_temp.expect_error('UPDATE public.allocations SET jumlah=999999999 WHERE user_id=auth.uid()', '42501', 'UPDATE alokasi langsung ditolak');
SELECT pg_temp.expect_error('DELETE FROM public.allocations WHERE user_id=auth.uid()', '42501', 'DELETE alokasi langsung ditolak');
SELECT pg_temp.expect_error('SELECT private.save_allocations(''[]'')', '42501', 'Validator internal tidak dapat dipanggil warga');
SELECT public.save_allocations('[{"kategori":"Pendidikan","jumlah":6000000},{"kategori":"Kesehatan","jumlah":4000000}]');
SELECT pg_temp.check_true((SELECT sum(jumlah)=10000000 FROM public.allocations WHERE user_id=auth.uid()), 'RPC menerima tepat batas anggaran');
SELECT pg_temp.expect_error('SELECT public.save_allocations(''[{"kategori":"Pendidikan","jumlah":10000001}]'')', '22003', 'RPC menolak melebihi batas');
SELECT pg_temp.expect_error('SELECT public.save_allocations(''[{"kategori":"Pendidikan","jumlah":-1}]'')', '22023', 'RPC menolak negatif');
SELECT pg_temp.expect_error('SELECT public.save_allocations(''[{"kategori":"Pendidikan","jumlah":1.5}]'')', '22023', 'RPC menolak pecahan');
SELECT pg_temp.expect_error('SELECT public.save_allocations(''[{"kategori":"Tidak dikenal","jumlah":1}]'')', '22023', 'RPC menolak kategori asing');
SELECT pg_temp.expect_error('SELECT public.save_allocations(''[{"kategori":"Pendidikan","jumlah":1},{"kategori":"Pendidikan","jumlah":1}]'')', '22023', 'RPC menolak kategori duplikat');
SELECT pg_temp.check_true((SELECT sum(jumlah)=10000000 FROM public.allocations WHERE user_id=auth.uid()), 'Kegagalan RPC mempertahankan alokasi sebelumnya');
SELECT public.save_allocations('[{"kategori":"Kesehatan","jumlah":2000000}]');
SELECT pg_temp.check_true((SELECT count(*)=1 AND sum(jumlah)=2000000 FROM public.allocations WHERE user_id=auth.uid()), 'RPC mengganti set lama secara utuh');

-- Warga B tidak dapat membaca atau memodifikasi data tersembunyi warga A.
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"22222222-2222-4222-8222-222222222222"}', true);
SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
SELECT pg_temp.check_true(current_user = 'authenticated' AND auth.uid() = '22222222-2222-4222-8222-222222222222'::uuid, 'Konteks warga B memakai role dan UID benar');
SELECT pg_temp.check_true(private.profile_name(auth.uid())='Warga B', 'Helper nama tetap tersedia untuk profil sendiri');
SELECT pg_temp.check_true(private.proposal_vote_count(91000001)=0, 'Helper vote B tidak membaca agregat tersembunyi A');
SELECT pg_temp.check_true((SELECT count(*)=2 FROM public.proposals WHERE id BETWEEN 91000001 AND 91000005), 'B tabel: publik dan milik sendiri');
SELECT pg_temp.check_true((SELECT count(*)=2 FROM public.v_proposals WHERE id BETWEEN 91000001 AND 91000005), 'B view: publik dan milik sendiri');
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.v_proposals WHERE id=91000003), 'B tidak membaca alasan penolakan A');
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.comments WHERE proposal_id IN (91000001,91000003)), 'B tidak membaca komentar tersembunyi A');
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.v_comments WHERE proposal_id IN (91000001,91000003)), 'B tidak membaca view komentar tersembunyi A');
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.proposal_status_history WHERE proposal_id IN (91000001,91000003)), 'B tidak membaca riwayat tersembunyi A');
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.v_proposal_status_history WHERE proposal_id IN (91000001,91000003)), 'B tidak membaca view riwayat tersembunyi A');
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.allocations), 'B tidak membaca alokasi A');
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.votes), 'B tidak membaca identitas pemilih A');
SELECT pg_temp.expect_error('INSERT INTO public.comments(proposal_id,user_id,isi) VALUES (91000002,''11111111-1111-4111-8111-111111111111'',''Penulis palsu'')', '42501', 'B tidak menyamar sebagai penulis A');
SELECT public.save_allocations('[{"kategori":"Pendidikan","jumlah":1000000}]');
SELECT pg_temp.check_true((SELECT count(*)=1 AND sum(jumlah)=1000000 FROM public.allocations), 'B menyimpan alokasi sendiri melalui RPC');

-- Admin melihat semua, moderasi beralasan, RPC status lama tetap berfungsi.
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"33333333-3333-4333-8333-333333333333"}', true);
SELECT set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
SELECT pg_temp.check_true(current_user = 'authenticated' AND auth.uid() = '33333333-3333-4333-8333-333333333333'::uuid AND public.is_admin(), 'Konteks admin memakai role dan UID benar');
SELECT pg_temp.check_true(private.profile_name('22222222-2222-4222-8222-222222222222')='Warga B', 'Helper nama admin tetap dapat membaca semua profil');
SELECT pg_temp.check_true(private.proposal_vote_count(91000001)=1, 'Helper vote admin tetap membaca usulan tersembunyi');
SELECT pg_temp.check_true((SELECT count(*)=5 FROM public.proposals WHERE id BETWEEN 91000001 AND 91000005), 'Admin tabel melihat semua');
SELECT pg_temp.check_true((SELECT count(*)=5 FROM public.v_proposals WHERE id BETWEEN 91000001 AND 91000005), 'Admin view melihat semua');
SELECT pg_temp.check_true((SELECT count(*)=5 FROM public.comments WHERE proposal_id BETWEEN 91000001 AND 91000004), 'Admin komentar tabel melihat semua');
SELECT pg_temp.check_true((SELECT count(*)=5 FROM public.v_comments WHERE proposal_id BETWEEN 91000001 AND 91000004), 'Admin komentar view melihat semua');
SELECT pg_temp.check_true((SELECT count(*)=4 FROM public.proposal_status_history WHERE proposal_id BETWEEN 91000001 AND 91000004), 'Admin riwayat tabel melihat semua');
SELECT pg_temp.check_true((SELECT count(*)=4 FROM public.v_proposal_status_history WHERE proposal_id BETWEEN 91000001 AND 91000004), 'Admin riwayat view melihat semua');
SELECT pg_temp.expect_error('SELECT public.moderate_proposal(91000001,''Ditolak'',''   '')', '22023', 'RPC penolakan wajib alasan');
SELECT pg_temp.expect_error('UPDATE public.proposals SET moderasi=''Ditolak'',catatan_moderasi=NULL WHERE id=91000001', '23514', 'UPDATE langsung admin juga wajib alasan penolakan');
SELECT pg_temp.expect_error('SELECT public.moderate_proposal(91000001,''Status asing'')', '22023', 'RPC moderasi menolak enum asing');
SELECT pg_temp.expect_error('SELECT public.moderate_proposal(91999999,''Disetujui'')', 'P0002', 'RPC moderasi menolak ID tidak ada');
SELECT public.moderate_proposal(91000001,'Disetujui','Sudah diperiksa');
SELECT pg_temp.check_true((SELECT moderasi='Disetujui' AND dimoderasi_oleh=auth.uid() AND dimoderasi_pada IS NOT NULL FROM public.proposals WHERE id=91000001), 'Admin menyetujui dengan metadata sistem');
SELECT public.change_proposal_status(91000001,'Diverifikasi');
SELECT pg_temp.check_true((SELECT status='Diverifikasi' FROM public.proposals WHERE id=91000001), 'RPC status lama tetap bekerja');
SELECT pg_temp.check_true((SELECT count(*)=1 FROM public.proposal_status_history WHERE proposal_id=91000001 AND status_baru='Diverifikasi'), 'RPC status tetap menulis riwayat');
UPDATE public.proposals SET judul='Judul usulan hasil edit admin' WHERE id=91000002;
SELECT pg_temp.check_true((SELECT judul='Judul usulan hasil edit admin' FROM public.proposals WHERE id=91000002), 'Admin dapat mengedit usulan disetujui');
DELETE FROM public.comments WHERE id=91000110;
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.comments WHERE id=91000110), 'Admin dapat menghapus komentar');
SELECT pg_temp.expect_error('UPDATE public.profiles SET peran=''admin'' WHERE id=''22222222-2222-4222-8222-222222222222''', '42501', 'Pemberian admin tetap melalui pengelola SQL');
SELECT pg_temp.expect_error('INSERT INTO public.proposal_status_history(proposal_id,status_baru) VALUES (91000001,''Selesai'')', '42501', 'Admin API tidak membuat riwayat lepas dari RPC');
SELECT pg_temp.expect_error('INSERT INTO public.allocations(user_id,kategori,jumlah) VALUES (auth.uid(),''Pendidikan'',999999999)', '42501', 'Admin API juga tidak bypass RPC alokasi');
SELECT public.moderate_proposal(91000002,'Ditolak','Ditemukan duplikat');

-- Approved lalu ditolak harus segera tersembunyi pada semua jalur publik.
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT pg_temp.check_true(current_user = 'anon' AND auth.uid() IS NULL, 'Konteks kembali anon tidak mewarisi UID admin');
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.proposals WHERE id=91000002), 'Anon tabel tidak melihat usulan setelah ditolak');
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.v_proposals WHERE id=91000002), 'Anon view tidak melihat usulan setelah ditolak');
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.comments WHERE proposal_id=91000002), 'Anon tabel komentar ikut tersembunyi');
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.v_comments WHERE proposal_id=91000002), 'Anon view komentar ikut tersembunyi');
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.proposal_status_history WHERE proposal_id=91000002), 'Anon tabel riwayat ikut tersembunyi');
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.v_proposal_status_history WHERE proposal_id=91000002), 'Anon view riwayat ikut tersembunyi');
SELECT pg_temp.check_true((SELECT count(*)=10 FROM public.v_gap), 'Gap tetap dapat dibaca publik');
SELECT pg_temp.check_true((SELECT sum(total_alokasi_warga)=3000000 FROM public.v_gap), 'Gap anon mempertahankan agregasi alokasi lintas warga');

RESET ROLE;
-- Hak TRUNCATE tidak tunduk pada RLS, jadi harus benar-benar dicabut.
SELECT pg_temp.check_true(NOT EXISTS (
  SELECT 1 FROM (VALUES ('anon'), ('authenticated')) r(nama)
  CROSS JOIN (VALUES ('profiles'),('proposals'),('comments'),('votes'),('allocations'),('proposal_status_history'),('categories'),('apbd_items'),('config')) t(nama)
  WHERE has_table_privilege(r.nama, 'public.' || t.nama, 'TRUNCATE')
), 'Anon dan authenticated tidak memiliki TRUNCATE pada tabel aplikasi');
SELECT jsonb_build_object('lulus', count(*), 'gagal', 0, 'pengujian', jsonb_agg(nama ORDER BY nomor)) AS hasil
FROM security_results;
ROLLBACK;
