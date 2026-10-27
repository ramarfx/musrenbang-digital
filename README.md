# Musrenbang Digital

Platform partisipasi warga untuk Musrenbang: peta usulan, voting, komentar, simulator
anggaran virtual, dan perbandingan **Gap Warga–APBD**. Proyek WIA MIA 2026.

Aplikasi ini adalah **monolith**: satu frontend React + Vite dan satu backend Supabase
(Postgres + Auth + PostgREST). Tidak ada server API buatan sendiri. Aturan data
ditegakkan di database lewat Row Level Security, constraint, view, dan RPC; frontend
hanya memanggil Supabase langsung dengan `supabase-js`.

Dokumen rancangan lengkap ada di [`ARSITEKTUR.md`](./ARSITEKTUR.md).

## Stack

| Lapisan     | Teknologi                                                                     |
| ----------- | ----------------------------------------------------------------------------- |
| Frontend    | React 19, Vite 6, TypeScript, Tailwind CSS 4, React Router 7                  |
| Data client | TanStack Query (server state), TanStack Table (tabel admin)                   |
| Form        | React Hook Form + `@hookform/resolvers` + Zod                                 |
| Peta/grafik | Leaflet + React Leaflet, Recharts                                             |
| Backend     | Supabase: Postgres, Auth, PostgREST, RLS, view, RPC                           |
| Kontrak     | `@musrenbang/shared` — skema Zod, konstanta domain, tipe database, helper gap |
| Toolchain   | Bun (install, script, test), Oxlint, Oxfmt, `tsc --noEmit`                    |

## Struktur workspace

```
.
├── web/                      # aplikasi React + Vite
│   └── src/
│       ├── app/              # provider global + router
│       ├── components/       # layout, peta, dan komponen UI dasar
│       ├── features/         # per fitur: api.ts, queries.ts, components/
│       ├── routes/           # halaman (lazy-loaded)
│       ├── lib/              # Supabase client, query keys, env, format, error helper
│       └── styles/
├── packages/shared/          # kontrak domain dipakai web + seed
│   └── src/
│       ├── schemas/          # skema Zod per domain
│       ├── lib/gap.ts        # arah gap, sorting, teks penjelasan
│       ├── types/database.ts # tipe Database untuk supabase-js
│       └── constants.ts      # status, peran, kategori, batas teks
├── supabase/
│   ├── migrations/           # skema, RLS, view, RPC (jalankan berurutan)
│   └── seed/                 # CSV APBD + 20 usulan contoh
├── scripts/seed.ts           # loader seed tervalidasi Zod
└── .env.example              # env untuk seed (bukan untuk frontend)
```

## Prasyarat

