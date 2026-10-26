# Arsitektur Musrenbang Digital

Dokumen ini menjelaskan arsitektur aplikasi Musrenbang Digital untuk WIA MIA 2026.
Sumber produk: PRD v1.0 (18 Oktober 2026). Keputusan arsitektur di bawah berlaku
26 Oktober 2026, setelah restrukturisasi dari scaffold awal menjadi monolith
feature-oriented.

## 1. Keputusan arsitektur

| Keputusan       | Pilihan                                        | Alasan                                                      |
| --------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| Bentuk aplikasi | Monolith                                       | Satu frontend + satu backend Supabase, tanpa microservice   |
| Frontend        | React 19 + Vite 6 + TypeScript strict          | Cepat, sederhana, cocok untuk demo dan deployment statis    |
| Backend         | Supabase (Postgres + Auth + PostgREST)         | Sesuai PRD; tidak perlu server API sendiri                  |
| Otorisasi       | Row Level Security + RPC                       | Aturan data tinggal di database, bukan hanya di UI          |
| Kontrak domain  | `@musrenbang/shared` (Zod + tipe)              | Satu sumber kebenaran untuk frontend, seed, dan dokumen     |
| Server state    | TanStack Query                                 | Cache, invalidasi, loading/error state yang konsisten       |
| Tabel admin     | TanStack Table                                 | Sorting/filtering tanpa menulis ulang logika tabel          |
| Form            | React Hook Form + resolvers Zod                | Validasi client dan tipe yang sama dengan kontrak shared    |
| Peta/grafik     | Leaflet + React Leaflet, Recharts              | Sesuai kebutuhan peta usulan dan grafik gap                 |
| Styling         | Tailwind CSS 4 + `clsx` + `tailwind-merge`     | Utility-first, komponen kecil, tanpa design system berat    |
| Notifikasi      | Sonner                                         | Toast ringan untuk sukses/gagal mutasi                      |
| Toolchain       | Bun, Oxlint, Oxfmt, `tsc --noEmit`, `bun test` | Satu alat untuk install, script, test, dan pemeriksaan kode |

Prinsip utama: **semua aturan yang bisa dijaga database diletakkan di database**.
Frontend boleh menyembunyikan tombol, tetapi database tetap menolak operasi yang
tidak berhak.

## 2. Loop inti produk

1. Warga membuka halaman publik: peta usulan, daftar usulan, agregat, dan halaman
   Bandingkan.
2. Warga mengusulkan program: kategori, deskripsi, lokasi di peta, estimasi biaya.
3. Warga membagi anggaran virtual Rp10.000.000 per warga (nilai dari tabel `config`,
   bukan uang nyata) lewat slider per kategori, dengan sisa anggaran real-time.
4. Warga memberi suara pada usulan lain: satu pengguna satu suara per usulan, dapat
   dibatalkan.
5. Warga dan juri melihat **Gap Warga–APBD**: persentase alokasi warga per kategori
   dibandingkan persentase APBD per kategori, dengan penjelasan teks otomatis.
6. Admin mengubah status usulan dan (lewat SQL/dashboard) mengelola data APBD.
7. Status usulan dilacak publik lewat linimasa lima tahap: Diajukan, Diverifikasi,
   Masuk APBD, Dikerjakan, Selesai.

Di luar cakupan MVP: menggantikan Musrenbang resmi, mengelola uang nyata, multi-kota
dan multi-tahun di antarmuka, aplikasi mobile native, pembayaran, integrasi otomatis
ke sistem keuangan pemerintah, forum umum, pesan pribadi, notifikasi WA/SMS, dan
verifikasi KTP/NIK.

## 3. Gambaran sistem

```
Pengunjung publik / Warga / Admin
        │ HTTPS
        ▼
┌─────────────────────────────────────────────┐
│ Aplikasi web (React + Vite)                 │
│                                             │
│ routes/        halaman lazy-loaded          │
│ features/      api + queries + komponen     │
│ components/    layout, peta, UI dasar       │
│ lib/           supabase, query keys, env    │
│                                             │
│ TanStack Query ── cache & invalidasi        │
│ Zod ── validasi input + parsing respons     │
└───────────────────┬─────────────────────────┘
                    │ supabase-js (anon key)
                    ▼
┌─────────────────────────────────────────────┐
│ Supabase                                    │
│                                             │
│ PostgREST ── API otomatis dari tabel/view   │
│ Auth      ── email + password, sesi JWT     │
│ Postgres  ── tabel, constraint, trigger     │
│ RLS       ── otorisasi per baris            │
│ Views     ── read model aman                │
│ RPC       ── invariant lintas baris         │
└─────────────────────────────────────────────┘
```

