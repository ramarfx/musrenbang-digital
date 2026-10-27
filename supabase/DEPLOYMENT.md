# Checklist remote development

## Kondisi remote saat ini

Target tetap hanya `musrenbang-digital-backend` (`dogyibbzwfslspflsidm`). Pemeriksaan
terakhir pada 27 Oktober 2026 menunjukkan enam migration fondasi sudah terpasang;
`20261027065525_mvp_public_stats_status_audit.sql` masih kandidat lokal. Tidak ada
izin untuk memasangnya melalui catatan ini. Pemasangan baru memerlukan persetujuan
eksplisit terpisah setelah review lokal dan koordinasi kontrak frontend.

Status baca terakhir: proyek aktif, Data API dan signup aktif, konfirmasi email
wajib, GraphQL tidak diekspos. Security Advisor menunjukkan 0 ERROR dan 3 WARN pada
RPC `SECURITY DEFINER` authenticated yang telah diaudit. `SITE_URL`, redirect
allowlist, rincian SMTP, rate limit, dan fingerprint penuh belum terverifikasi.

Migration ketujuh mengubah kontrak RPC status menjadi bercatatan dan menambah kolom
provenance APBD/view statistik yang belum ada pada remote. Frontend saat ini masih
memanggil RPC status lama; integrasi frontend perlu disiapkan sebelum migration
ketujuh dipertimbangkan untuk deployment.

## Rencana rollout kandidat migration 7

Status: **WAITING FOR FRONTEND** dan belum ada persetujuan deployment. Pemeriksaan
read-only pada 27 Oktober 2026 mengonfirmasi project ref dan enam history hingga
`20261027004023_security_advisor_hardening`; migration 7 belum tercatat. SHA-256
file lokal yang ditinjau adalah
`1C2130EF879789C7662E6B3A0D234D7CD762444D906734D4D280018D23013FFC`.
Hitung ulang pada mesin operator sebelum dry-run; perbedaan newline pada checkout
dapat memengaruhi checksum file dan harus diselidiki sebelum membandingkan hasil.
Guard provenance telah diperbaiki sesudah dry-run lama; dry-run lama tidak
memvalidasi isi file yang sekarang dan harus diulang sebelum deployment.

1. Siapkan frontend yang sudah diuji untuk catatan status, moderasi, ketersediaan
   Gap, estimasi positif, dan provenance APBD sesuai `BACKEND_HANDOFF.md`. Sediakan
   kemampuan menonaktifkan aksi perubahan status serta tampilan perbandingan yang
   bergantung pada kontrak baru selama pergantian. Tanpa kemampuan itu, gunakan
   jendela pemeliharaan yang disetujui. Jangan membuka celah untuk RPC lama tanpa
   catatan atau menganggap tampilan angka nol sebagai data tersedia.
2. Pastikan dokumentasi dan keputusan produk tentang data APBD, kategori yang belum
   lengkap, serta privasi agregat ditinjau. Semua seed saat ini `perlu_lampiran`;
   `apbd_tersedia` hanya menyatakan sedikitnya satu item cocok, bukan kelengkapan
   seluruh kategori. Jangan seed atau mengubah data untuk memaksakan kesiapan.
3. Minta persetujuan deployment terpisah. Pada waktu pelaksanaan, verifikasi project
   ref, branch, checksum, backup yang dapat dipulihkan, aktivitas pengguna, schema,
   history, dan pengaturan akses terkini. Catat kondisi awal akses; perubahan akses
   remote memerlukan persetujuan tersendiri. Migration 7 mengubah label verifikasi
   lama tanpa URL dan menambah riwayat baseline, sehingga evaluasi dampak data
   aktual sebelum penerapan. Hentikan bila ada drift atau konflik.
4. Dengan akses yang telah disetujui untuk dibatasi, ulangi dry-run CLI yang sesuai
   versi terpasang dan pastikan hanya `20261027065525_mvp_public_stats_status_audit.sql`
   direncanakan, tanpa seed, reset atau Vault. Jalankan migration hanya setelah
   persetujuan dan pemeriksaan tersebut. Jika gagal, hentikan, catat schema/history,
   pertahankan pembatasan yang diperlukan dan minta review pemulihan; jangan reset
   atau memanipulasi history.
