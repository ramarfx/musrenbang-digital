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

CREATE FUNCTION pg_temp.admin_stats_hidden()
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_visible boolean;
BEGIN
  BEGIN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.v_admin_stats)' INTO v_visible;
    RETURN NOT v_visible;
  EXCEPTION WHEN insufficient_privilege THEN
    RETURN true;
  END;
END;
$$;

SELECT pg_temp.check_true(
  (SELECT count(*) = 1 AND bool_and(
     status_lama IS NULL AND status_baru = 'Diajukan'
     AND catatan = 'Snapshot status saat migration; riwayat sebelumnya tidak tersedia.'
     AND diubah_pada > '2026-01-01 00:00:00+00'
   ) FROM public.proposal_status_history WHERE proposal_id = 92000001),
  'Migration 7 mencatat snapshot status legacy tanpa mengarang waktu awal'
);
SELECT pg_temp.check_true(
  (SELECT count(*) = 3
     AND count(*) FILTER (WHERE status_lama IS NULL
       AND status_baru = 'Diajukan'
        AND catatan = 'Status sebelum transisi paling awal yang tersimpan; riwayat terdahulu mungkin tidak lengkap.') = 1
   FROM public.proposal_status_history WHERE proposal_id = 92000002),
  'Migration 7 mengambil status sebelum transisi paling awal yang tersimpan'
);
SELECT pg_temp.check_true(
  (SELECT count(*) = 2
     AND count(*) FILTER (WHERE status_lama IS NULL AND status_baru = 'Diajukan') = 1
   FROM public.proposal_status_history WHERE proposal_id = 92000003),
  'Migration 7 mempertahankan satu riwayat awal legacy yang sudah ada'
);
SELECT pg_temp.check_true(
  (SELECT count(*) = 3
     AND count(*) FILTER (WHERE status_lama IS NULL AND status_baru = 'Selesai'
       AND catatan = 'Status sebelum transisi paling awal yang tersimpan; riwayat terdahulu mungkin tidak lengkap.') = 1
   FROM public.proposal_status_history WHERE proposal_id = 92000004),
  'Migration 7 tidak mengira transisi Diajukan yang lebih baru sebagai status awal'
);

-- Fixture metadata OAuth-shaped dijalankan pada transaksi lokal dan dibersihkan.
INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES
  ('44444444-4444-4444-8444-444444444441', 'profile-email@example.invalid',
   '{"nama":"  Nama Email  ","full_name":"Bukan Nama","name":"Bukan Nama","peran":"admin"}'),
  ('44444444-4444-4444-8444-444444444442', 'profile-google-full@example.invalid',
   '{"nama":"   ","full_name":"  Nama Google  ","name":"Nama Lain","role":"admin"}'),
  ('44444444-4444-4444-8444-444444444443', 'profile-google-name@example.invalid',
   '{"full_name":"  ","name":"  Nama Cadangan  ","peran":"admin"}'),
  ('44444444-4444-4444-8444-444444444444', 'profile-malformed@example.invalid',
   '{"nama":{"text":"Admin"},"full_name":42,"name":["Admin"],"role":"admin"}'),
  ('44444444-4444-4444-8444-444444444445', 'profile-empty@example.invalid', '{}');
SELECT pg_temp.check_true(
  (SELECT nama = 'Nama Email' AND peran = 'warga' FROM public.profiles
   WHERE id = '44444444-4444-4444-8444-444444444441'),
  'Profil email memprioritaskan nama dan mengabaikan metadata peran'
);
SELECT pg_temp.check_true(
  (SELECT nama = 'Nama Google' AND peran = 'warga' FROM public.profiles
   WHERE id = '44444444-4444-4444-8444-444444444442'),
  'Metadata Google full_name digunakan ketika nama kosong tanpa mengangkat role'
);
SELECT pg_temp.check_true(
  (SELECT nama = 'Nama Cadangan' AND peran = 'warga' FROM public.profiles
   WHERE id = '44444444-4444-4444-8444-444444444443'),
  'Metadata name digunakan ketika nama dan full_name kosong'
);
SELECT pg_temp.check_true(
  (SELECT nama = 'Warga' AND peran = 'warga' FROM public.profiles
   WHERE id = '44444444-4444-4444-8444-444444444444'),
  'Metadata nama bukan string memakai default aman dan role warga'
);
SELECT pg_temp.check_true(
  (SELECT nama = 'Warga' AND peran = 'warga' FROM public.profiles
   WHERE id = '44444444-4444-4444-8444-444444444445'),
  'Metadata kosong memakai default warga'
);
SELECT pg_temp.check_true(
  NOT has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE'),
  'Trigger provisioning tidak dapat dipanggil langsung oleh role API'
);
DELETE FROM auth.users WHERE id IN (
  '44444444-4444-4444-8444-444444444441',
  '44444444-4444-4444-8444-444444444442',
  '44444444-4444-4444-8444-444444444443',
  '44444444-4444-4444-8444-444444444444',
  '44444444-4444-4444-8444-444444444445'
);

