# Remote Auth dan API integration testing

Runner remote terpisah dari `scripts/test-integration.ps1` dan
`scripts/integration/*`. Runner lokal tetap dibatasi ke `127.0.0.1:55421`.
Runner remote mengizinkan satu target development: project
`musrenbang-digital-backend`, ref `dogyibbzwfslspflsidm`.

## Mode awal dan preflight

Tanpa `-ExecuteRemoteWrites`, runner selalu berhenti pada preflight read-only.
Ia memvalidasi branch dan project URL/ref, mengecek key publik melalui Auth
settings, dapat membaca konfigurasi Auth melalui Management API `GET`, dan
(opsional) menghitung jumlah baris serta fingerprint server-side untuk sembilan
tabel aplikasi. Fingerprint saja yang dikembalikan; baris profil atau data pribadi
tidak diunduh. Database URL hanya boleh memakai host langsung
`db.dogyibbzwfslspflsidm.supabase.co` dengan TLS `sslmode=require`.

```powershell
pwsh -NoProfile -File scripts/test-remote-integration.ps1 `
  -ProjectRef dogyibbzwfslspflsidm `
  -PreflightOnly
```

Untuk membaca SMTP/site URL/redirect allowlist/rate limit, gunakan token
Management API yang dimasukkan lewat prompt lokal:

```powershell
pwsh -NoProfile -File scripts/test-remote-integration.ps1 `
  -ProjectRef dogyibbzwfslspflsidm `
  -PreflightOnly `
  -ManagementConfigCheck
```

Fingerprint baseline opsional memakai PostgreSQL read-only saat preflight:

```powershell
pwsh -NoProfile -File scripts/test-remote-integration.ps1 `
  -ProjectRef dogyibbzwfslspflsidm `
  -PreflightOnly `
  -IncludeReadOnlyDatabaseBaseline
```