Tidak ada server aplikasi yang dijalankan sendiri. Frontend memanggil PostgREST dan
RPC langsung. Service role key hanya dipakai skrip seed di mesin lokal/CI, tidak
pernah dikirim ke browser.

## 4. Struktur workspace

```
.
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── AppProviders.tsx   # QueryClient, AuthProvider, Toaster
│   │   │   └── router.tsx         # route lazy + guard
│   │   ├── components/
│   │   │   ├── layout/            # AppLayout, Navbar, Footer
│   │   │   ├── map/               # ProposalMap, LocationPicker
│   │   │   └── ui/                # Button, Card, Field, Input, Select, dll.
│   │   ├── features/
│   │   │   ├── admin/             # tabel + mutasi status
│   │   │   ├── allocations/       # simulator + RPC save_allocations
│   │   │   ├── apbd/              # tabel APBD
│   │   │   ├── auth/              # provider, form, guard
│   │   │   ├── categories/        # daftar kategori
│   │   │   ├── comments/          # komentar
│   │   │   ├── config/            # config aplikasi
│   │   │   ├── gap/               # grafik, sorotan, tabel gap
│   │   │   └── proposals/         # daftar, form, vote, status
│   │   ├── lib/                   # api, env, format, cn, leaflet, query keys
│   │   ├── routes/                # Beranda, Bandingkan, Apbd, Simulator, dll.
│   │   ├── styles/index.css
│   │   └── main.tsx
│   └── vite.config.ts             # alias @/ dan @musrenbang/shared
├── packages/shared/
│   └── src/
│       ├── schemas/               # auth, profile, proposal, allocation, dll.
│       ├── lib/gap.ts             # arah, sorting, teks gap
│       ├── types/database.ts      # tipe Database untuk supabase-js
│       ├── constants.ts           # enum domain + batas teks
│       └── index.ts               # barrel export
├── supabase/
│   ├── migrations/
│   │   ├── 20261026090000_init.sql
│   │   ├── 20261026090100_rls.sql
│   │   ├── 20261026090200_views.sql
│   │   └── 20261026090300_rpc.sql
│   └── seed/
│       ├── apbd-jakarta-2026.csv
│       └── proposals-contoh.json
├── scripts/seed.ts
├── .env.example                   # env seed
├── tsconfig.base.json
└── package.json                   # Bun workspace
```

`web` dan `packages/shared` adalah workspace Bun. Frontend mengimpor shared lewat
alias Vite/TypeScript ke sumber TypeScript langsung, sehingga tidak perlu build
paket terpisah saat pengembangan.

## 5. Lapisan frontend

### 5.1 Pembagian tanggung jawab

| Lapisan                  | Isi                                                      | Aturan                                                        |
| ------------------------ | -------------------------------------------------------- | ------------------------------------------------------------- |
| `app/`                   | Provider global dan router                               | Tidak berisi logika domain                                    |
| `routes/`                | Satu berkas per halaman                                  | Merangkai fitur; boleh memegang state UI halaman              |
| `features/*/api.ts`      | Panggilan Supabase + parsing Zod                         | Tidak memakai React; melempar `AppError`                      |
| `features/*/queries.ts`  | Hook TanStack Query                                      | Query key dari `lib/query-keys.ts`; invalidasi setelah mutasi |
| `features/*/components/` | Komponen khusus fitur                                    | Menerima data lewat props; tidak memanggil Supabase langsung  |
| `components/`            | Layout, peta, dan UI dasar                               | Dapat dipakai lintas fitur                                    |
| `lib/`                   | Supabase client, env, format, error helper, query client | Infrastruktur lintas fitur                                    |

Aturan penting: komponen tidak memanggil `supabase` langsung. Semua akses data lewat
`api.ts`, lalu dibungkus hook di `queries.ts`.

### 5.2 Alur data