-- Metadata peran palsu tidak boleh menentukan role profil.
INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES
  ('11111111-1111-4111-8111-111111111111', 'foundation-a@example.invalid', '{"nama":"Warga A","peran":"admin","role":"admin"}'),
  ('22222222-2222-4222-8222-222222222222', 'foundation-b@example.invalid', '{"nama":"Warga B"}'),
  ('33333333-3333-4333-8333-333333333333', 'foundation-admin@example.invalid', '{"nama":"Admin"}');
UPDATE public.profiles SET peran = 'admin' WHERE id = '33333333-3333-4333-8333-333333333333';
SELECT pg_temp.check_true((SELECT peran = 'warga' FROM public.profiles
  WHERE id = '11111111-1111-4111-8111-111111111111'), 'Provisioning mengabaikan role metadata');

INSERT INTO public.proposals(
  id, judul, deskripsi, kategori, pengusul_id, moderasi, catatan_moderasi, estimasi_biaya
)
OVERRIDING SYSTEM VALUE VALUES
  (91000001, 'Usulan menunggu warga A', 'Deskripsi cukup panjang untuk usulan menunggu.', 'Pendidikan', '11111111-1111-4111-8111-111111111111', 'Menunggu', NULL, 1000),
  (91000002, 'Usulan disetujui warga A', 'Deskripsi cukup panjang untuk usulan disetujui.', 'Pendidikan', '11111111-1111-4111-8111-111111111111', 'Disetujui', NULL, 1000),
  (91000003, 'Usulan ditolak warga A', 'Deskripsi cukup panjang untuk usulan ditolak.', 'Pendidikan', '11111111-1111-4111-8111-111111111111', 'Ditolak', 'Alasan privat penolakan', 1000),
  (91000004, 'Usulan menunggu warga B', 'Deskripsi cukup panjang untuk usulan warga B.', 'Pendidikan', '22222222-2222-4222-8222-222222222222', 'Menunggu', NULL, 1000);

INSERT INTO public.comments(id, proposal_id, user_id, isi) OVERRIDING SYSTEM VALUE
SELECT 91000100 + (id - 91000000), id, pengusul_id, 'Komentar fixture tersembunyi'
FROM public.proposals WHERE id BETWEEN 91000001 AND 91000004;
SELECT pg_temp.check_true(
  (SELECT count(*) = 4 AND bool_and(status_lama IS NULL AND status_baru = 'Diajukan'
     AND catatan = 'Usulan diajukan.')
   FROM public.proposal_status_history WHERE proposal_id BETWEEN 91000001 AND 91000004),
  'Trigger mencatat status awal beserta catatan'
);

INSERT INTO public.apbd_items (
  kategori, nominal_rp, tahun, kota, sumber, sumber_url, catatan_pemetaan, status_verifikasi
) VALUES
  ('Pendidikan', 1000000, 2026, 'DKI Jakarta', 'fixture sumber lokal',
   'https://example.invalid/apbd-fixture', 'program fixture', 'verified_program'),
  ('Pendidikan', 9000000, 2026, 'DKI Jakarta', 'fixture belum lengkap',
   NULL, 'harus dikecualikan', 'perlu_lampiran'),
  ('Pendidikan', 8000000, 2025, 'DKI Jakarta', 'fixture tahun lain',
   'https://example.invalid/apbd-other-year', NULL, 'verified_program'),
  ('Pendidikan', 7000000, 2026, 'Kota lain', 'fixture kota lain',
   'https://example.invalid/apbd-other-city', NULL, 'verified_program');

