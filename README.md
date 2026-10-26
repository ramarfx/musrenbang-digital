# Musrenbang Digital (scaffold Supabase)

Scaffold awal aplikasi Musrenbang Digital, WIA MIA 2026. Arsitektur lengkap ada di
`../files/ARSITEKTUR.md`. Backend memakai Supabase saja: Postgres + Auth + PostgREST.
Bun dipakai sebagai toolchain (package manager, script runner, test runner).

## Prasyarat

1. Buat proyek Supabase baru (gratis) di dashboard Supabase.
2. Di Dashboard > SQL Editor, tempel seluruh isi `db/migrations/001_init.sql`, lalu Run.
3. Salin `.env.example` menjadi `.env`, isi `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   dan `SUPABASE_SERVICE_ROLE_KEY` dari Dashboard > Project Settings > API.

## Perintah

```sh
bun install       # instal dependensi
bun run seed      # muat seed APBD DKI Jakarta 2026 ke Supabase (butuh service role key)
bun run lint      # oxlint
bun run format    # oxfmt (tulis ulang)
bun run format:check
bun run typecheck # tsc --noEmit
bun test          # test runner bawaan Bun
```

Urutan sebelum commit: format, lint, typecheck, lalu test bila ada yang menyentuh
kode yang diubah.

## Frontend (folder web/)

Aplikasi React + Vite + Tailwind, dengan Leaflet untuk peta dan Recharts untuk
grafik gap. Halaman: Beranda (peta + daftar usulan), Bandingkan (grafik dan tabel
gap), APBD, Simulator Anggaran, Buat Usulan (dengan pilih titik di peta), Detail
Usulan (voting + komentar), Login/Daftar, dan Admin (ubah status usulan).

```sh
cd web
cp .env.example .env   # isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
bun install
bun run dev            # server dev di port 5173
bun run build          # build produksi
```

Perintah lint, format, dan typecheck di folder web sama seperti di atas.

## Status scaffold

Sudah siap: migrasi Postgres (tabel, RLS, view `v_gap`), skrip seed APBD dari CSV
plus 20 usulan contoh, dan client Supabase di `src/lib/supabase.ts`. Seed belum
bisa dijalankan sampai proyek Supabase dibuat dan `.env` diisi. Frontend di atas
juga baru bisa menampilkan data asli setelah proyek Supabase ada dan seed jalan.

## Struktur

```
src/
  lib/supabase.ts   # client Supabase (kunci publik)
  seed.ts           # loader seed dari CSV/JSON (service role key)
db/
  migrations/001_init.sql       # tabel + RLS + view v_gap
  seeds/apbd-jakarta-2026.csv   # seed APBD DKI Jakarta 2026
  seeds/proposals-contoh.json   # 20 usulan contoh
web/                # aplikasi frontend (React + Vite)
```
