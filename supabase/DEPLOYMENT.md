# Checklist remote development

## Kondisi dan rencana rollout

Pemeriksaan read-only 28 Oktober 2026: target `dogyibbzwfslspflsidm` memiliki
tepat enam migration, sembilan tabel ber-RLS, dan Security Advisor 0 ERROR serta
3 WARN RPC authenticated. Migration 7 dan 8 hanya lokal. Status: **NO-GO** sampai
koordinasi frontend, evaluasi data dan persetujuan deployment terpisah selesai.
Frontend main `5e3728c` memanggil RPC bercatatan yang belum tersedia pada remote saat ini.
Runner pengujian remote menargetkan delapan migration dan menolak history lain.

1. Verifikasi target, history, checksum, backup dan dampak terhadap data aktual.
   Migration 7 mengubah provenance dan riwayat legacy; migration 8 hanya menangani
   profil baru. Tinjau profil legacy per ID tanpa perbaikan massal.
2. Tinjau Gap, APBD, session cache dan kontrak frontend; semua data seed APBD belum
   terverifikasi sebagai program resmi. Jangan menjalankan seed sebagai workaround.
3. Lakukan dry-run CLI baru sebelum deployment dan pastikan hanya migration 7 dan 8
   direncanakan, tanpa seed, reset atau Vault. Dry-run lama bukan bukti untuk migration 8.
4. Deployment dan perubahan pembatasan akses memerlukan persetujuan terpisah.
   Jangan mengasumsikan seluruh migration atomik. Jika gagal, hentikan dan tinjau
   schema dan history tanpa reset atau manipulasi history.
5. Setelah deployment yang disetujui, periksa history, RLS, grants, views, trigger,
   RPC, schema private, Advisor dan smoke test baca. Uji tulis Auth/API remote hanya
   dengan persetujuan terpisah, fixture terbatas, baseline dan cleanup terverifikasi.

SITE_URL, redirect allowlist, SMTP, rate limit, Google OAuth dan fingerprint penuh
remote belum terverifikasi. Jangan menganggap OAuth sungguhan lulus berdasarkan
fixture metadata lokal.

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