SELECT pg_temp.check_true(
  (SELECT count(*) = 1 AND bool_and(status_verifikasi = 'perlu_lampiran')
   FROM public.apbd_items WHERE sumber = 'legacy fixture without source'),
  'Migration menurunkan label verified lama tanpa URL tertaut tanpa mengubah nominal'
);

SELECT pg_temp.expect_error(
  $$INSERT INTO public.apbd_items(kategori,nominal_rp,tahun,kota,sumber,status_verifikasi)
    VALUES ('Pendidikan',1,2026,'DKI Jakarta','tanpa tautan','verified_program')$$,
  '22023', 'Item APBD verified wajib memiliki URL sumber'
);
SELECT pg_temp.expect_error(
  $$INSERT INTO public.apbd_items(kategori,nominal_rp,tahun,kota,sumber,status_verifikasi)
    VALUES ('Pendidikan',1,2026,'DKI Jakarta','   ','perlu_lampiran')$$,
  '22023', 'Item APBD wajib memiliki sumber teks'
);
SELECT pg_temp.expect_error(
  $$UPDATE public.apbd_items SET status_verifikasi = 'verified_program',
      sumber_url = 'https://example.org/apbd' WHERE id = 93000001$$,
  '22023', 'Item legacy tanpa sumber teks tidak dapat menjadi verified hanya dengan URL'
);
SELECT pg_temp.check_true(
  (SELECT status_verifikasi = 'perlu_lampiran' AND sumber = '' AND sumber_url IS NULL
   FROM public.apbd_items WHERE id = 93000001),
  'Kegagalan verifikasi tidak mengubah item legacy'
);
UPDATE public.apbd_items SET status_verifikasi = 'verified_program',
  sumber = 'Sumber uji', sumber_url = 'https://example.org/apbd' WHERE id = 93000001;