5. Verifikasi read-only history tujuh versi, RLS, grants, trigger, fungsi dan view
   invoker, eksposur schema private, Security Advisor, serta hasil agregat dan flags
   dengan data yang ada. Tinjau dampak perubahan provenance dan baseline riwayat.
   Lakukan smoke test GET API dengan anon key dan JWT yang sudah ada bila tersedia;
   jangan membuat fixture tanpa persetujuan pengujian tulis yang terpisah.
6. Pasang/aktifkan frontend yang sudah divalidasi dalam jendela terkoordinasi,
   uji bahwa fungsi yang bergantung kontrak baru tersedia dan tidak ada penyajian
   data APBD yang menyesatkan. Pulihkan akses sesuai kondisi awal hanya setelah
   pemeriksaan keamanan dan integrasi berhasil. Uji ulang operasi baca setelah akses
   dipulihkan. Jika pemeriksaan gagal, pertahankan pembatasan dan lakukan review.
7. Pengujian Auth/API yang membuat data dan concurrency remote memerlukan persetujuan
   terpisah, dua alamat email uji yang dapat menerima konfirmasi, mekanisme admin
   tepercaya, SITE_URL/redirect allowlist, SMTP/sender, rate limit, baseline dan
   fingerprint, serta cleanup dan recovery per Run ID seperti dijelaskan dalam
   `REMOTE_INTEGRATION_TESTING.md`. Semua prasyarat tersebut harus diverifikasi lagi;
   status provider email aktif saja tidak membuktikan pengiriman berhasil.

Setelah otorisasi pengujian tulis tersedia, verifikasi signup/konfirmasi, login,
refresh/logout, provisioning, anon/warga A/B/admin, moderasi, riwayat, voting,
komentar, RPC alokasi dan dua request bersamaan. Catat fixture per run, lakukan
cleanup terbatas, lalu bandingkan fingerprint akhir dengan baseline sambil
memperhitungkan aktivitas tim lain. Rencana ini tidak memberi izin eksekusi.

Bagian berikut merekam checklist dan hasil historis deployment lima/keenam
migration. Perintah di bawah ini bukan persetujuan atau instruksi untuk memasang
migration ketujuh.

Target tunggal: `musrenbang-digital-backend`, ref `dogyibbzwfslspflsidm`.
Baseline Git: foundation `3adaff7`, integration `43373bf`.
Dokumen ini adalah prosedur persiapan. Penerapan permanen memerlukan persetujuan
terpisah; keberhasilan dry-run bukan bukti migration sudah terpasang.

## Sebelum penerapan

- [ ] Branch `feat/backend-foundation-security`; tidak ada perubahan frontend atau migration.
- [ ] Lima file migration cocok dengan commit yang telah diuji dan checksum manifest.
- [ ] Login CLI melalui browser/terminal lokal. Jangan kirim rahasia ke chat,
      menulis token/password literal pada perintah, atau menyimpannya dalam repository.
- [ ] `supabase/.temp/project-ref` tepat `dogyibbzwfslspflsidm`. Direktori ini diabaikan Git.
- [ ] Periksa ulang schema, data, serta migration history remote secara read-only.
- [ ] Siapkan snapshot kondisi awal dan mekanisme pemulihan sebelum penulisan.
- [ ] Dry-run hanya mencantumkan lima file di bawah dalam urutan yang sama.
- [ ] Tidak ada seed, reset, perubahan roles tambahan, atau operasi Vault.
- [ ] Atur jendela bootstrap dengan akses aplikasi terkendali. Signup dan Data API
      saat ini aktif; jangan membiarkan schema sebagian terpasang digunakan aplikasi.
      Perubahan pengaturan akses juga memerlukan persetujuan sebelum dilakukan.

Urutan yang diharapkan:

1. `20261026090000_init.sql`
2. `20261026090100_rls.sql`
3. `20261026090200_views.sql`
4. `20261026090300_rpc.sql`
5. `20261026195414_foundation_security.sql`

Perintah dry-run, setelah link target diverifikasi:

```powershell
bunx --bun supabase db push --project-ref dogyibbzwfslspflsidm --dry-run --skip-vault
```

Perintah pemasangan yang harus disetujui kemudian, bukan dijalankan pada persiapan:

```powershell
bunx --bun supabase db push --project-ref dogyibbzwfslspflsidm --skip-vault
```

Tidak memakai `--include-seed`, `--include-roles`, `--include-all`, atau `db reset`.
`supabase/config.toml` menonaktifkan seed; `--skip-vault` tetap wajib pada CLI ini.
Jangan menganggap penerapan kelima file atomik sebagai satu transaksi. Bila terjadi
error, hentikan, pertahankan pembatasan akses, dan periksa history serta schema aktual
sebelum menentukan pemulihan. Jangan mengulang migration kelima secara manual atau
melakukan reset pada remote.

## Verifikasi setelah penerapan

- [ ] History mencatat tepat lima versi tersebut; local/remote tidak berselisih.
- [ ] Sembilan tabel: `profiles`, `categories`, `apbd_items`, `proposals`,
      `proposal_status_history`, `votes`, `comments`, `allocations`, dan `config`.
- [ ] RLS aktif pada kesembilan tabel; policy lama yang permisif telah diganti.
- [ ] FK, unique vote/alokasi, enum moderasi/status/peran, dan alasan penolakan berlaku.
- [ ] Empat view: `v_proposals`, `v_comments`, `v_proposal_status_history`, `v_gap`.
- [ ] View usulan/turunan menyaring moderasi; definisi agregasi Gap tidak berubah.
- [ ] Trigger `on_auth_user_created`, guard profil/usulan, dan updated-at tersedia.
- [ ] Fungsi publik: `is_admin`, `set_updated_at`, `handle_new_user`,
      `guard_profile_role`, `guard_proposal_status`, `change_proposal_status`,
      `save_allocations`, dan `moderate_proposal`.
- [ ] Fungsi internal `private.can_read_proposal` dan `private.save_allocations`
      tersedia; schema `private` tidak diekspos melalui Data API.
- [ ] Anon tidak membaca profil, suara, dan alokasi individual; authenticated tidak
      menulis alokasi langsung; helper trigger/internal tidak mempunyai EXECUTE API.
- [ ] Hak TRUNCATE tidak dimiliki anon/authenticated. Profile API hanya UPDATE nama.
- [ ] Sepuluh kategori dan tiga config awal tersedia, tanpa seed APBD/usulan demo.
- [ ] Security Advisor ditinjau. Peringatan view/definer dinilai berdasarkan read
      model dan grant aktual, bukan dihilangkan dengan membongkar agregasi.

## Smoke test API yang perlu disetujui

- [ ] GET kategori/config dan view publik memakai publishable/anon key.
- [ ] Signup, email confirmation, login, refresh, dan logout dengan akun development.
- [ ] Profil otomatis warga; metadata signup tidak memberi peran admin.
- [ ] Warga A/B, anon, dan admin mengikuti matriks visibilitas tabel/view/RPC.
- [ ] Alokasi valid berhasil; overbudget dan penulisan tabel langsung ditolak.
- [ ] UID dan total alokasi akhir benar setelah concurrency dua koneksi.
- [ ] Fixture dibersihkan berdasarkan ID run; token/password/body Auth tidak dicetak.

SITE_URL, redirect allowlist, SMTP, CAPTCHA, dan rate limit perlu diperiksa pada
Dashboard sebelum tes Auth remote. Konfirmasi email tetap diperlukan. Tes HTTP
memiliki transaksi sendiri, sehingga pembuatan/cleanup fixture remote harus
disetujui; satu ROLLBACK dari koneksi SQL lain tidak membatalkan request HTTP.