```
Komponen
  │ memakai hook
  ▼
useQuery / useMutation (features/*/queries.ts)
  │ memanggil fungsi
  ▼
api.ts
  │ supabase.from(...) / supabase.rpc(...)
  ▼
PostgREST / PostgreSQL
  │ data mentah
  ▼
parseWith(skema Zod)  ← validasi bentuk + coercion bigint
  │ data bertipe
  ▼
Cache TanStack Query → render
```

`web/src/lib/api.ts` menyediakan:

- `AppError` — error seragam dengan `code` opsional.
- `toAppError` — menerjemahkan error Supabase/Zod/JS.
- `parseWith` — memvalidasi respons dengan Zod sebelum masuk state.
- `unwrap` — mengambil data wajib; error bila `error` atau `data === null`.
- `run` — menjalankan insert/update/RPC yang tidak mengembalikan baris.
- `requireUser` — memastikan ada sesi sebelum mutasi.

### 5.3 State server dan cache

- Satu `QueryClient` global di `app/AppProviders.tsx`.
- Default: `staleTime` 30 detik, `gcTime` 5 menit, retry 1, tanpa refetch saat
  window fokus; mutasi tanpa retry.
- Semua query key terpusat di `lib/query-keys.ts`, misalnya:
  - `['proposals']` untuk daftar
  - `['proposals', 'detail', id]` untuk detail
  - `['proposals', 'history', id]` untuk linimasa
  - `['comments', id]`, `['gap']`, `['apbd']`, `['allocations', userId]`
- Setelah mutasi, hook menginvalidasi key terkait. Contoh: mengubah status
  menginvalidasi daftar, detail, riwayat, dan gap.
- `AuthProvider` menyimpan sesi Auth di cache dan menghapus cache profil saat logout;
  `signOut` membersihkan seluruh cache.

### 5.4 Routing dan guard

Route memakai `createBrowserRouter` dan `React.lazy` per halaman, dengan
`Suspense` + `PageLoader`. Guard:

- `RequireAuth` membungkus `/usulan/baru`.
- `RequireAdmin` membungkus `/admin`.

Guard hanya untuk pengalaman UI. Penegakan sebenarnya tetap RLS/RPC di database.

### 5.5 Form dan validasi input

- `ProposalForm` memakai React Hook Form + `zodResolver(proposalInputSchema)`.
- Form login/daftar memakai skema auth shared.
- Komentar dan simulator memvalidasi payload sebelum memanggil API.
- Pesan error Zod ditampilkan per field lewat komponen `Field`.
- Form usulan memakai `LocationPicker` (Leaflet) untuk memilih koordinat; latitude dan
  longitude harus diisi berpasangan (divalidasi `superRefine`).

### 5.6 UI

- Tailwind CSS 4 lewat plugin Vite; token warna netral stone + aksen emerald.
- Komponen dasar: `Button`, `Card`, `Badge`, `Field`, `Input`, `Select`, `Textarea`,
  `EmptyState`, `ErrorState`, `Skeleton`, `Spinner`, `PageLoader`, `PageHeader`.
- `cn()` menggabungkan `clsx` + `tailwind-merge`.
- Status usulan ditampilkan lewat `StatusBadge`; linimasa lewat `StatusTimeline`.
- Tabel admin memakai TanStack Table: sorting, pencarian global, dan select status
  per baris.
- Peta memakai Leaflet dengan tile OpenStreetMap dan ikon yang dikonfigurasi di
  `lib/leaflet.ts`.
- Grafik gap memakai Recharts (bar chart), dilengkapi sorotan kategori terbesar dan
  tabel rinci.

## 6. Backend Supabase

### 6.1 Urutan migrasi

Migrasi harus dijalankan berurutan karena saling bergantung:

1. **`init`** — tabel, constraint, index, fungsi helper, trigger, kategori awal,
   config awal.
2. **`rls`** — mengaktifkan RLS, membuat policy, dan memberi GRANT ke peran API.
3. **`views`** — read model yang dipakai frontend.
4. **`rpc`** — fungsi transaksional untuk invariant lintas baris.
5. **`foundation_security`**: moderasi terpisah, pembatasan visibilitas lintas tabel/view,
   provisioning profil tepercaya, dan pengamanan jalur tulis alokasi.