SELECT pg_temp.check_true(
  (SELECT status_verifikasi = 'verified_program' AND sumber = 'Sumber uji'
   FROM public.apbd_items WHERE id = 93000001),
  'Item legacy dapat diverifikasi setelah sumber teks dan URL diisi'
);
UPDATE public.apbd_items SET status_verifikasi = 'perlu_lampiran' WHERE id = 93000001;
SELECT pg_temp.expect_error(
  $$INSERT INTO public.proposals(judul,deskripsi,kategori,estimasi_biaya)
    VALUES ('Estimasi nol','Deskripsi cukup panjang untuk usulan nol.','Pendidikan',0)$$,
  '23514', 'Estimasi biaya nol ditolak database'
);

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
SELECT pg_temp.check_true((SELECT count(*)=14 AND bool_and(prosecdef AND proconfig @> ARRAY['search_path=""'] AND pg_get_userbyid(proowner) NOT IN ('anon','authenticated')) FROM pg_proc WHERE pronamespace='private'::regnamespace), 'Seluruh helper private memiliki owner tepercaya dan search_path kosong');
SELECT pg_temp.check_true(NOT EXISTS (SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE p.pronamespace='private'::regnamespace AND a.grantee=0 AND a.privilege_type='EXECUTE'), 'Tidak ada EXECUTE helper private melalui grant PUBLIC');
SELECT pg_temp.check_true(has_function_privilege('anon','public.is_admin()','EXECUTE'), 'Anon tetap dapat memanggil pemeriksaan peran yang aman');
SELECT pg_temp.check_true((SELECT bool_and(prosecdef AND proconfig @> ARRAY['search_path=""']) FROM pg_proc WHERE oid IN ('private.change_proposal_status_with_note(bigint,text,text)'::regprocedure, 'public.moderate_proposal(bigint,text,text)'::regprocedure, 'public.save_allocations(jsonb)'::regprocedure)), 'Worker berhak istimewa memakai search_path kosong');
SELECT pg_temp.check_true(NOT (SELECT prosecdef FROM pg_proc WHERE oid='public.change_proposal_status(bigint,text)'::regprocedure), 'RPC status lama tidak lagi memakai SECURITY DEFINER');
SELECT pg_temp.check_true((SELECT count(*)=4 FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('v_proposals','v_comments','v_proposal_status_history','v_gap') AND reloptions @> ARRAY['security_invoker=true']), 'Empat view memakai security_invoker');
SELECT pg_temp.check_true((SELECT count(*)=2 FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('v_public_stats','v_admin_stats') AND reloptions @> ARRAY['security_invoker=true']), 'View statistik memakai security_invoker');
SELECT pg_temp.check_true(NOT (SELECT prosecdef FROM pg_proc WHERE oid='public.change_proposal_status_with_note(bigint,text,text)'::regprocedure), 'RPC status bercatatan memakai invoker');
SELECT pg_temp.check_true(NOT has_function_privilege('anon','private.change_proposal_status_with_note(bigint,text,text)','EXECUTE') AND has_function_privilege('authenticated','private.change_proposal_status_with_note(bigint,text,text)','EXECUTE'), 'Helper perubahan status hanya dapat dieksekusi role authenticated');
SELECT pg_temp.check_true((SELECT count(*) = 1 FROM public.proposals WHERE id BETWEEN 91000001 AND 91000004), 'Anon tabel hanya disetujui');
SELECT pg_temp.check_true((SELECT count(*) = 1 FROM public.v_proposals WHERE id BETWEEN 91000001 AND 91000004), 'Anon view hanya disetujui');
SELECT pg_temp.check_true((SELECT jumlah_usulan_disetujui=1 AND jumlah_pemberi_suara=0 AND jumlah_partisipan_alokasi=0 AND total_alokasi_warga=0 FROM public.v_public_stats), 'Statistik publik hanya menampilkan agregat yang aman');
SELECT pg_temp.check_true(NOT has_table_privilege('anon','public.v_admin_stats','SELECT'), 'Anon tidak memiliki grant statistik admin');
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
INSERT INTO public.proposals(id, judul, deskripsi, kategori, pengusul_id, estimasi_biaya)
OVERRIDING SYSTEM VALUE
VALUES (91000005, 'Usulan baru warga A', 'Deskripsi cukup panjang untuk usulan baru.', 'Pendidikan', auth.uid(), 1000);
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
SELECT pg_temp.expect_error('INSERT INTO public.proposals(judul,deskripsi,kategori,pengusul_id,status,estimasi_biaya) VALUES (''Status awal palsu'',''Deskripsi cukup panjang untuk tes.'',''Pendidikan'',auth.uid(),''Selesai'',1000)', '42501', 'INSERT menolak status Selesai');
SELECT pg_temp.expect_error('INSERT INTO public.proposals(judul,deskripsi,kategori,pengusul_id,moderasi,estimasi_biaya) VALUES (''Moderasi awal palsu'',''Deskripsi cukup panjang untuk tes.'',''Pendidikan'',auth.uid(),''Disetujui'',1000)', '42501', 'INSERT menolak moderasi Disetujui');
SELECT pg_temp.expect_error('INSERT INTO public.proposals(judul,deskripsi,kategori,pengusul_id,estimasi_biaya) VALUES (''Pemilik awal palsu'',''Deskripsi cukup panjang untuk tes.'',''Pendidikan'',''22222222-2222-4222-8222-222222222222'',1000)', '42501', 'INSERT menolak pemilik lain');
SELECT pg_temp.expect_error('UPDATE public.proposals SET estimasi_biaya=0 WHERE id=91000001', '23514', 'UPDATE biaya nol ditolak database');
SELECT pg_temp.expect_error('SELECT public.moderate_proposal(91000001,''Disetujui'')', '42501', 'A tidak memanggil RPC moderasi');
SELECT pg_temp.expect_error('SELECT public.change_proposal_status(91000001,''Selesai'')', '22023', 'RPC lama tidak menerima perubahan tanpa catatan');
SELECT pg_temp.expect_error('SELECT public.change_proposal_status_with_note(91000001,''Selesai'',NULL)', '42501', 'Warga tidak dapat memanggil RPC status bercatatan');
SELECT pg_temp.expect_error('SELECT private.moderate_proposal(91000001,''Disetujui'')', '42501', 'Worker moderasi tidak dapat dipanggil langsung');
SELECT pg_temp.expect_error('SELECT private.change_proposal_status(91000001,''Selesai'')', '42501', 'Worker status tidak dapat dipanggil langsung');
UPDATE public.profiles SET nama = 'Nama A diperbarui' WHERE id = auth.uid();
SELECT pg_temp.check_true((SELECT nama = 'Nama A diperbarui' FROM public.profiles WHERE id = auth.uid()), 'A boleh ubah nama sendiri');
SELECT pg_temp.expect_error('UPDATE public.profiles SET peran=''admin'' WHERE id=auth.uid()', '42501', 'A tidak meningkatkan peran');
SELECT pg_temp.expect_error('UPDATE public.profiles SET email=''palsu@example.invalid'' WHERE id=auth.uid()', '42501', 'A tidak mengganti email profil');
SELECT pg_temp.expect_error('INSERT INTO public.profiles(id,email,nama,peran) VALUES (auth.uid(),''palsu@example.invalid'',''Palsu'',''admin'')', '42501', 'API tidak membuat profil admin');
SELECT pg_temp.expect_error('DELETE FROM public.profiles WHERE id=auth.uid()', '42501', 'A tidak menghapus profil untuk provisioning ulang');
SELECT pg_temp.check_true((SELECT count(*) = 1 FROM public.profiles), 'A tidak membaca profil B/admin');
SELECT pg_temp.check_true(pg_temp.admin_stats_hidden(), 'Warga tidak membaca statistik admin');
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
SELECT pg_temp.check_true((SELECT count(*)=1 AND min(total_pengguna)=3 FROM public.v_admin_stats), 'Admin dapat membaca statistik admin');
SELECT pg_temp.check_true((SELECT count(*)=5 FROM public.v_proposals WHERE id BETWEEN 91000001 AND 91000005), 'Admin view melihat semua');
SELECT pg_temp.check_true((SELECT count(*)=5 FROM public.comments WHERE proposal_id BETWEEN 91000001 AND 91000004), 'Admin komentar tabel melihat semua');
SELECT pg_temp.check_true((SELECT count(*)=5 FROM public.v_comments WHERE proposal_id BETWEEN 91000001 AND 91000004), 'Admin komentar view melihat semua');
SELECT pg_temp.check_true((SELECT count(*)=4 FROM public.proposal_status_history WHERE proposal_id BETWEEN 91000001 AND 91000004), 'Admin riwayat tabel melihat semua');
SELECT pg_temp.check_true((SELECT count(*)=4 FROM public.v_proposal_status_history WHERE proposal_id BETWEEN 91000001 AND 91000004), 'Admin riwayat view melihat semua');
SELECT pg_temp.expect_error('SELECT public.moderate_proposal(91000001,''Ditolak'',''   '')', '22023', 'RPC penolakan wajib alasan');
SELECT pg_temp.expect_error('UPDATE public.proposals SET moderasi=''Ditolak'',catatan_moderasi=NULL WHERE id=91000001', '23514', 'UPDATE langsung admin juga wajib alasan penolakan');
SELECT pg_temp.expect_error('SELECT public.moderate_proposal(91000001,''Status asing'')', '22023', 'RPC moderasi menolak enum asing');
SELECT pg_temp.expect_error('SELECT public.moderate_proposal(91999999,''Disetujui'')', 'P0002', 'RPC moderasi menolak ID tidak ada');
SELECT pg_temp.expect_error('SELECT public.change_proposal_status_with_note(91000001,''Diverifikasi'',''   '')', '22023', 'RPC bercatatan menolak catatan kosong');
SELECT public.moderate_proposal(91000001,'Disetujui','Sudah diperiksa');
SELECT pg_temp.check_true((SELECT moderasi='Disetujui' AND dimoderasi_oleh=auth.uid() AND dimoderasi_pada IS NOT NULL FROM public.proposals WHERE id=91000001), 'Admin menyetujui dengan metadata sistem');
SELECT pg_temp.expect_error('UPDATE public.proposals SET status=''Diverifikasi'' WHERE id=91000001', '42501', 'Admin tidak melewati RPC status melalui tabel');
SELECT pg_temp.expect_error('SELECT public.change_proposal_status(91000001,''Diverifikasi'')', '22023', 'RPC lama meminta klien beralih ke kontrak bercatatan');
SELECT public.change_proposal_status_with_note(91000001,'Diverifikasi','Diverifikasi di lapangan.');
SELECT pg_temp.check_true((SELECT status='Diverifikasi' FROM public.proposals WHERE id=91000001), 'RPC status bercatatan mengubah status');
SELECT pg_temp.check_true((SELECT count(*)=1 AND min(catatan)='Diverifikasi di lapangan.' FROM public.proposal_status_history WHERE proposal_id=91000001 AND status_baru='Diverifikasi'), 'RPC status otomatis menulis catatan riwayat');
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
SELECT pg_temp.check_true((SELECT bool_and(jumlah_partisipan=2) FROM public.v_gap), 'Jumlah partisipan gap menghitung dua warga lintas RLS');
SELECT pg_temp.check_true((SELECT max(persen_warga) FILTER (WHERE kategori='Pendidikan')=33.33 AND max(persen_warga) FILTER (WHERE kategori='Kesehatan')=66.67 FROM public.v_gap), 'Persentase warga mengikuti rasio jumlah nominal untuk alokasi parsial yang berbeda');
SELECT pg_temp.check_true((SELECT sum(nominal_apbd)=1000000 AND max(persen_apbd) FILTER (WHERE kategori='Pendidikan')=100 AND bool_and(apbd_tersedia) FROM public.v_gap), 'Gap hanya memakai item APBD terverifikasi pada kota dan tahun terpilih');
SELECT pg_temp.check_true((SELECT jumlah_usulan_disetujui=1 AND jumlah_pemberi_suara=1 AND jumlah_partisipan_alokasi=2 AND total_alokasi_warga=3000000 FROM public.v_public_stats), 'Statistik publik menghitung partisipasi tanpa membocorkan identitas');
SELECT pg_temp.check_true(NOT has_table_privilege('anon','public.v_admin_stats','SELECT'), 'Anon tidak dapat membaca view statistik admin');

