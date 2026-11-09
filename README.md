# Musrenbang Digital

Platform partisipasi warga untuk Musrenbang: peta usulan, voting, komentar, simulator anggaran virtual, dan perbandingan Gap Warga-APBD. Proyek WIA MIA 2026.

Aplikasi ini adalah monolith: satu frontend React + Vite, satu backend Supabase (Postgres + Auth + PostgREST), dan tiga Edge Function Deno untuk asisten AI. Tidak ada server API buatan sendiri. Aturan data ditegakkan di database lewat Row Level Security, constraint, view, dan RPC; frontend hanya memanggil Supabase langsung dengan `supabase-js`. Edge Function memanggil penyedia AI yang OpenAI-compatible dan tidak menerima data pribadi.

Dokumen rancangan lengkap ada di [`ARSITEKTUR.md`](./ARSITEKTUR.md). Agar dokumen ini tidak bertabrakan dengan dokumen lain, aturan proyek sehari-hari ada di [`AGENTS.md`](./AGENTS.md).

## Stack

| Lapisan       | Teknologi                                                                      |
| ------------- | ------------------------------------------------------------------------------ |
| Frontend      | React 19, Vite 6, TypeScript, Tailwind CSS 4, React Router 7                   |
| Data client   | TanStack Query (server state dan cache)                                        |
| Form          | React Hook Form + `@hookform/resolvers` + Zod                                  |
| Peta/grafik   | Leaflet + React Leaflet, MapLibre GL, Recharts, Chart.js                       |
| Backend       | Supabase: Postgres, Auth, PostgREST, RLS, view, RPC                            |
| Edge Function | Deno: `musrenai-chat`, `admin-ai-triage`, `musrenai-cost-hint`                 |
| Kontrak       | `@musrenbang/shared`, skema Zod, konstanta domain, tipe database, helper gap   |
| Toolchain     | Bun (install, script, test), Oxlint, Oxfmt, `tsc --noEmit`, Deno, Supabase CLI |

## Struktur workspace

```
.
├── web/                      # aplikasi React + Vite
│   └── src/
│       ├── app/              # provider global + router
│       ├── components/       # layout, peta, UI dasar, tutorial
│       ├── features/         # per fitur: api.ts, queries.ts, components/
│       ├── routes/           # halaman (lazy-loaded), termasuk routes/admin/
│       ├── lib/              # Supabase client, query keys, env, format, error helper
│       └── styles/
├── packages/shared/          # kontrak domain dipakai web + seed
│   └── src/
│       ├── schemas/          # skema Zod per domain
│       ├── lib/gap.ts        # arah gap, sorting, teks penjelasan
│       ├── types/database.ts # tipe Database untuk supabase-js (manual, update bersamaan dengan migrasi)
│       └── constants.ts      # status, peran, kategori, batas teks
├── supabase/
│   ├── migrations/           # 24 migrasi skema, RLS, view, RPC (jalankan berurutan)
│   ├── functions/            # Edge Function MusrenAI + _shared/ai.ts dan _shared/pii.ts
│   ├── seed/                 # CSV APBD + 20 usulan contoh
│   ├── tests/                # assertion SQL
│   ├── DEPLOYMENT.md         # checklist remote development
│   └── MUSRENAI_*.md         # catatan aktivasi dan kesiapan MusrenAI
├── scripts/                  # seed, akun demo, predemo check, load test, runner tes
├── .env.example              # env untuk seed (bukan untuk frontend)
└── web/.env.example          # env publik untuk browser
```

## Prasyarat

