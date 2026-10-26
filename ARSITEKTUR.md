# Arsitektur Monolith Musrenbang Digital

Dokumen ini adalah rancangan arsitektur aplikasi Musrenbang Digital untuk WIA MIA 2026.
Sumber produk: PRD v1.0 (18 Oktober 2026). Keputusan arsitektur di bawah dibuat 26 Oktober 2026.

## 1. Keputusan arsitektur

| Keputusan | Pilihan | Keterangan |
|---|---|---|
| Bentuk aplikasi | Monolith | Satu aplikasi web + satu backend Supabase, tanpa microservice |
| Runtime dan package manager | Bun 1.4 | Toolchain: package manager, script runner, test runner |
| Bahasa | TypeScript (strict) | Dipakai di frontend dan skrip seed |
| Backend | Supabase | Postgres + Auth + PostgREST, sesuai PRD v1.0 |
| Database | Supabase Postgres | Tabel + Row Level Security + view gap |
| Lint | Oxlint | `bun run lint` |
| Format | Oxfmt | `bun run format` |
| Typecheck | tsc --noEmit | `bun run typecheck` |
| Frontend | React + Vite + Leaflet + Recharts + Tailwind | Sesuai PRD, memanggil Supabase langsung lewat supabase-js |

Catatan keputusan 26 Oktober 2026: backend diputuskan memakai Supabase saja, kembali ke
rencana PRD v1.0. Scaffold Bun + Elysia + SQLite yang dibuat pada hari yang sama sudah
diganti dengan scaffold Supabase ini. Bun tetap dipakai sebagai toolchain. Fitur produk,
model data, dan seed APBD tetap mengikuti PRD.

## 2. Loop inti produk (dari PRD)

1. Warga membuka halaman publik: peta usulan, agregat alokasi, dan halaman Bandingkan.
2. Warga mengusulkan program: kategori, lokasi di peta, estimasi biaya.
3. Warga mengalokasikan anggaran virtual Rp10.000.000 per warga (parameter konfigurasi,
   bukan uang nyata) lewat slider per kategori, dengan sisa anggaran real-time.
4. Warga memberi suara pada usulan lain: satu pengguna satu suara per usulan, bisa dibatalkan.
5. Warga dan juri melihat Gap Warga-APBD: agregat alokasi warga per kategori dibandingkan
   dengan APBD nyata per kategori, lengkap dengan penjelasan teks otomatis.
6. Admin memverifikasi usulan, mengubah statusnya, dan mengelola data APBD.
7. Status usulan dilacak publik lewat linimasa 5 tahap:
   Diajukan, Diverifikasi, Masuk APBD, Dikerjakan, Selesai.

Yang bukan tujuan MVP (dari PRD): menggantikan Musrenbang resmi, mengelola uang nyata,
multi-kota dan multi-tahun di antarmuka, aplikasi mobile native, pembayaran, integrasi
otomatis ke sistem keuangan pemerintah, forum umum, pesan pribadi, notifikasi WA/SMS,
dan verifikasi KTP/NIK.

## 3. Gambaran sistem

```
Pengunjung publik / Warga / Admin
        │  HTTPS
        ▼
┌──────────────────────────────┐
│  Aplikasi web (React + Vite) │
│  - halaman publik            │
│  - peta usulan (Leaflet)     │
│  - grafik gap (Recharts)     │
│  - slider alokasi            │
└──────────────┬───────────────┘
               │  supabase-js
               ▼
┌──────────────────────────────┐
│  Supabase (backend)          │
│  - PostgREST (API otomatis)  │
│  - Auth (email + password)   │
│  - Postgres + RLS            │
│  - view v_gap                │
└──────────────────────────────┘
```

Aturan akses dipegang Row Level Security di database, bukan di kode frontend.
Baca data APBD, gap, kategori, dan usulan terbuka untuk publik. Menulis usulan,
suara, komentar, dan alokasi hanya untuk pengguna login, dan hanya atas namanya
sendiri. Verifikasi, penolakan, perubahan status, dan pengelolaan APBD hanya untuk
admin. Validasi yang tidak bisa diwakili RLS (mis. total alokasi tidak melebihi
anggaran virtual) menjadi fungsi database (RPC) pada langkah implementasi berikutnya,
dan dicatat di migrasi saat ditambahkan.