RESET ROLE;
-- Fixture DELETE terpisah dari fixture utama agar assertion yang ada tetap utuh.
INSERT INTO public.proposals (id, judul, deskripsi, kategori, pengusul_id, moderasi, catatan_moderasi, estimasi_biaya)
OVERRIDING SYSTEM VALUE VALUES
  (91000011, 'Hapus menunggu warga A', 'Deskripsi fixture untuk pengujian DELETE menunggu.', 'Pendidikan', '11111111-1111-4111-8111-111111111111', 'Menunggu', NULL, 1000),
  (91000012, 'Hapus ditolak warga A', 'Deskripsi fixture untuk pengujian DELETE ditolak.', 'Pendidikan', '11111111-1111-4111-8111-111111111111', 'Ditolak', 'Alasan pengujian', 1000),
  (91000013, 'Hapus disetujui warga A', 'Deskripsi fixture untuk pengujian DELETE disetujui.', 'Pendidikan', '11111111-1111-4111-8111-111111111111', 'Disetujui', NULL, 1000),
  (91000014, 'Hapus menunggu warga B', 'Deskripsi fixture untuk pengujian DELETE orang lain.', 'Pendidikan', '22222222-2222-4222-8222-222222222222', 'Menunggu', NULL, 1000),
  (91000015, 'Hapus usulan oleh admin', 'Deskripsi fixture untuk pengujian DELETE oleh admin.', 'Pendidikan', '11111111-1111-4111-8111-111111111111', 'Disetujui', NULL, 1000);