- [Bun](https://bun.sh) 1.3+
- Proyek Supabase (paket gratis cukup)

## Setup

### 1. Instal dependensi

```sh
bun install
```

### 2. Siapkan database Supabase

Buat proyek baru di dashboard Supabase, lalu jalankan migrasi **berurutan** dari
SQL Editor:

1. `supabase/migrations/20261026090000_init.sql` — tabel, constraint, trigger, config awal
2. `supabase/migrations/20261026090100_rls.sql` — RLS dan GRANT untuk peran API
3. `supabase/migrations/20261026090200_views.sql` — read model `v_proposals`,
   `v_comments`, `v_proposal_status_history`, `v_gap`
4. `supabase/migrations/20261026090300_rpc.sql` — RPC `save_allocations` dan
   `change_proposal_status`
5. `supabase/migrations/20261026195414_foundation_security.sql`: moderasi, batas akses
   tabel/view, provisioning profil, dan jalur tulis alokasi melalui RPC.
6. `supabase/migrations/20261027004023_security_advisor_hardening.sql`: empat view
   invoker dan helper baca terbatas di schema `private`.
7. `supabase/migrations/20261027065525_mvp_public_stats_status_audit.sql`: provenance
   APBD, estimasi usulan positif, catatan audit status, statistik, dan filter APBD
   berdasarkan kota/tahun serta status verifikasi.

Per 27 Oktober 2026, enam migration pertama sudah terpasang pada proyek development
`dogyibbzwfslspflsidm`. Migration ketujuh masih lokal dan belum disetujui untuk
pemasangan remote. Remote masih memakai kontrak enam migration; jangan menganggap
view statistik atau kolom provenance migration ketujuh sudah tersedia di sana.

Migration kelima memberi moderasi `Menunggu` pada seluruh usulan lama. Data tidak
dihapus, tetapi belum tampil publik sebelum admin menyetujuinya. Seed usulan juga
memakai default ini; jangan menyetujui data lama secara otomatis.

Alternatif: gunakan Supabase CLI (`supabase link`, lalu `supabase db push`) bila
proyek sudah dihubungkan. Jalur SQL Editor adalah jalur yang paling sederhana untuk
demo.

### 3. Isi environment

Env dipisah menjadi dua berkas agar service role key tidak pernah masuk bundle browser.

**Root `.env`** — hanya untuk skrip seed:

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

**`web/.env`** — hanya kunci publik:

```sh
cp web/.env.example web/.env
```

```ini
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

Ambil URL dan kunci dari **Dashboard Supabase → Project Settings → API**. Jangan pernah
menaruh `SUPABASE_SERVICE_ROLE_KEY` di `web/.env` atau kode frontend.

### 4. Muat data seed

```sh
bun run seed
```

Seed memuat 10 kategori, data riset APBD DKI Jakarta 2026 dari CSV, 20 usulan contoh,
dan nilai `config` (kota, tahun, anggaran virtual). Nilai CSV saat ini masih berstatus
`perlu_lampiran`; nilainya belum menjadi komposisi program APBD terverifikasi dan
tidak masuk `v_gap`. Baris tanpa nominal dilewati, bukan disimpan sebagai nol.
Seed memakai service role sehingga melewati RLS dan menghapus seluruh `apbd_items`
serta usulan contoh tanpa pengusul sebelum memuat ulang. Jalankan hanya pada database
yang memang disiapkan untuk seed, jangan pada remote berisi data yang perlu dijaga.

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

Profil dibuat otomatis oleh trigger saat user Auth baru mendaftar. Peran admin hanya
dapat diberikan lewat SQL/dashboard, tidak lewat aplikasi.

## Perintah

Dijalankan dari root:

| Perintah               | Fungsi                                                         |
| ---------------------- | -------------------------------------------------------------- |
| `bun run dev`          | Server dev Vite di port 5173                                   |
| `bun run build`        | Build produksi ke `web/dist`                                   |
| `bun run preview`      | Pratinjau hasil build                                          |
| `bun run seed`         | Muat APBD + usulan contoh ke Supabase (butuh service role key) |
| `bun run typecheck`    | Typecheck shared, web, dan skrip seed                          |
| `bun run lint`         | Oxlint seluruh workspace                                       |
| `bun run format`       | Oxfmt (menulis ulang)                                          |
| `bun run format:check` | Oxfmt (cek saja)                                               |
| `bun test`             | Test Bun untuk skema dan logika gap                            |
| `bun run check`        | format:check + lint + typecheck + test                         |

Urutan sebelum commit: `bun run format`, lalu `bun run check`.

## Halaman

| Route          | Isi                                                        |
| -------------- | ---------------------------------------------------------- |
| `/`            | Peta usulan + daftar, filter kategori/status               |
| `/bandingkan`  | Grafik, sorotan, dan tabel Gap Warga–APBD + teks otomatis  |
| `/apbd`        | Rincian APBD per kategori, sumber, dan status verifikasi   |
| `/simulator`   | Slider alokasi anggaran virtual per kategori (butuh login) |
| `/usulan/baru` | Form usulan dengan pilih titik di peta (butuh login)       |
| `/usulan/:id`  | Detail usulan, voting, komentar, linimasa status           |
| `/login`       | Masuk / daftar                                             |
| `/admin`       | Tabel usulan (TanStack Table) + ubah status (khusus admin) |

## Aturan arsitektur

1. **Supabase adalah backend.** Jangan menambah server API terpisah. Akses data lewat
   PostgREST, view, dan RPC.
2. **RLS adalah sumber kebenaran otorisasi.** Menyembunyikan tombol di UI bukan
   keamanan. Setiap operasi tulis harus lolos policy database.
3. **Kontrak dipakai bersama.** Bentuk data, enum, dan batas teks didefinisikan sekali
   di `packages/shared`, lalu dipakai frontend dan seed.
4. **Validasi berlapis.** Form divalidasi Zod; payload divalidasi ulang sebelum dikirim;
   respons Supabase diparse dengan Zod sebelum masuk state React; database tetap punya
   `CHECK`, RLS, dan RPC untuk invariant lintas baris.
5. **Fitur disusun per folder.** Setiap fitur di `web/src/features/<fitur>` berisi
   `api.ts` (panggilan Supabase), `queries.ts` (hook TanStack Query), dan `components/`.
   Halaman di `routes/` hanya merangkai fitur.
6. **Query key terpusat.** Semua key ada di `web/src/lib/query-keys.ts` supaya
   invalidasi cache konsisten setelah vote, komentar, alokasi, atau perubahan status.
7. **Status usulan hanya berubah lewat RPC** agar riwayat status selalu tercatat.
   Remote enam migration masih menggunakan `change_proposal_status`; migration lokal
   7 menyediakan `change_proposal_status_with_note` dan kontrak frontend perlu
   mengirim catatan sebelum migration itu dipertimbangkan untuk deployment.

## Validasi dan error

- `web/src/lib/env.ts` memvalidasi env Vite saat aplikasi dimuat; pesan error
  menunjuk ke `web/.env.example`.
- `web/src/lib/api.ts` menyediakan `parseWith`, `unwrap`, `run`, `requireUser`, dan
  `AppError` untuk menyeragamkan error Supabase/Zod.
- `scripts/seed.ts` memvalidasi env dan setiap baris CSV/JSON; seed berhenti dengan
  daftar field yang salah alih-alih menulis data setengah jadi.

## Status

Fondasi Auth, RLS, RPC, dan enam migration sudah diuji lokal dan terpasang pada
development. Migration ketujuh beserta perubahan kontrak lokal sudah diuji, tetapi
belum diterapkan remote. Sebagian kontrak frontend masih perlu disesuaikan sebelum
migration ketujuh dipasang. Tersedianya kode bukan bukti seluruh kriteria PRD lulus.

Catatan jujur untuk demo:

- CSV APBD saat ini berisi rincian awal dari ringkasan APBD murni 2026, bukan rekonsiliasi
  APBD Perubahan dan bukan pemetaan final belanja program. Semua item berstatus
  `perlu_lampiran`; dua kategori tanpa nominal dilewati oleh seed. Nilai belum boleh
  diperlakukan sebagai angka perbandingan resmi.
- Belum ada verifikasi KTP/NIK, sehingga satu orang dapat membuat beberapa akun.
  Risiko ini dicatat, bukan disembunyikan.
- Setelah migration keenam, read model memakai `security_invoker = true` dan RLS
  tabel sumber. Helper `private` menjaga nama penulis, jumlah suara, dan agregat
  lintas warga tetap tersedia. RPC tulis tetap memakai `SECURITY DEFINER` dengan
  validasi identitas, peran, dan payload. Migration ketujuh menambahkan catatan wajib
  untuk perubahan status dan statistik. Detail serta kontrak frontend ada di
  [`ARSITEKTUR.md`](./ARSITEKTUR.md) dan
  [`supabase/BACKEND_HANDOFF.md`](./supabase/BACKEND_HANDOFF.md).

## Pengujian backend lokal dengan RAM terbatas

`supabase/tests/foundation_security.sql` berisi SQL assertion biasa, bukan pgTAP.
Jalankan memakai `psql` dengan `ON_ERROR_STOP`, bukan `supabase test db`.
Prasyarat: Docker Engine aktif, Bun, Supabase CLI, PowerShell 7, dan `psql`.

Siapkan proyek lokal terisolasi tanpa menjalankan seed repository:

```powershell
New-Item -ItemType Directory -Force .tmp/foundation-local
bunx --bun supabase --workdir .tmp/foundation-local init
bunx --bun supabase --workdir .tmp/foundation-local start --exclude gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
pwsh -File scripts/test-backend.ps1
```

Hanya database Supabase yang diperlukan. Auth HTTP, Studio, Realtime, Storage, dan
layanan lain tidak dijalankan. Schema Auth dan role database disiapkan Supabase CLI.
Bootstrap pertama dapat mengunduh image tambahan untuk migration schema internal;
image tersebut tidak berarti layanan HTTP terkait dijalankan terus-menerus.
`init` cukup sekali; jangan memakai `--force` untuk menimpa konfigurasi yang ada.

Runner menerima host lokal saja, menjalankan semua migration berurutan beserta tes
dalam satu koneksi dan transaksi, lalu `ROLLBACK`. Jika ada error SQL, `psql` keluar
dengan kode gagal dan penutupan koneksi membatalkan transaksi. Log dan payload ada
di `.tmp/backend-tests/`. Tidak ada `db push` atau perubahan remote.
Gunakan `-PsqlPath` bila `psql` tidak ada di PATH. Runner juga mendeteksi instalasi
Windows PostgreSQL 18 pada lokasi standar.

Setelah selesai, hentikan container proyek tes agar tidak memakai RAM:

```powershell
bunx --bun supabase --workdir .tmp/foundation-local stop
```

## Pengujian integrasi Auth, REST, dan concurrency

```powershell
pwsh -NoProfile -File scripts/test-integration.ps1
```

Runner ini membuat proyek lokal `musrenbang-integration` di `.tmp/integration-local`
dari `supabase/integration/config.toml`. API memakai port 55421, PostgreSQL 55422,
dan Mailpit 55424. Hanya database, Auth, PostgREST, Kong, serta Mailpit dijalankan.
Tidak ada fallback remote. Semua URL database dibatasi ke alamat integration lokal.

Tujuh migration diterapkan persisten pada database lokal dan dicatat oleh Supabase
CLI. Berbeda dari tes SQL, request HTTP dan dua koneksi concurrency memakai
transaksi masing-masing. Database tetap tersedia sepanjang tes, kemudian container
dihentikan dengan backup lokal. Gunakan `-KeepRunning` jika perlu inspeksi setelah tes.
Untuk menghentikannya secara manual:

```powershell
bunx --bun supabase --workdir .tmp/integration-local stop --project-id musrenbang-integration
```

Fixture dibuat melalui signup Auth, dikonfirmasi memakai email Mailpit, lalu login
untuk memperoleh JWT asli. Password diacak setiap run dan hanya disimpan dalam
memori. Peran admin diberikan lewat SQL lokal; request otorisasi tetap memakai anon
key dan JWT pengguna, tanpa service-role client. Fixture usulan, akun, serta email
run tersebut dibersihkan setelah tes, termasuk ketika assertion gagal.

Hasil aman disimpan sebagai JSON di `.tmp/integration-results/`, berisi nama
assertion, jumlah lulus/gagal, dan kode error tanpa body Auth, password, atau token.
Untuk mengulang hanya tes concurrency:

```powershell
pwsh -NoProfile -File scripts/test-integration.ps1 -ConcurrencyOnly
```

Concurrency memakai dua koneksi PostgreSQL yang berbeda dengan role authenticated
dan UID akun hasil Auth. Tes mengamati `pg_blocking_pids`, bukan hanya menunggu
durasi arbitrer. Skenario meliputi set kosong, set lama, serta transaksi kedua yang
melebihi budget. Logout diverifikasi dengan penolakan refresh token; access JWT
stateless dapat tetap berlaku sampai kedaluwarsa dan tidak diklaim langsung dicabut.

## Persiapan remote development

`supabase/config.toml` adalah konteks CLI migration development dengan PostgreSQL 17
dan seed nonaktif. Konfigurasi integration tetap terpisah. Project ref remote
ditetapkan melalui `supabase link`; `project_id` pada TOML bukan ref remote.
Target yang diperbolehkan hanya `dogyibbzwfslspflsidm`.
Prosedur dry-run, perintah pemasangan yang memerlukan persetujuan, dan checklist
pascadeployment tersedia di [`supabase/DEPLOYMENT.md`](supabase/DEPLOYMENT.md).