Frontend (sudah dibangun di `project/web/`): aplikasi React + Vite dengan
Leaflet untuk peta usulan, Recharts untuk grafik gap, dan Tailwind untuk styling.
Aplikasi memanggil Supabase langsung, tanpa server API buatan sendiri. Halaman:
Beranda (peta + daftar usulan), Bandingkan, APBD, Simulator Anggaran, Buat Usulan
(dengan pilih titik di peta), Detail Usulan (voting + komentar), Login/Daftar,
dan Admin (ubah status usulan).

## 4. Modul

Backend Supabase tidak punya server API buatan sendiri. Akses data memakai PostgREST
(tabel langsung), Auth, dan satu view. Tabel di bawah adalah permukaan API-nya.

| Modul | Tabel / objek | Akses utama |
|---|---|---|
| auth | Supabase Auth + tabel `profiles` | Sign up, login, logout lewat supabase-js; peran dibaca dari `profiles.peran` |
| proposals | Tabel `proposals` + `proposal_status_history` | Baca publik; tulis oleh pemilik; status diubah admin |
| allocations | Tabel `allocations` | Baca dan tulis hanya atas nama sendiri |
| votes | Tabel `votes` | Tulis dan hapus hanya atas nama sendiri |
| comments | Tabel `comments` | Baca publik; tulis oleh pengguna login |
| apbd | Tabel `apbd_items` + `categories` | Baca publik; kelola oleh admin |
| gap | View `v_gap` | Baca publik, dihitung dari data |
| admin | Kebijakan RLS berperilaku admin | Verifikasi, penolakan, perubahan status, kelola APBD |
| publik | Query baca di atas | Peta, agregat, bandingkan, tanpa login |

## 5. Model data

Tabel inti (lihat `project/db/migrations/001_init.sql` untuk definisi lengkap,
termasuk kebijakan RLS):

- `profiles`: id (uuid, merujuk `auth.users`), email (unik), nama, peran
  (warga/admin), dibuat_pada. Baris profil dibuat setelah sign up; peran admin
  diberikan manual lewat dashboard Supabase.
- `categories`: id, nama. 10 kategori sesuai Lampiran B PRD dan seed APBD:
  Infrastruktur dan Jalan, Pendidikan, Kesehatan, Lingkungan dan Sampah,
  Air Bersih dan Drainase, Transportasi Publik, Keamanan dan Penerangan,
  Ekonomi dan UMKM, Sosial dan Budaya, Teknologi dan Layanan Digital.
- `proposals`: id, judul, deskripsi, kategori, lokasi (teks + koordinat),
  estimasi_biaya, pengusul_id (merujuk `profiles`), status (5 tahap di atas),
  dibuat_pada, diubah_pada.
- `proposal_status_history`: id, proposal_id, status_lama, status_baru, diubah_oleh,
  diubah_pada. Bersifat append-only, tidak boleh diubah atau dihapus.
- `votes`: id, user_id, proposal_id, dibuat_pada.
  Constraint: UNIQUE(user_id, proposal_id) di database, bukan hanya di kode.
- `comments`: id, proposal_id, user_id, isi, dibuat_pada.
- `allocations`: id, user_id, kategori, jumlah, diubah_pada.
  Constraint: UNIQUE(user_id, kategori). Total per user divalidasi agar tidak
  melebihi anggaran virtual, lewat fungsi database pada langkah berikutnya.
- `apbd_items`: id, kategori, nominal_rp, tahun, kota, sumber, status_verifikasi.
- `config`: kunci, nilai. Berisi kota, tahun anggaran, dan anggaran virtual per warga.
- `v_gap`: view, bukan tabel. Isinya per kategori: persen_warga, persen_apbd,
  gap_poin_persen, nominal_apbd, total_alokasi_warga.

