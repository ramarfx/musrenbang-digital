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

Seed memuat 10 kategori, data APBD DKI Jakarta 2026 dari CSV, 20 usulan contoh, dan
nilai `config` (kota, tahun, anggaran virtual). Seed memakai service role sehingga
melewati RLS. Mengulang seed aman untuk usulan warga: hanya usulan tanpa pengusul
(`pengusul_id IS NULL`) yang dihapus dan dimuat ulang.

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
7. **Status usulan hanya berubah lewat RPC** `change_proposal_status` agar riwayat
   status selalu tercatat. Trigger database menolak perubahan status langsung oleh
   non-admin.

## Validasi dan error

- `web/src/lib/env.ts` memvalidasi env Vite saat aplikasi dimuat; pesan error
  menunjuk ke `web/.env.example`.
- `web/src/lib/api.ts` menyediakan `parseWith`, `unwrap`, `run`, `requireUser`, dan
  `AppError` untuk menyeragamkan error Supabase/Zod.
- `scripts/seed.ts` memvalidasi env dan setiap baris CSV/JSON; seed berhenti dengan
  daftar field yang salah alih-alih menulis data setengah jadi.

## Status

Fondasi aplikasi, migrasi, seed, dan seluruh halaman utama sudah ada. Yang belum
dilakukan hanyalah menyiapkan proyek Supabase nyata, menjalankan migrasi, mengisi
`.env`, dan memuat seed. Setelah itu aplikasi langsung menampilkan data asli.

Catatan jujur untuk demo:

- 2 dari 10 kategori APBD (Keamanan dan Penerangan; Teknologi dan Layanan Digital)
  masih bernominal 0 dengan status `perlu_lampiran` dan ditampilkan sebagai
  "data menyusul".
- Belum ada verifikasi KTP/NIK, sehingga satu orang dapat membuat beberapa akun.
  Risiko ini dicatat, bukan disembunyikan.
- Read model memakai `security_invoker = false` secara sadar agar agregat dan nama
  penulis bisa dibaca publik; view hanya mengekspos kolom aman dan tabel dasar tetap
  dilindungi RLS. Detail ada di `ARSITEKTUR.md`.