INSERT INTO public.comments (proposal_id, user_id, isi) VALUES
  (91000011, '11111111-1111-4111-8111-111111111111', 'Fixture cascade komentar'),
  (91000015, '11111111-1111-4111-8111-111111111111', 'Fixture cascade admin');
INSERT INTO public.votes (proposal_id, user_id) VALUES
  (91000011, '11111111-1111-4111-8111-111111111111'),
  (91000015, '11111111-1111-4111-8111-111111111111');
SELECT pg_temp.check_true((SELECT count(*) = 2 FROM public.proposal_status_history WHERE proposal_id IN (91000011, 91000015)), 'Fixture DELETE memiliki riwayat sebelum cascade');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT pg_temp.expect_error('DELETE FROM public.proposals WHERE id=91000011', '42501', 'Anon tidak memiliki hak DELETE proposals');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"22222222-2222-4222-8222-222222222222"}', true);
SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
WITH deleted AS (DELETE FROM public.proposals WHERE id=91000013 RETURNING id)
SELECT pg_temp.check_true((SELECT count(*)=0 FROM deleted), 'B tidak menghapus usulan publik milik A');
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"11111111-1111-4111-8111-111111111111"}', true);
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
WITH deleted AS (DELETE FROM public.proposals WHERE id=91000014 RETURNING id)
SELECT pg_temp.check_true((SELECT count(*)=0 FROM deleted), 'A tidak menghapus usulan milik B');
WITH deleted AS (DELETE FROM public.proposals WHERE id=91000013 RETURNING id)
SELECT pg_temp.check_true((SELECT count(*)=0 FROM deleted), 'A tidak menghapus usulan sendiri yang disetujui');
WITH deleted AS (DELETE FROM public.proposals WHERE id=91000011 RETURNING id)
SELECT pg_temp.check_true((SELECT count(*)=1 FROM deleted), 'A menghapus usulan menunggu miliknya');
WITH deleted AS (DELETE FROM public.proposals WHERE id=91000012 RETURNING id)
SELECT pg_temp.check_true((SELECT count(*)=1 FROM deleted), 'A menghapus usulan ditolak miliknya');
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"33333333-3333-4333-8333-333333333333"}', true);
SELECT set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
WITH deleted AS (DELETE FROM public.proposals WHERE id=91000015 RETURNING id)
SELECT pg_temp.check_true((SELECT count(*)=1 FROM deleted), 'Admin dapat menghapus usulan disetujui sesuai policy admin');
RESET ROLE;
SELECT pg_temp.check_true((SELECT count(*)=2 FROM public.proposals WHERE id IN (91000013, 91000014)), 'Usulan yang terlarang tetap utuh');
SELECT pg_temp.check_true(NOT EXISTS (SELECT 1 FROM public.comments WHERE proposal_id IN (91000011, 91000015)), 'DELETE melakukan cascade komentar fixture');
SELECT pg_temp.check_true(NOT EXISTS (SELECT 1 FROM public.votes WHERE proposal_id IN (91000011, 91000015)), 'DELETE melakukan cascade vote fixture');
SELECT pg_temp.check_true(NOT EXISTS (SELECT 1 FROM public.proposal_status_history WHERE proposal_id IN (91000011, 91000015)), 'DELETE melakukan cascade riwayat fixture');