Kebijakan RLS ringkas: baca `apbd_items`, `categories`, `config`, `proposals`,
`proposal_status_history`, `comments`, dan `v_gap` terbuka untuk publik. Tulis
`proposals`, `votes`, `comments`, dan `allocations` hanya untuk pengguna login
atas namanya sendiri. Kelola `apbd_items` dan perubahan status usulan hanya untuk
baris `profiles` yang perannya admin.

## 6. Algoritma Gap Warga-APBD

Gap dihitung saat dibaca, bukan disimpan. Implementasinya adalah view `v_gap`
di database, sehingga frontend cukup membaca view itu tanpa menghitung sendiri:

1. Jumlahkan `allocations` seluruh warga per kategori, lalu hitung persentase tiap
   kategori terhadap total alokasi warga.
2. Ambil `apbd_items` per kategori, hitung persentase tiap kategori terhadap total
   nominal APBD yang terisi.
3. Gap per kategori = persentase warga dikurangi persentase APBD (dalam poin persen).
4. Urutkan kategori berdasarkan nilai absolut gap, terbesar dulu. Kategori dengan
   gap terbesar menjadi sorotan halaman Bandingkan.
5. Penjelasan teks otomatis memakai template, contoh: "Warga mengalokasikan X persen
   untuk {kategori}, sementara APBD mengalokasikan Y persen. Selisihnya Z poin persen."

Kasus kosong: bila belum ada alokasi warga, persentase warga nol untuk semua kategori
dan halaman tetap menampilkan sisi APBD. Tidak ada angka yang dikarang.

## 7. Data seed

- Kota dan tahun: DKI Jakarta, APBD murni 2026.
  Total belanja daerah resmi Rp74.285.299.931.740 (Pergub DKI Jakarta No. 44 Tahun 2025).
- Sumber seed: `project/db/seeds/apbd-jakarta-2026.csv`, disalin dari berkas pemetaan
  di folder PRD. Skrip `bun run seed` memuatnya ke Supabase memakai service role key.
  8 dari 10 kategori terisi dengan angka program terverifikasi dari pemberitaan yang
  mengutip APBD 2026 yang disahkan; 2 kategori (Keamanan dan Penerangan, Teknologi
  dan Layanan Digital) masih kosong dan dimuat dengan nominal 0 plus status
  `perlu_lampiran`, ditampilkan sebagai "data menyusul".
- Aturan tampil: halaman Bandingkan dan Tentang wajib menampilkan sumber dan tahun
  APBD, plus catatan bahwa angka kategori adalah hasil pemetaan dari pos APBD resmi.
- Berikutnya (belum dikerjakan): seed sekitar 20 usulan contoh agar platform tidak
  tampil kosong saat pertama kali didemokan, sesuai target PRD.

## 8. Autentikasi dan otorisasi

- Registrasi dan login memakai Supabase Auth (email dan password). Sesi dipegang
  supabase-js di browser; tidak ada password yang disimpan di tabel buatan sendiri.
- Peran dibaca dari tabel `profiles`: warga dan admin. Peran admin diberikan manual
  lewat dashboard Supabase setelah akun dibuat.
- Peran publik (peta, agregat, bandingkan, daftar usulan) bisa diakses tanpa login.
  Menulis usulan, voting, komentar, dan alokasi butuh login. Verifikasi, penolakan,
  perubahan status, dan pengelolaan APBD hanya untuk admin. Semua batas ini
  ditegakkan RLS di database, bukan hanya disembunyikan di antarmuka.
- Tidak ada verifikasi KTP/NIK di MVP, sesuai PRD. Konsekuensinya (satu orang bisa
  membuat banyak akun) dicatat sebagai risiko demo, bukan disembunyikan.

## 9. Konfigurasi

Variabel lingkungan yang dipakai skrip dan aplikasi:

| Variabel | Keterangan |
|---|---|
| SUPABASE_URL | URL proyek Supabase |
| SUPABASE_ANON_KEY | Kunci publik, dipakai aplikasi web |
| SUPABASE_SERVICE_ROLE_KEY | Kunci service role, hanya untuk skrip seed, tidak boleh masuk ke frontend |
| VITE_SUPABASE_URL | Sama dengan SUPABASE_URL, untuk build Vite nanti |
| VITE_SUPABASE_ANON_KEY | Sama dengan SUPABASE_ANON_KEY, untuk build Vite nanti |

Nilai yang dulu berupa variabel server (kota, tahun anggaran, anggaran virtual
per warga) sekarang tinggal di tabel `config` di database, supaya halaman publik
membacanya dari sumber yang sama dengan data.

## 10. Toolchain dan perintah

Perintah dijalankan dari `project/`:

| Perintah | Fungsi |
|---|---|
| `bun install` | Instal dependensi |
| `bun run seed` | Muat seed APBD ke Supabase (butuh service role key) |
| `bun run lint` | Oxlint |
| `bun run format` | Oxfmt (tulis ulang) |
| `bun run format:check` | Oxfmt (cek saja, dipakai sebelum commit) |
| `bun run typecheck` | tsc --noEmit |
| `bun test` | Test runner bawaan Bun |

Urutan sebelum commit: `bun run format`, `bun run lint`, `bun run typecheck`,
lalu `bun test` bila ada test yang menyentuh kode yang diubah.

## 11. Deployment

Tidak ada server API buatan sendiri yang perlu dijalankan. Yang di-deploy:

1. Aplikasi web (hasil build Vite) ke hosting statis.
2. Proyek Supabase sebagai backend: database, Auth, dan PostgREST sudah
   disediakan Supabase.

Untuk demo lomba, yang wajib hidup hanya dua hal itu. Cadangan database mengikuti
fitur backup Supabase; ekspor CSV dari tabel `apbd_items` dan `proposals` bisa
diunduh dari dashboard bila perlu.

## 12. Urutan implementasi

1. Fondasi: buat proyek Supabase, jalankan migrasi, seed APBD dan 20 usulan
   contoh, baca view gap (sudah ada di scaffold; seed menunggu proyek Supabase
   dibuat).
2. Proposal dan halaman publik: daftar, detail, peta, riwayat status (halaman
   sudah ada di `web/`, tinggal uji dengan data asli).
3. Voting dan komentar (halaman sudah ada di `web/`).
4. Simulator alokasi dan halaman Bandingkan lengkap dengan teks otomatis
   (halaman sudah ada di `web/`).
5. Admin: verifikasi, perubahan status, kelola APBD (halaman ubah status sudah
   ada di `web/`; kelola APBD menyusul).
6. Polish demo (loop 2 sampai 3 menit tanpa error) dan uji demo ke warga.

## 13. Keputusan terbuka dan risiko

- Proyek Supabase untuk Musrenbang Digital belum dibuat. Migrasi dan seed sudah
  siap, tetapi seed baru bisa dijalankan setelah proyek dibuat dan kunci
  (URL, anon key, service role key) diisi ke `.env`.
- 2 kategori APBD masih kosong: lengkapi dari Lampiran Pergub 44/2025
  (Ringkasan Penjabaran per SKPD/urusan) sebelum rilis demo, atau tampilkan
  sebagai "data menyusul" dengan jujur.
- Seed 20 usulan contoh sudah disiapkan sebagai berkas
  (`db/seeds/proposals-contoh.json`), tinggal dijalankan setelah proyek Supabase
  dibuat.
- Akun ganda tanpa verifikasi KTP: risiko integritas agregat, dicatat di PRD Bab 15.
- Posisi produk yang jujur: prototipe kanal pra-musrenbang untuk warga, bukan
  pengganti musrenbang resmi dan bukan sistem pemerintah. Platform e-musrenbang
  pemerintah (mis. musrenbang.jakarta.go.id) mendigitalkan jalur perwakilan dan
  aparatur; pembeda produk ini adalah partisipasi warga langsung, anggaran virtual,
  voting publik, dan Gap Warga-APBD.