Kredensial diminta melalui `Read-Host -AsSecureString`, hanya diteruskan sementara
ke proses Bun melalui environment proses, lalu dibersihkan. Tidak memasukkan key,
password, atau token pada command line. Key dan URL tidak masuk manifest/log.
Key publik diperiksa pada endpoint target. JWT lama yang memuat claim `ref`
dicocokkan dengan allowlist; key format baru dikonfirmasi melalui Auth endpoint
proyek yang tepat. Service key serta password database hanya diminta bila mode
tulis atau snapshot database memerlukannya.
Key baru `sb_publishable_...` dan `sb_secret_...` dikirim sebagai `apikey` tanpa
mengulang key opaque tersebut sebagai bearer; JWT Auth pengguna tetap dikirim pada
`Authorization`. Pola ini mengikuti [panduan API key Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

## Prasyarat sebelum pengujian yang menulis

- Jendela development disepakati tim. Fixture usulan yang disetujui dan alokasi
  dapat sementara memengaruhi view publik serta `v_gap`.
- Dua mailbox Warga A/B yang dapat menerima email konfirmasi, dan satu alamat
  mailbox admin yang dikuasai tim. Alias `+musrenbang-<run>-<aktor>` harus
  didukung penyedia email.
- Auth signup/email provider aktif, konfirmasi email wajib, email sender/SMTP
  mengirim ke alamat uji, rate limit cukup untuk dua signup, dan redirect setelah
  konfirmasi dapat dibuka. Jika informasi tidak tampil pada endpoint publik,
  lakukan verifikasi manual di Dashboard. Runner tidak mengubah konfigurasi.
- Catatan preflight read-only Tahap 1E sebelumnya (belum di-refresh pada implementasi
  runner ini): `SITE_URL` tercatat `http://localhost:3000`, allowlist redirect
  tambahan kosong, sedangkan Vite repository berjalan di `http://localhost:5173`.
  Periksa ulang redirect yang dipakai email sebelum signup; SMTP khusus dan nilai
  rate limit numerik belum dapat dipastikan dari pembacaan sebelumnya.
- Untuk pemeriksaan Management API, token hanya perlu hak baca konfigurasi Auth.
  Runner hanya memakai `GET /v1/projects/<ref>/config/auth` dan menampilkan
  site URL, allowlist redirect, boolean SMTP configured, serta rate-limit terpilih;
  kredensial SMTP tidak ditampilkan.
- Service role/secret key project dan password PostgreSQL dimasukkan melalui
  prompt terlindungi. Admin endpoint tidak dijalankan sebelum preflight sukses.
- Mode signup memerlukan flag `-ConfirmEmailPrerequisites` setelah operator
  memeriksa mailbox, SMTP/sender, URL redirect, dan kuota/rate limit. Jika
  Management API tidak mengungkap nilai itu, verifikasi manual di Dashboard
  menjadi prasyarat sebelum memberi flag tersebut.
- Base URL dan key harus proyek yang sama. Pooler, custom domain, dan project ref
  lain ditolak. Mode runner tidak memakai Supabase project selain allowlist.

## Fixture dan skenario

Run ID UUID v4 membentuk alamat email alias, marker metadata Auth, deskripsi, dan
judul proposal fixture yang unik. Manifest
`.tmp/remote-integration/<run-id>.json` ditulis atomik sebelum signup pertama dan
sebelum setiap request create. Penulisan memakai berkas `.pending` lalu rename,
sehingga kegagalan tulis sebelum request membatalkan create; jika proses terhenti
setelah create sebelum ID tersimpan, identitas rencana yang persisten dipakai untuk
recovery dengan pencarian exact dan verifikasi marker. Manifest
hanya menyimpan ref project, run ID, alamat email fixture, ID pengguna/usulan,
status cleanup, snapshot jumlah/fingerprint, dan status assertion. Password,
access/refresh JWT, service key, Management token, dan response body tidak pernah
disimpan atau dicetak.

Warga A/B dibuat lewat Auth signup biasa dengan metadata yang mencoba meminta role
admin. Setelah operator mengklik confirmation email, runner login, menguji refresh,
logout, provisioning profile otomatis, dan memastikan metadata/perubahan profil
tidak mengangkat role. Admin dibuat memakai Auth Admin API dengan email confirmed,
profile trigger tetap membuat role awal `warga`, lalu satu SQL terparameterisasi
mengubah `profiles.peran` untuk UUID fixture yang persis sama, hanya bila role saat
itu `warga`. Jangan memakai `user_metadata` atau `app_metadata` sebagai sumber role.
Langkah SQL ini merupakan trusted provisioning dan hanya diaktifkan bersama flag
tulis yang eksplisit.
Auth Admin `createUser` memang hanya untuk server tepercaya; konfirmasi admin
ditetapkan melalui `email_confirm: true` sesuai [referensi Auth Admin](https://supabase.com/docs/reference/javascript/auth-admin-createuser).

Skenario HTTP memakai JWT yang diterbitkan Auth untuk memeriksa visibilitas
proposal pending, penolakan update field status/pemilik, moderasi admin, view
publik, voting unik, komentar, larangan menulis riwayat, larangan insert langsung
ke `allocations`, validasi budget lewat RPC, pembatasan alokasi per warga,
ketersediaan `v_gap`, dan dua RPC alokasi HTTP bersamaan untuk pengguna sama.
Pemeriksaan lock deterministik dua koneksi tetap ada pada runner lokal terpisah:

```powershell
pwsh -NoProfile -File scripts/test-integration.ps1 -ConcurrencyOnly
```

## Perintah mode tulis, untuk persetujuan terpisah

Perintah berikut hanya contoh. Jangan dijalankan sebelum persetujuan khusus untuk
remote write testing. Skrip mewajibkan kedua switch, mailbox uji, dan kredensial
lokal yang diminta melalui prompt:

```powershell
pwsh -NoProfile -File scripts/test-remote-integration.ps1 `
  -ProjectRef dogyibbzwfslspflsidm `
  -ExecuteRemoteWrites `
  -ConfirmFixtureCleanup `
  -ConfirmEmailPrerequisites `
  -WargaAEmail warga-a@example.org `
  -WargaBEmail warga-b@example.org `
  -AdminEmail admin-uji@example.org
```

## Cleanup dan pemulihan

Cleanup tidak menghapus user hanya karena email cocok. Sebelum delete, Auth user
harus cocok pada ID bila sudah tercatat, email exact, marker Run ID, dan waktu
pembuatan yang sesuai. Bila ID belum tersimpan, pencarian email exact hanya
menemukan kandidat; marker dan waktu tetap diverifikasi, dan kandidat ambigu atau
tanpa bukti marker menghentikan cleanup untuk penanganan manual. Proposal juga
diverifikasi dengan ID, judul Run ID, deskripsi yang mengandung Run ID, dan
pengusul fixture sebelum dihapus. Proposal dihapus lebih dulu sehingga komentar,
vote, dan riwayat terkait terhapus lewat foreign key; setelah itu user fixture
dihapus via Auth Admin API. Identitas tidak cocok berarti tidak ada penghapusan.
Cleanup idempotent dan setiap langkah dicatat ke manifest sebelum/selepas aksi;
manifest `cleanup-required` dapat dipakai untuk recovery:

```powershell
pwsh -NoProfile -File scripts/test-remote-integration.ps1 `
  -ProjectRef dogyibbzwfslspflsidm `
  -RunId <UUID-dari-manifest> `
  -ExecuteRemoteWrites `
  -ConfirmFixtureCleanup `
  -RecoverCleanup
```

Recovery tidak memerlukan password PostgreSQL karena penghapusan memakai ID/email
fixture exact melalui Auth Admin/PostgREST. Jika database tidak tersedia, API
cleanup tetap diverifikasi dan fingerprint dibandingkan tidak dapat dilakukan;
runner menandainya `BASELINE_UNAVAILABLE`.

Jangan menghapus massal, reset, atau menjalankan seed. Setelah cleanup, runner
memastikan ID proposal fixture sudah tak terbaca dan membandingkan count serta
fingerprint seluruh sembilan tabel aplikasi dengan baseline. Jika aktivitas anggota
tim lain mengubah data, hasil ditandai `BASELINE_INCONCLUSIVE`; jangan menganggap
perubahan itu kebocoran runner dan jangan menghapus baris yang tidak ada di manifest.
Auth audit/email logs, event infrastruktur, dan sequence identity dapat tetap
berbeda walau tabel aplikasi kembali sama.

## Pengujian runner

Jalankan unit test, typecheck, lint, dan pemeriksaan format lokal:

```powershell
bun test
bun run typecheck
bunx oxlint scripts/remote-integration scripts/integration
bunx oxfmt --check scripts/remote-integration scripts/integration scripts/test-remote-integration.ps1 scripts/test-integration.ps1
pwsh -NoProfile -File scripts/test-integration.ps1
```

Test runner mensimulasikan kegagalan persist manifest, kegagalan request Auth,
hilangnya ID setelah create, marker akun yang tidak cocok, serta penghapusan yang
berhasil di server tetapi responsnya gagal. Cleanup ulang memverifikasi 404 tanpa
mengulang delete. Supabase lokal sungguhan harus tersedia agar alur Auth, RLS,
PostgREST, RPC, dan concurrency teruji; jika Docker tidak aktif, jangan menganggap
mock sebagai bukti E2E lokal.

Mode remote preflight hanya boleh dijalankan setelah rangkaian lokal lulus. Ia
tidak membuat akun atau fixture. Pengujian tulis tetap memerlukan persetujuan
terpisah dan prasyarat email manual.