Semua migrasi ditulis idempoten (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`,
`CREATE OR REPLACE`) agar aman diulang saat pengembangan.

### 6.2 Tabel

| Tabel                     | Isi                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `profiles`                | `id` → `auth.users`, email unik, nama, peran (`warga`/`admin`), waktu dibuat        |
| `categories`              | 10 kategori dari Lampiran B PRD                                                     |
| `apbd_items`              | Kategori, nominal rupiah, tahun, kota, sumber, status verifikasi                    |
| `proposals`               | Judul, deskripsi, kategori, lokasi teks, lat/long, estimasi biaya, pengusul, status |
| `proposal_status_history` | Usulan, status lama/baru, admin yang mengubah, waktu. Append-only                   |
| `votes`                   | User, usulan, waktu. `UNIQUE(user_id, proposal_id)`                                 |
| `comments`                | Usulan, user, isi, waktu                                                            |
| `allocations`             | User, kategori, jumlah. `UNIQUE(user_id, kategori)`                                 |
| `config`                  | Key-value: `kota`, `tahun_anggaran`, `virtual_budget_per_warga`                     |

Constraint penting:

- Status usulan dibatasi `CHECK` ke lima nilai resmi.
- Peran dibatasi `warga`/`admin`.
- Panjang judul 8–120 karakter, deskripsi 20–2000 karakter.
- Koordinat dibatasi (-90..90, -180..180).
- Nominal dan jumlah alokasi tidak negatif.
- Kategori pada `proposals`, `apbd_items`, dan `allocations` merujuk `categories.nama`
  dengan `ON UPDATE CASCADE`.

Index disediakan untuk query publik dan admin: usulan berdasarkan waktu/status/kategori,
riwayat per usulan, suara per usulan, komentar per usulan, alokasi per kategori, dan
APBD per kategori/tahun.

### 6.3 Read model (view)

Frontend membaca view, bukan join manual. View dibuat dengan
`security_invoker = false` **secara sadar**: view berjalan dengan hak pemilik sehingga
bisa membaca lintas baris untuk agregat dan nama penulis. View hanya mengekspos kolom
aman; tabel dasar tetap dilindungi RLS.

| View                        | Kolom penting                                                                 | Dipakai untuk                           |
| --------------------------- | ----------------------------------------------------------------------------- | --------------------------------------- |
| `v_proposals`               | Semua kolom usulan + `pengusul_nama` + `jumlah_suara`                         | Daftar, detail, admin                   |
| `v_comments`                | `id`, `proposal_id`, `isi`, `dibuat_pada`, `penulis_nama`                     | Komentar publik (tanpa `user_id`/email) |
| `v_proposal_status_history` | Status lama/baru, waktu, `diubah_oleh_nama`                                   | Linimasa status                         |
| `v_gap`                     | `kategori`, `persen_warga`, `persen_apbd`, `gap_poin_persen`, nominal agregat | Halaman Bandingkan                      |

`v_proposals` tetap mengekspos `pengusul_id` agar UI dapat mengetahui pemilik, tetapi
tidak mengekspos email. `v_comments` sengaja tidak mengekspos `user_id`.

### 6.4 RPC

**`save_allocations(p_rows jsonb)`**

- Memastikan ada user login (`auth.uid()`).
- Memvalidasi payload: array JSON, kategori string valid dan dikenal, jumlah bilangan
  bulat non-negatif, tidak ada kategori duplikat.
- Membaca `virtual_budget_per_warga` dari `config` (fallback Rp10.000.000).
- Menolak total alokasi yang melebihi anggaran virtual.
- Menghapus seluruh alokasi user lalu memasukkan payload baru dalam satu transaksi,
  sehingga kategori yang dikosongkan ikut hilang.

**`change_proposal_status(p_proposal_id bigint, p_status text)`**

- Memastikan user login dan `is_admin()`.
- Memvalidasi status terhadap daftar resmi.
- Mengunci baris usulan (`FOR UPDATE`), kembali tanpa perubahan bila status sama.
- Mengubah status dan menulis `proposal_status_history` dalam satu transaksi.

Kedua fungsi memakai `SECURITY DEFINER`, `SET search_path = ''`, dan hanya diberi
`EXECUTE` untuk `authenticated` (bukan `anon`).

### 6.5 Fungsi dan trigger

| Objek                     | Fungsi                                                                |
| ------------------------- | --------------------------------------------------------------------- |
| `is_admin()`              | Cek peran admin tanpa memicu rekursi RLS pada `profiles`              |
| `set_updated_at()`        | Mengisi `diubah_pada` pada update                                     |
| `handle_new_user()`       | Membuat baris `profiles` otomatis saat `auth.users` bertambah         |
| `guard_proposal_status()` | Menolak perubahan status oleh non-admin selain lewat service role/RPC |
| `guard_profile_role()`    | Menolak warga mengubah `peran` atau `email` miliknya sendiri          |

Trigger `on_auth_user_created` membuat profil otomatis. Nama diambil dari metadata
`nama`, fallback ke bagian sebelum `@` pada email. Frontend tidak lagi melakukan insert
profil manual setelah sign up.

## 7. Keamanan dan RLS

### 7.1 Matriks akses

| Tabel                     | Anon (publik) | Warga login                      | Admin              |
| ------------------------- | ------------- | -------------------------------- | ------------------ |
| `profiles`                | —             | baca/ubah baris sendiri          | semua baris        |
| `categories`              | baca          | baca                             | semua operasi      |
| `apbd_items`              | baca          | baca                             | semua operasi      |
| `config`                  | baca          | baca                             | semua operasi      |
| `proposals`               | baca          | insert/update milik sendiri      | semua operasi      |
| `proposal_status_history` | baca          | —                                | insert (lewat RPC) |
| `votes`                   | —             | baca/insert/delete milik sendiri | semua operasi      |
| `comments`                | baca          | insert milik sendiri             | semua operasi      |
| `allocations`             | —             | semua operasi milik sendiri      | baca semua         |
| `v_*` (view)              | baca          | baca                             | baca               |

Catatan:

- `proposal_status_history` tidak punya policy `UPDATE`/`DELETE`, sehingga append-only.
- Warga tidak dapat menghapus komentar; hanya admin yang bisa lewat policy `ALL`.
- Warga tidak dapat membaca baris suara orang lain; agregat suara tersedia lewat
  `v_proposals`.
- Warga tidak dapat membaca alokasi warga lain; agregat tersedia lewat `v_gap`.
- Perubahan status oleh pemilik usulan ditolak trigger meskipun policy `UPDATE` milik
  sendiri mengizinkan update kolom lain.

### 7.2 GRANT dan RLS

RLS menyaring baris; GRANT membuka pintu PostgREST. Migrasi `rls` memberi:

- `USAGE` pada schema `public` untuk `anon` dan `authenticated`.
- `SELECT` pada semua tabel untuk `anon` dan `authenticated` (baris tetap disaring RLS).
- Hak tulis spesifik untuk `authenticated`; policy yang menentukan baris mana yang boleh
  ditulis.
- `USAGE, SELECT` pada sequence untuk `authenticated`.
- `EXECUTE` pada `is_admin()` untuk kedua peran; `EXECUTE` RPC hanya untuk
  `authenticated`.

Service role key melewati RLS dan hanya dipakai `scripts/seed.ts`.

## 8. Validasi berlapis

| Lapisan             | Contoh                                                               |
| ------------------- | -------------------------------------------------------------------- |
| Form (client)       | `proposalInputSchema`, skema auth, batas komentar                    |
| API client          | Payload divalidasi ulang sebelum dikirim; respons diparse dengan Zod |
| Database constraint | `CHECK` panjang teks, status, peran, koordinat, nominal non-negatif  |
| Database relation   | Foreign key kategori dan pengusul; unique vote/alokasi               |
| RLS                 | Kepemilikan baris dan peran admin                                    |
| RPC                 | Total anggaran virtual, duplikat kategori, transisi status + riwayat |
| Seed                | Env dan setiap baris CSV/JSON divalidasi sebelum menulis             |

Alasan validasi ganda: form bisa dilewati (devtools/API langsung), dan respons
PostgREST bisa berubah bentuk (mis. `bigint` sebagai string). Zod di `api.ts` memaksa
bentuk data sesuai kontrak sebelum dipakai React.

Skema shared penting:

- `proposalInputSchema` — input usulan + aturan lat/long berpasangan.
- `proposalSchema` — baris `v_proposals` (dengan nama pengusul dan jumlah suara).
- `allocationPayloadSchema` / `createBudgetAllocationSchema` — payload alokasi dan
  batas total.
- `apbdSeedSchema`, `proposalSeedSchema`, `seedEnvSchema` — validasi seed.
- `webEnvSchema` — validasi env Vite.
- `parseConfigRows` — mengubah key-value `config` menjadi `AppConfig` bertipe.

## 9. Algoritma Gap Warga–APBD

Gap dihitung saat dibaca, bukan disimpan. Implementasi utama ada di view `v_gap`;
frontend hanya mengurutkan dan memberi penjelasan.

Rumus:

```
total_warga      = SUM(allocations.jumlah)
total_apbd       = SUM(apbd_items.nominal_rp)

warga(k)         = SUM(allocations.jumlah) WHERE kategori = k
apbd(k)          = SUM(apbd_items.nominal_rp) WHERE kategori = k

persen_warga(k)  = total_warga > 0 ? round(warga(k) * 100 / total_warga, 2) : 0
persen_apbd(k)   = total_apbd  > 0 ? round(apbd(k)  * 100 / total_apbd,  2) : 0
gap(k)           = persen_warga(k) - persen_apbd(k)
```

View mengembalikan satu baris per kategori (termasuk kategori tanpa data) dan
mengagregasi APBD per kategori terlebih dahulu agar baris ganda tidak menggandakan
persentase.

Di frontend (`packages/shared/src/lib/gap.ts`):

- `gapDirection(item)` → `warga_lebih_tinggi`, `apbd_lebih_tinggi`, atau `seimbang`.
- `sortGapByMagnitude(items)` → urut berdasarkan nilai absolut gap terbesar.
- `describeGap(item)` → teks otomatis dengan template tetap, contoh: “Warga
  mengalokasikan 12,5% untuk Pendidikan, sementara APBD mengalokasikan 20%.
  Prioritas warga lebih rendah daripada APBD, dengan selisih 7,5 poin persen.”

Kasus kosong: bila belum ada alokasi warga, `persen_warga` = 0 untuk semua kategori
dan halaman tetap menampilkan sisi APBD. Bila APBD kosong, `persen_apbd` = 0. Tidak ada
angka yang dikarang.

Batasan saat ini: `v_gap` menjumlahkan seluruh `apbd_items` tanpa filter tahun/kota.
Karena seed hanya memuat satu kota dan satu tahun (DKI Jakarta 2026), ini aman untuk
demo. Bila data multi-tahun ditambahkan, view perlu parameter/filter tahun.

## 10. Autentikasi dan otorisasi

- Registrasi dan login memakai Supabase Auth (email + password). Sesi dipegang
  `supabase-js` di browser; tidak ada password yang disimpan di tabel sendiri.
- Setelah sign up, trigger `handle_new_user()` membuat baris `profiles` dengan peran
  default `warga`.
- `AuthProvider` membaca sesi dan profil lewat TanStack Query, mendengarkan
  `onAuthStateChange`, dan menyediakan `isAdmin`.
- Peran admin diberikan manual lewat SQL Editor/dashboard:
  `update public.profiles set peran = 'admin' where email = '...';`
- Guard route (`RequireAuth`, `RequireAdmin`) hanya untuk UX. Penegakan sebenarnya di
  RLS, trigger, dan RPC.
- Tidak ada verifikasi KTP/NIK di MVP. Konsekuensinya satu orang bisa membuat banyak
  akun; ini risiko integritas agregat yang dicatat, bukan disembunyikan.

## 11. Data seed

- Kota/tahun: DKI Jakarta, APBD murni 2026. Total belanja daerah resmi
  Rp74.285.299.931.740 (Pergub DKI Jakarta No. 44 Tahun 2025).
- Sumber APBD: `supabase/seed/apbd-jakarta-2026.csv`, hasil pemetaan pos APBD resmi.
  8 dari 10 kategori terisi angka terverifikasi; 2 kategori (Keamanan dan Penerangan;
  Teknologi dan Layanan Digital) dimuat nominal 0 dengan status `perlu_lampiran` dan
  ditampilkan sebagai “data menyusul”.
- Usulan contoh: `supabase/seed/proposals-contoh.json` (20 usulan), divalidasi
  `proposalSeedSchema`, dimuat tanpa `pengusul_id` sehingga tampil sebagai “Warga”.
- Alur `bun run seed`:
  1. Validasi env (`seedEnvSchema`).
  2. Parse CSV (mendukung koma dalam tanda kutip) dan validasi setiap baris.
  3. Upsert kategori.
  4. Hapus semua `apbd_items`, lalu insert ulang.
  5. Upsert `config` dari env (`KOTA`, `TAHUN_ANGGARAN`,
     `VIRTUAL_BUDGET_PER_WARGA`).
  6. Hapus hanya usulan dengan `pengusul_id IS NULL`, lalu insert usulan contoh.
- Seed memakai service role key dan tidak boleh dijalankan dari browser.

## 12. Konfigurasi

| Variabel                    | Berkas     | Keterangan                           |
| --------------------------- | ---------- | ------------------------------------ |
| `SUPABASE_URL`              | `.env`     | URL proyek untuk seed                |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env`     | Kunci service role, hanya untuk seed |
| `KOTA`                      | `.env`     | Default `DKI Jakarta`                |
| `TAHUN_ANGGARAN`            | `.env`     | Default `2026`                       |
| `VIRTUAL_BUDGET_PER_WARGA`  | `.env`     | Default `10000000`                   |
| `VITE_SUPABASE_URL`         | `web/.env` | URL proyek untuk browser             |
| `VITE_SUPABASE_ANON_KEY`    | `web/.env` | Kunci publik untuk browser           |

Nilai kota, tahun, dan anggaran virtual juga tersimpan di tabel `config` agar halaman
publik membaca sumber yang sama dengan data. Seed menimpa nilai `config` dari env.

## 13. Toolchain dan perintah

Dijalankan dari root:

| Perintah               | Fungsi                                      |
| ---------------------- | ------------------------------------------- |
| `bun install`          | Instal dependensi workspace                 |
| `bun run dev`          | Vite dev server (port 5173)                 |
| `bun run build`        | Build produksi ke `web/dist`                |
| `bun run preview`      | Pratinjau build                             |
| `bun run seed`         | Muat APBD + usulan contoh                   |
| `bun run lint`         | Oxlint                                      |
| `bun run format`       | Oxfmt (tulis ulang)                         |
| `bun run format:check` | Oxfmt (cek)                                 |
| `bun run typecheck`    | `tsc --noEmit` untuk shared, web, dan skrip |
| `bun test`             | Test Bun (skema dan logika gap)             |
| `bun run check`        | format:check + lint + typecheck + test      |

Urutan sebelum commit: `bun run format`, lalu `bun run check`.

Test yang ada:

- `proposal.test.ts` — batas judul/deskripsi, lat/long berpasangan, estimasi biaya.
- `allocation.test.ts` — duplikat kategori, batas anggaran, pembagian merata.
- `gap.test.ts` — arah gap, sorting absolut, teks penjelasan.
- `config.test.ts` — parsing key-value config dan fallback.

## 14. Deployment

Yang di-deploy hanya dua hal:

1. **Frontend statis** — hasil `bun run build` di `web/dist` ke hosting statis
   (Vercel, Netlify, Cloudflare Pages, GitHub Pages, atau server statis).
2. **Proyek Supabase** — database, Auth, dan PostgREST sudah disediakan Supabase.

Catatan deployment:

- Env `VITE_*` dibaca saat **build**, bukan runtime. Set di CI/hosting sebelum build.
- SPA memakai React Router; konfigurasikan rewrite semua path ke `index.html` agar
  refresh di `/usulan/123` tidak 404.
- Jangan pernah menaruh service role key di environment hosting frontend.
- Migrasi dijalankan sekali per proyek Supabase (SQL Editor atau `supabase db push`).
- Cadangan database mengikuti fitur backup Supabase; ekspor CSV tabel `apbd_items` dan
  `proposals` bisa diunduh dari dashboard bila perlu.

## 15. Status, risiko, dan langkah berikutnya

### Sudah selesai

- Workspace Bun dengan `web`, `packages/shared`, `scripts`, dan `supabase`.
- Skema database + constraint + index + trigger.
- RLS, GRANT, dan guard peran/status.
- Read model `v_proposals`, `v_comments`, `v_proposal_status_history`, `v_gap`.
- RPC `save_allocations` dan `change_proposal_status`.
- Kontrak Zod shared, tipe `Database`, dan helper gap.
- Frontend feature-based: seluruh halaman, form, tabel admin, peta, grafik, auth.
- Seed tervalidasi Zod untuk APBD + 20 usulan.
- Test unit untuk skema dan logika gap. Hasil unit test tidak membuktikan RLS aman.

### Belum / menunggu

- Migration Tahap 1 belum dipasang permanen pada remote. Pengujian SQL memakai
  database Supabase lokal terisolasi; lihat prosedur pengujian di README.
- 2 kategori APBD masih kosong; lengkapi dari Lampiran Pergub 44/2025 atau tampilkan
  “data menyusul” secara jujur.
- Halaman kelola APBD untuk admin belum ada; pengelolaan masih lewat SQL/dashboard.
- Belum ada UI edit/hapus usulan milik sendiri (RLS sudah mengizinkan update).
- Belum ada pagination; daftar usulan saat ini memuat semua baris (cukup untuk 20
  usulan demo, perlu diperbaiki bila data bertambah).
- Belum ada realtime; perubahan dari pengguna lain terlihat setelah refetch/refresh.
- Belum ada verifikasi KTP/NIK; akun ganda tetap mungkin.

### Langkah berikutnya

1. Verifikasi lima migration berurutan pada database pengujian sebelum penerapan remote.
2. Isi `.env` dan `web/.env`, lalu `bun run seed`.
3. Daftar akun, jadikan admin lewat SQL, uji loop demo 2–3 menit tanpa error.
4. Lengkapi dua kategori APBD yang kosong bila sumber resmi tersedia.
5. Polish kecil: pagination daftar, pengelolaan APBD di UI, dan uji ke pengguna.

## 16. Aturan keamanan Tahap 1

Bagian ini memperbarui matriks akses awal di atas setelah migration
`20261026195414_foundation_security.sql` dijalankan. Moderasi `Menunggu`, `Disetujui`,
dan `Ditolak` terpisah dari lima tahap kemajuan. Data lama mendapat `Menunggu` tanpa
penghapusan atau persetujuan otomatis.

- Publik hanya membaca usulan `Disetujui`. Pemilik membaca seluruh usulan sendiri;
  admin membaca seluruh usulan. Tabel dan view memakai batas visibilitas yang sama,
  termasuk komentar dan riwayat status.
- Warga membuat usulan dengan status `Diajukan` dan moderasi `Menunggu`. Edit hanya
  diizinkan untuk isi usulan sendiri saat `Menunggu`; identitas, pemilik, waktu
  pembuatan, status, dan metadata moderasi dilindungi trigger.
- RPC `moderate_proposal` hanya untuk admin. Penolakan wajib beralasan, sementara
  identitas dan waktu pemeriksa ditentukan sistem. Persetujuan moderasi tidak
  otomatis mengubah tahap kemajuan.
- Profil dibuat oleh trigger Auth dengan role `warga`; role dari user metadata
  diabaikan. Akun lama tanpa profil mendapat backfill tanpa menimpa profil yang ada.
  API hanya dapat mengubah nama profil sendiri, termasuk ketika akun berperan admin.
  Pemberian role admin tetap melalui pengelola SQL.
- API tidak memiliki hak tulis langsung pada `allocations`. RPC publik mengunci
  profil pengguna lalu memanggil validator lama dalam schema `private`. Penguncian
  juga berlaku ketika pengguna belum memiliki baris alokasi.
- Hak bawaan tabel/view dicabut dan diberikan kembali secara terbatas. Fungsi
  trigger dan validator internal tidak dapat dipanggil role API. Schema `private`
  tidak boleh dimasukkan ke exposed schemas Data API.
- Definisi perhitungan `v_gap` dan metodologi APBD tidak berubah pada tahap ini.

Tes SQL menggunakan role PostgreSQL `anon` dan `authenticated` dengan claims warga
A, warga B, dan admin. Ini menguji RLS, constraint, trigger, view, dan RPC pada
PostgreSQL asli. Layanan login HTTP dan PostgREST tidak dijalankan dalam mode tes
ringan, sehingga cakupan tersebut tidak dinyatakan lulus oleh tes SQL ini.