- [Bun](https://bun.sh) 1.3+
- Proyek Supabase (paket gratis cukup)
- Deno v2, Supabase CLI, PowerShell 7, `psql`, dan Docker hanya untuk Edge Function dan tes lokal; bukan syarat `bun run dev`.

## Setup

### 1. Instal dependensi

```sh
bun install
```

### 2. Siapkan database Supabase

Buat proyek baru di dashboard Supabase, lalu jalankan 24 migrasi **berurutan** dari SQL Editor, atau pakai `supabase link` lalu `supabase db push` bila proyek sudah terhubung. Jalur SQL Editor paling sederhana untuk demo.

Urutan file di `supabase/migrations/`:

1. `20261026090000_init.sql`, tabel, constraint, trigger, config awal
2. `20261026090100_rls.sql`, RLS dan GRANT untuk peran API
3. `20261026090200_views.sql`, read model `v_proposals`, `v_comments`, `v_proposal_status_history`, `v_gap`
4. `20261026090300_rpc.sql`, RPC `save_allocations` dan `change_proposal_status`
5. `20261026195414_foundation_security.sql`, moderasi, batas akses tabel/view, provisioning profil, jalur alokasi lewat RPC
6. `20261027004023_security_advisor_hardening.sql`, empat view invoker dan helper baca terbatas di schema `private`
7. `20261027065525_mvp_public_stats_status_audit.sql`, provenance APBD, estimasi positif, audit status, statistik, filter kota/tahun dan status verifikasi
8. `20261028135103_auth_profile_metadata.sql`, metadata profil
9. `20261102122158_allow_owners_delete_pending_or_rejected_proposals.sql`, pemilik boleh hapus usulan `Menunggu` atau `Ditolak`
10. `20261102141207_priority_rankings.sql`, ranking prioritas
11. `20261103031212_musrenai_rate_limit.sql`, batas laju MusrenAI
12. `20261103100955_musrenai_admin_autoflag.sql`, flag otomatis triage admin
13. `20261103102540_musrenai_shared_provider_quota.sql`, kuota provider bersama
14. `20261103104403_musrenai_admin_aspiration_summary.sql`, ringkasan aspirasi admin
15. `20261103112104_musrenai_worker_runtime.sql`, runtime worker
16. `20261103154800_musrenai_provider_rolling_limits.sql`, batas rolling provider
17. `20261103232447_admin_ai_triage.sql`, triage admin
18. `20261105024359_admin_ai_triage_failed_state.sql`, status gagal triage
19. `20261105094232_admin_ai_triage_pending_as_not_analyzed.sql`, `pending` dibaca sebagai `not_analyzed`
20. `20261107094242_rls_initplan_auth_uid.sql`, optimasi `auth.uid()` pada policy RLS
21. `20261107102649_similar_proposals.sql`, `get_similar_proposals`
22. `20261107162657_foreign_key_indexes.sql`, indeks foreign key
23. `20261107162700_citizen_write_rate_limits.sql`, batas tulis warga
24. `20261108090922_aspiration_overview.sql`, `v_aspiration_overview`

Pada 8 November 2026, 24 migrasi sudah terpasang pada proyek development `dogyibbzwfslspflsidm`. Konfirmasi dengan migration list sebelum operasi remote; jangan berasumsi migrasi yang lebih baru otomatis terpasang.

Migration `foundation_security` memberi moderasi `Menunggu` pada seluruh usulan lama. Data tidak dihapus, tetapi belum tampil publik sebelum admin menyetujuinya. Seed usulan juga memakai default ini; jangan menyetujui data lama secara otomatis.

### 3. Isi environment

Env dipisah menjadi dua berkas agar service role key tidak pernah masuk bundle browser.

**Root `.env`**, hanya untuk skrip seed:

```sh
cp .env.example .env
```

```ini
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
KOTA=DKI Jakarta
TAHUN_ANGGARAN=2026
VIRTUAL_BUDGET_PER_WARGA=10000000
```

**`web/.env`**, hanya kunci publik:

```sh
cp web/.env.example web/.env
```

```ini
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

Ambil URL dan kunci dari **Dashboard Supabase, Project Settings, API**. Jangan pernah menaruh `SUPABASE_SERVICE_ROLE_KEY` di `web/.env` atau kode frontend. `VITE_MUSRENAI_ENABLED=true` adalah flag build-time opsional yang menampilkan asisten warga dan saran biaya; tanpa flag itu komponen AI tidak dirender.

### 4. Muat data seed

```sh
bun run seed
```

Seed memuat 10 kategori, data riset APBD DKI Jakarta 2026 dari CSV, 20 usulan contoh, dan nilai `config` (kota, tahun, anggaran virtual). Nilai CSV masih berstatus `perlu_lampiran`; nilainya belum menjadi komposisi program APBD terverifikasi dan tidak masuk `v_gap`. Baris tanpa nominal dilewati, bukan disimpan sebagai nol.

Seed memakai service role sehingga melewati RLS. Seed menghapus seluruh `apbd_items`, lalu hanya usulan dengan `pengusul_id IS NULL`, lalu memuat ulang. Jalankan hanya pada database yang memang disiapkan untuk seed.

Jangan jalankan seed sekarang pada proyek development `dogyibbzwfslspflsidm`: proyek itu menyimpan baris APBD 2025 (Perda DKI No. 9/2024) yang dimuat pada 5 November 2026, dan `config.tahun_anggaran` sudah bernilai 2025. Seed akan menghapus baris itu dan menimpa config dengan data contoh 2026.

### 5. Jalankan aplikasi

```sh
bun run dev
```

Buka <http://localhost:5173>.

### 6. Jadikan akun admin (opsional)

Daftar lewat halaman **Masuk**, lalu jalankan di SQL Editor:

```sql
update public.profiles
set peran = 'admin'
where email = 'email-kamu@contoh.com';
```

Profil dibuat otomatis oleh trigger saat user Auth baru mendaftar. Peran admin hanya dapat diberikan lewat SQL/dashboard, tidak lewat aplikasi.

## Perintah

Dijalankan dari root:

| Perintah                | Fungsi                                                           |
| ----------------------- | ---------------------------------------------------------------- |
| `bun run dev`           | Server dev Vite di port 5173                                     |
| `bun run build`         | Build produksi ke `web/dist`                                     |
| `bun run preview`       | Pratinjau hasil build                                            |
| `bun run deploy`        | Build, lalu deploy `web/dist` ke Cloudflare Pages                |
| `bun run seed`          | Muat APBD + usulan contoh ke Supabase (butuh service role key)   |
| `bun run demo:accounts` | Buat 40 akun warga demo `@demo.test` (butuh service role key)    |
| `bun run predemo`       | Kesiapan demo read-only, tanpa login dan tanpa Gemini            |
| `bun run load:test`     | Beban 4 endpoint baca publik, maks. 1000 request dan 50 konkuren |
| `bun run typecheck`     | Typecheck shared, web, dan skrip seed                            |
| `bun run lint`          | Oxlint seluruh workspace                                         |
| `bun run format`        | Oxfmt (menulis ulang)                                            |
| `bun run format:check`  | Oxfmt (cek saja)                                                 |
| `bun test`              | Test Bun untuk skema, gap, Edge Function handler, dan kontrak AI |
| `bun run check`         | format:check + lint + typecheck + test                           |

Urutan sebelum commit: `bun run format`, lalu `bun run check`. GitHub Actions (workflow `CI Check` di `.github/workflows/deploy.yml`) menjalankan `deno check` untuk tiga Edge Function, tes HTTP loopback Deno, `bun test`, dan `bun run typecheck`. CI tidak melakukan deploy dan melewati format dan lint.

## Halaman

| Route                    | Isi                                                                           |
| ------------------------ | ----------------------------------------------------------------------------- |
| `/`                      | Landing: penjelasan singkat, empat langkah, dan aturan transparansi           |
| `/login`                 | Masuk / daftar (email atau Google)                                            |
| `/beranda`               | Peta usulan + daftar usulan yang disetujui, filter kategori/status            |
| `/usulan`                | Daftar usulan warga dengan pencarian                                          |
| `/bandingkan`            | Perbandingan pilihan warga dan APBD; hanya data APBD terverifikasi dihitung   |
| `/apbd`                  | APBD per kategori: terverifikasi, belum terverifikasi, atau belum ada         |
| `/simulator`             | Urutkan prioritas program dan lihat alokasi anggaran virtual (butuh login)    |
| `/hasilmu`               | Ringkasan hasil alokasi dan usulan milik warga (butuh login)                  |
| `/usulan/baru`           | Form usulan dengan pilih titik di peta dan saran biaya AI (butuh login)       |
| `/usulan-saya`           | Usulan milikmu, termasuk yang menunggu atau ditolak (butuh login)             |
| `/usulan/:id`            | Detail usulan, upvote, komentar, linimasa status bercatatan                   |
| `/profil`                | Identitas akun, ubah nama, ringkasan usulan, keluar (butuh login)             |
| `/metodologi`            | Cara perbandingan dihitung dan batas datanya                                  |
| `/musrenai`              | Redirect ke `/beranda` (route lama, tanpa halaman sendiri)                    |
| `/admin`                 | Panel admin: ringkasan pekerjaan, angka utama, dan ringkasan aspirasi (admin) |
| `/admin/perlu-diperiksa` | Antrean admin dipilah MusrenAI jadi Aman dan Perlu dicek (admin)              |
| `/admin/usulan`          | Daftar seluruh usulan dengan pencarian dan penyaring (admin)                  |
| `/admin/usulan/:id`      | Rincian usulan, riwayat tahap, keputusan, hapus, dan usulan mirip (admin)     |
| `/admin/laporan`         | Ringkasan aspirasi warga dan urutan prioritas (admin)                         |

Landing dan `/login` berdiri sendiri tanpa sidebar. Halaman lain memakai sidebar di layar lebar, dan bar atas dengan menu layar penuh di HP. Tombol tema (terang/gelap) ada di landing, sidebar, dan bar atas HP; pilihannya disimpan di browser.

## MusrenAI (Edge Function)

Tiga Edge Function memakai satu klien OpenAI-compatible di `supabase/functions/_shared/ai.ts` dan satu penyamaran data pribadi di `supabase/functions/_shared/pii.ts`. Ubah penyamaran lewat berkas `_shared/pii.ts` saja, jangan menyalinnya.

- `musrenai-chat`: asisten warga. Memakai JWT warga, memakai `consume_musrenai_quota`, lalu `reserve_musrenai_provider_attempt('warga')`. Menjawab hanya dari FAQ yang disetujui lewat `MUSRENAI_FAQ_APPROVED`, tanpa memberi angka APBD dari model. Bila model menyebut angka APBD, handler membalas petunjuk ke `/apbd`.
- `admin-ai-triage`: peninjauan satu usulan oleh admin. Memakai RPC `claim_admin_ai_triage`, lalu kuota provider, lalu `finish_admin_ai_triage`. Hanya `judul`, `deskripsi`, dan `kategori` berjalan setelah `redact()` (email, telepon, dan NIK 16 digit), tanpa `lokasi`. Triage tidak pernah mengubah `moderasi` atau `status`.
- `musrenai-cost-hint`: saran rentang biaya saat mengisi form usulan. Rentang yang diterima: bilangan bulat, `min < max`, `max <= 10 * min`, antara Rp100 ribu dan Rp100 miliar. Jawaban selalu membawa label bahwa angka itu perkiraan, bukan angka resmi.

Ketiga fungsi diturunkan dengan `verify_jwt = true`. Jangan mematikannya. Kuota provider dipakai bersama: 10 percobaan per menit dan 300 per hari lewat `reserve_musrenai_provider_attempt`. Hanya tier gratis; jangan mengaktifkan penagihan.

Penyedia default adalah Gemini lewat endpoint `/v1beta/openai`. OpenRouter, OpenAI, dan gateway `custom` dapat dipilih per fungsi lewat secret `AI_<CHAT|TRIAGE|COST_HINT>_*`; rincian dan contoh perintah ada di [`supabase/functions/AI_PROVIDERS.md`](supabase/functions/AI_PROVIDERS.md). Konfigurasi dibaca berurutan: override fitur, global `AI_*`, lalu nama lama `GEMINI_*` untuk key dan model. Key, model, atau base URL yang tidak lengkap membuat handler gagal tertutup. Flag aktivasi harus sama persis dengan string `true`; asal yang diizinkan (`MUSRENAI_ALLOWED_ORIGIN`) harus cocok dengan asal situs tanpa garis miring di akhir.

Jangan mencetak nilai secret; bandingkan SHA-256 dari dashboard. Jangan mengirim usulan warga asli ke penyedia AI untuk pengujian. Pakai teks sintetis, atau usulan tes milik sendiri. Untuk bulk "Analisis AI" di admin, batasi dulu antrean ke usulan tes, karena tombol itu menganalisis setiap usulan dalam daftar.

## Aturan arsitektur

1. **Supabase adalah backend.** Jangan menambah server API terpisah. Akses data lewat PostgREST, view, dan RPC.
2. **RLS adalah sumber kebenaran otorisasi.** Menyembunyikan tombol di UI bukan keamanan. Setiap operasi tulis harus lolos policy database.
3. **Kontrak dipakai bersama.** Bentuk data, enum, dan batas teks didefinisikan sekali di `packages/shared`, lalu dipakai frontend dan seed.
4. **Validasi berlapis.** Form divalidasi Zod; payload divalidasi ulang sebelum dikirim; respons Supabase diparse dengan Zod sebelum masuk state React; database tetap punya `CHECK`, RLS, dan RPC untuk invariant lintas baris.
5. **Fitur disusun per folder.** Setiap fitur di `web/src/features/<fitur>` berisi `api.ts` (panggilan Supabase), `queries.ts` (hook TanStack Query), dan `components/`. Komponen tidak memanggil Supabase langsung, kecuali listener auth di `AuthProvider` dan helper bersama di `lib/api.ts`. Halaman di `routes/` hanya merangkai fitur.
6. **Query key terpusat.** Semua key ada di `web/src/lib/query-keys.ts` supaya invalidasi cache konsisten setelah vote, komentar, alokasi, atau perubahan status.
7. **Status usulan hanya berubah lewat RPC** agar riwayat status selalu tercatat. Frontend memanggil `change_proposal_status_with_note` (butuh catatan); remote development sudah menyediakannya karena 24 migrasi sudah terpasang.

## Validasi dan error

- `web/src/lib/env.ts` memvalidasi env Vite saat aplikasi dimuat; pesan error menunjuk ke `web/.env.example`. Vite membaca env saat build, bukan saat runtime.
- `web/src/lib/api.ts` menyediakan `parseWith`, `unwrap`, `run`, `requireUser`, dan `AppError` untuk menyeragamkan error Supabase/Zod.
- `scripts/seed.ts` memvalidasi env dan setiap baris CSV/JSON; seed berhenti dengan daftar field yang salah alih-alih menulis data setengah jadi.
- Setiap `core.ts` Edge Function memvalidasi balasan penyedia dengan Zod di server; log hanya tahap dan kode tetap, tanpa isi usulan.

## Progress saat ini

Musrenbang Digital sudah punya landing page terpisah dari dashboard, lengkap dengan mode terang/gelap dan animasi, serta halaman peta usulan, voting, komentar, simulator anggaran virtual, dan perbandingan Gap Warga dengan APBD. Backend berjalan di Supabase (Postgres, Auth, RLS, view, dan RPC) tanpa server API sendiri. Autentikasi mendukung daftar dan masuk lewat email maupun Google, dengan peran warga dan admin. Alur usulan sudah lengkap dari pengajuan lewat peta, moderasi admin, sampai linimasa status. Panel admin sudah terpisah dari halaman warga: ringkasan aspirasi dari `v_aspiration_overview`, antrean yang dipilah MusrenAI jadi Aman dan Perlu dicek, pagination, dan rincian usulan. Kode MusrenAI (chat warga, triage admin, saran biaya) sudah ada dan teruji lokal; aktivasi di remote lewat flag dan secret yang dicatat di `supabase/MUSRENAI_*.md`. 24 migrasi sudah terpasang pada proyek development.

## Pengujian backend lokal dengan RAM terbatas

`supabase/tests/foundation_security.sql` berisi SQL assertion biasa, bukan pgTAP. Jalankan memakai `psql` dengan `ON_ERROR_STOP`, bukan `supabase test db`. Prasyarat: Docker Engine aktif, Bun, Supabase CLI, PowerShell 7, dan `psql`.

Siapkan proyek lokal terisolasi tanpa menjalankan seed repository:

```powershell
New-Item -ItemType Directory -Force .tmp/foundation-local
bunx --bun supabase --workdir .tmp/foundation-local init
bunx --bun supabase --workdir .tmp/foundation-local start --exclude gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
pwsh -File scripts/test-backend.ps1
```

Hanya database Supabase yang diperlukan. Auth HTTP, Studio, Realtime, Storage, dan layanan lain tidak dijalankan. Schema Auth dan role database disiapkan Supabase CLI. Bootstrap pertama dapat mengunduh image tambahan untuk migration schema internal; image tersebut tidak berarti layanan HTTP terkait dijalankan terus-menerus. `init` cukup sekali; jangan memakai `--force` untuk menimpa konfigurasi yang ada.

Runner menerima host lokal saja, menjalankan semua migration berurutan beserta tes dalam satu koneksi dan transaksi, lalu `ROLLBACK`. Jika ada error SQL, `psql` keluar dengan kode gagal dan penutupan koneksi membatalkan transaksi. Log dan payload ada di `.tmp/backend-tests/`. Tidak ada `db push` atau perubahan remote. Gunakan `-PsqlPath` bila `psql` tidak ada di PATH. Runner juga mendeteksi instalasi Windows PostgreSQL 18 pada lokasi standar.

Setelah selesai, hentikan container proyek tes agar tidak memakai RAM:

```powershell
bunx --bun supabase --workdir .tmp/foundation-local stop
```

## Pengujian integrasi Auth, REST, dan concurrency

```powershell
pwsh -NoProfile -File scripts/test-integration.ps1
```

Runner ini membuat proyek lokal `musrenbang-integration` di `.tmp/integration-local` dari `supabase/integration/config.toml`. API memakai port 55421, PostgreSQL 55422, dan Mailpit 55424. Hanya database, Auth, PostgREST, Kong, serta Mailpit dijalankan. Tidak ada fallback remote. Semua URL database dibatasi ke alamat integration lokal.

24 migration diterapkan persisten pada database lokal dan dicatat oleh Supabase CLI. Berbeda dari tes SQL, request HTTP dan dua koneksi concurrency memakai transaksi masing-masing. Database tetap tersedia sepanjang tes, kemudian container dihentikan dengan backup lokal. Gunakan `-KeepRunning` jika perlu inspeksi setelah tes. Untuk menghentikannya secara manual:

```powershell
bunx --bun supabase --workdir .tmp/integration-local stop --project-id musrenbang-integration
```

Fixture dibuat melalui signup Auth, dikonfirmasi memakai email Mailpit, lalu login untuk memperoleh JWT asli. Password diacak setiap run dan hanya disimpan dalam memori. Peran admin diberikan lewat SQL lokal; request otorisasi tetap memakai anon key dan JWT pengguna, tanpa service-role client. Fixture usulan, akun, serta email run tersebut dibersihkan setelah tes, termasuk ketika assertion gagal.

Hasil aman disimpan sebagai JSON di `.tmp/integration-results/`, berisi nama assertion, jumlah lulus/gagal, dan kode error tanpa body Auth, password, atau token. Untuk mengulang hanya tes concurrency:

```powershell
pwsh -NoProfile -File scripts/test-integration.ps1 -ConcurrencyOnly
```

Concurrency memakai dua koneksi PostgreSQL yang berbeda dengan role authenticated dan UID akun hasil Auth. Tes mengamati `pg_blocking_pids`, bukan hanya menunggu durasi arbitrer. Skenario meliputi set kosong, set lama, serta transaksi kedua yang melebihi budget. Logout diverifikasi dengan penolakan refresh token; access JWT stateless dapat tetap berlaku sampai kedaluwarsa dan tidak diklaim langsung dicabut.

Runner lain yang tersedia (lihat `scripts/*.ps1` dan `scripts/*.ts` untuk konteks):

- Tes concurrency kuota MusrenAI (`test-musrenai-quota-concurrency`)
- Tes integrasi remote (`test-remote-integration` dan `test-synthetic-auth-restore`)
- Tes handler Deno untuk Edge Function (`supabase/tests/musrenai_deno_runtime.ts`)

## Persiapan remote development

`supabase/config.toml` adalah konteks CLI migration development dengan PostgreSQL 17 dan seed nonaktif. Konfigurasi integration tetap terpisah. Project ref remote ditetapkan melalui `supabase link`; `project_id` pada TOML bukan ref remote. Target yang diperbolehkan hanya `dogyibbzwfslspflsidm`, yang per 8 November 2026 sudah memuat 24 migration.

Metada link CLI tersimpan di `supabase/.temp/` yang diabaikan Git, jadi ref harus diperiksa sebelum operasi CLI apa pun. Prosedur dan checklist pascadeployment ada di [`supabase/DEPLOYMENT.md`](supabase/DEPLOYMENT.md).

## Deploy

Yang di-deploy hanyalah frontend statis hasil `bun run build` (folder `web/dist`) lewat `bun run deploy` ke Cloudflare Pages, plus proyek Supabase itu sendiri. CI tidak melakukan deploy.

Catatan deployment:

- Env `VITE_*` dibaca saat build, bukan saat runtime. Set di CI/hosting sebelum build.
- SPA memakai React Router; konfigurasikan rewrite semua path ke `index.html` agar refresh di `/usulan/123` tidak 404.
- Jangan pernah menaruh service role key di environment hosting frontend.
- Migrasi dijalankan sekali per proyek Supabase (SQL Editor atau `supabase db push`). Jangan edit migrasi yang sudah terpasang; tambah migrasi baru bernomor.