## Hasil pemasangan development, 27 Oktober 2026

Pengguna menyetujui pemasangan permanen lima migration dan penonaktifan sementara
Data API serta signup pada target di atas. CLI selesai dengan exit code 0 memakai
perintah pemasangan `--skip-vault`. Kelima history lokal/remote cocok; tidak ada
seed, reset, roles tambahan, atau perubahan Vault.

Data API dan signup awalnya aktif, dinonaktifkan selama bootstrap, kemudian
dipulihkan melalui Dashboard resmi. Konfirmasi email tetap wajib; anonymous
sign-in dan manual linking tetap nonaktif. Saat pembatasan, REST dan GraphQL
menolak akses dengan 503/PGRST002. Log PostgREST mengonfirmasi konfigurasi
`pg_pgrst_no_exposed_schemas`, bukan kegagalan SQL migration.

Verifikasi read-only menemukan sembilan tabel dengan RLS aktif, empat view,
42 constraint valid, enam trigger aktif, 22 policy, delapan fungsi publik, dan
dua fungsi internal. Grants efektif menolak TRUNCATE untuk anon/authenticated,
penulisan alokasi langsung, INSERT profil, UPDATE peran profil, dan penulisan
riwayat langsung. Fungsi trigger tidak dapat dieksekusi langsung oleh peran API.
Wrapper alokasi mengunci profil sebelum memanggil validator internal.

Sepuluh kategori dan tiga config tersedia: kota `DKI Jakarta`, tahun `2026`,
anggaran virtual `10000000`. Ini nilai awal migration, belum keputusan data APBD.
Tidak ada pengguna, sesi, profil, usulan, atau alokasi pada pemeriksaan akhir.

Smoke test REST melalui publishable key lulus 15 pemeriksaan: sepuluh pembacaan
tabel/view publik, tiga penolakan SELECT individual untuk anon (401/42501),
penolakan schema private (406/PGRST106), dan `is_admin()` bernilai false untuk anon.
Pemeriksaan settings Auth juga mengonfirmasi signup aktif kembali.

Satu smoke test GraphQL belum lulus. GET mengembalikan 404/PGRST202; query POST
read-only resmi mengembalikan 406/PGRST106 karena `graphql_public` tidak diekspos.
Dashboard akhir hanya memilih schema public; private tidak dipilih. Tidak ada
perubahan tambahan untuk mengaktifkan GraphQL. Konfigurasi schema sebelum toggle
tidak direkam pada run pemasangan ini. Preflight sebelumnya melaporkan public dan
graphql_public, sehingga daftar akhir berbeda dari hasil preflight tersebut;
kesetaraan daftar schema tepat sebelum dan sesudah toggle belum dapat dipastikan.
Aplikasi memakai PostgREST/RPC. Mengaktifkan kembali graphql_public memerlukan
keputusan terpisah, bukan perubahan otomatis pada tahap ini.

Security Advisor awal sempat mengembalikan daftar kosong. Setelah hasilnya
diperbarui, terdapat sembilan temuan pada tiga jenis lint:

- Empat ERROR `security_definer_view`: seluruh view v_*. Tiga view turunan usulan
  memfilter visibilitas dan memakai security barrier; v_gap hanya agregat.
- Satu WARN `anon_security_definer_function_executable`: is_admin, helper boolean
  yang membaca UID pemanggil. Smoke test anon menghasilkan false.
- Empat WARN `authenticated_security_definer_function_executable`: is_admin,
  change_proposal_status, moderate_proposal, dan save_allocations. Definisi remote
  memuat pemeriksaan UID/peran yang sesuai dan search_path kosong.

Temuan tersebut adalah konsekuensi desain read model/RPC yang sudah diuji lokal;
tidak dihilangkan dengan mengubah migration atau grants pada tahap pemasangan.
Advisor tidak bersih dari temuan. Pengujian Auth dengan akun nyata, operasi tulis
API, dan concurrency remote belum dilakukan dan memerlukan persetujuan terpisah.