CREATE FUNCTION pg_temp.ranking_payload(p_reverse boolean DEFAULT false) RETURNS jsonb
LANGUAGE sql AS $$
  SELECT jsonb_agg(jsonb_build_object('kategori', nama, 'posisi', CASE WHEN p_reverse THEN 11-n ELSE n END) ORDER BY n)
  FROM (SELECT nama, row_number() OVER (ORDER BY nama) AS n FROM public.categories) c;
$$;
CREATE FUNCTION pg_temp.fail_priority_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF current_setting('test.fail_priority', true) = 'on' THEN RAISE EXCEPTION 'Simulated insert failure'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER test_fail_priority BEFORE INSERT ON public.priority_rankings FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_priority_insert();
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT pg_temp.expect_error('SELECT public.save_priority_rankings(''[]''::jsonb)', '42501', 'Anon tidak menyimpan ranking');
SELECT pg_temp.expect_error('SELECT * FROM public.get_priority_ranking_summary()', '42501', 'Anon tidak membaca agregat ranking');
SELECT pg_temp.expect_error('SELECT * FROM public.priority_rankings', '42501', 'Anon tidak membaca tabel ranking');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"11111111-1111-4111-8111-111111111111"}', true);
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
SELECT public.save_priority_rankings(pg_temp.ranking_payload());
SELECT pg_temp.check_true((SELECT count(*)=10 AND min(posisi)=1 AND max(posisi)=10 FROM public.get_priority_rankings()), 'A menyimpan ranking valid');
SELECT pg_temp.check_true((SELECT sum(jumlah)=2000000 FROM public.allocations), 'Ranking tidak mengubah allocations A');
SELECT pg_temp.expect_error('SELECT public.save_priority_rankings((SELECT jsonb_agg(x) FROM (SELECT x FROM jsonb_array_elements(pg_temp.ranking_payload()) x LIMIT 9) s))', '22023', 'Ranking tidak lengkap ditolak');
SELECT pg_temp.expect_error('SELECT public.save_priority_rankings(jsonb_set(pg_temp.ranking_payload(), ''{0,kategori}'', pg_temp.ranking_payload()->1->''kategori''))', '22023', 'Kategori duplikat ditolak');
SELECT pg_temp.expect_error('SELECT public.save_priority_rankings(jsonb_set(pg_temp.ranking_payload(), ''{0,posisi}'', ''2''::jsonb))', '22023', 'Posisi duplikat ditolak');
SELECT pg_temp.expect_error('SELECT public.save_priority_rankings(jsonb_set(pg_temp.ranking_payload(), ''{0,kategori}'', ''"tidak dikenal"''::jsonb))', '22023', 'Kategori tidak dikenal ditolak');
SELECT pg_temp.check_true((SELECT count(*)=10 AND min(posisi)=1 FROM public.get_priority_rankings()), 'Validasi gagal mempertahankan ranking sebelumnya');
SELECT pg_temp.expect_error('INSERT INTO public.priority_rankings VALUES (''11111111-1111-4111-8111-111111111111'', ''Pendidikan'', 1)', '42501', 'Tulis langsung ditolak');
SELECT pg_temp.expect_error('SELECT * FROM public.get_priority_ranking_summary()', '42501', 'Warga tidak membaca agregat');
SELECT set_config('test.fail_priority', 'on', true);
SELECT pg_temp.expect_error('SELECT public.save_priority_rankings(pg_temp.ranking_payload(true))', 'P0001', 'Kegagalan INSERT membatalkan penghapusan sebelumnya');
SELECT set_config('test.fail_priority', 'off', true);
SELECT pg_temp.check_true((SELECT posisi=1 FROM public.get_priority_rankings() ORDER BY kategori LIMIT 1), 'Ranking awal utuh setelah rollback subtransaksi');
SELECT public.save_priority_rankings(pg_temp.ranking_payload(true));
SELECT pg_temp.check_true((SELECT posisi=10 FROM public.get_priority_rankings() ORDER BY kategori LIMIT 1), 'Pembaruan ranking mengganti urutan');
SELECT public.save_allocations('[{"kategori":"Pendidikan","jumlah":1000000}]'::jsonb);
SELECT pg_temp.check_true((SELECT posisi=10 FROM public.get_priority_rankings() ORDER BY kategori LIMIT 1), 'Penyimpanan allocations tidak mengubah ranking');
SELECT pg_temp.expect_error('SELECT public.save_allocations(''[{"kategori":"Pendidikan","jumlah":10000001}]''::jsonb)', '22003', 'Batas anggaran tetap berlaku');
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"33333333-3333-4333-8333-333333333333"}', true);
SELECT set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.get_priority_ranking_summary()), 'Agregat satu peserta tidak tersedia');
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"22222222-2222-4222-8222-222222222222"}', true);
SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.priority_rankings), 'B tidak melihat ranking A');
SELECT public.save_priority_rankings(pg_temp.ranking_payload());
SELECT pg_temp.check_true((SELECT count(*)=10 AND bool_and(user_id='22222222-2222-4222-8222-222222222222'::uuid) FROM public.priority_rankings), 'B hanya melihat ranking sendiri');
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"33333333-3333-4333-8333-333333333333"}', true);
SELECT set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
SELECT pg_temp.check_true((SELECT count(*)=10 AND bool_and(skor=11 AND jumlah_partisipan=2) FROM public.get_priority_ranking_summary()), 'Agregat Borda dua ranking berlawanan benar');
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
