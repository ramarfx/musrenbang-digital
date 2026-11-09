# MusrenAI: kesiapan aktivasi backend

Status: kode kandidat, belum ada persetujuan deployment atau aktivasi. Production `dogyibbzwfslspflsidm` terakhir terverifikasi memiliki migration 1 sampai 10 dan tidak memiliki Edge Function. Runner remote tetap mengharapkan tepat 10 migration. Jangan menjalankan seed, reset, atau tes tulis remote tanpa persetujuan terpisah.

## Yang masih nonaktif

- MusrenAI Warga memerlukan FAQ disetujui, `MUSRENAI_AI_ENABLED=true` (nama lama `MUSRENAI_GEMINI_ENABLED`), secret backend, origin dan deployment Edge Function yang disetujui. Default flag tidak aktif. Tanpa konfigurasi lengkap, handler gagal tertutup.
- Auto-flagging dan ringkasan memiliki antrean dan adapter mock. Runtime `scripts/musrenai-runtime/worker.ts` default mati; belum di-deploy dan tidak membuat cron secara otomatis. Runtime secara eksplisit menolak project production saat ini. Penghapusan blok tersebut memerlukan review dan persetujuan tersendiri.
- Adapter konten Gemini admin selalu menolak penggunaan. Tidak ada flag lingkungan yang dapat membuka gerbang ini; review kebijakan privasi, dasar pemrosesan, minimisasi, redaksi, dan keselamatan harus disetujui sebelum pekerjaan adapter nyata.
- Mock hanya untuk pengujian dan harus dilabeli `mock`. Ringkasan mock hanya mengelompokkan kategori dan bukan analisis semantik. Referensi ID yang valid tidak membuktikan isi narasi benar.

## Urutan migration setelah review dan persetujuan terpisah

1. `20261103031212_musrenai_rate_limit` (11): kuota pesan warga.
2. `20261103100955_musrenai_admin_autoflag` (12): antrean dan hasil auto-flag privat.
3. `20261103102540_musrenai_shared_provider_quota` (13): kuota bersama untuk setiap percobaan provider.
4. `20261103104403_musrenai_admin_aspiration_summary` (14): statistik dan snapshot ringkasan.
5. `20261103112104_musrenai_worker_runtime` (15): role worker NOLOGIN dan fungsi retensi. Ini adalah migration baru dari Tahap 3 dan harus ikut dry-run dan persetujuan eksplisit; tidak dijalankan pada tahap ini.

Sebelum menyetujui rollout, periksa target dan environment, history 10 migration, checksum semua file, dampak pada data dan role global, pengaturan GitHub Integration, backup yang dapat dibaca, serta risiko restore. Pastikan role `musrenai_worker_runtime` belum ada dan hak pembuat role tersedia. Review setiap perubahan DDL, security definer, fungsi retensi, grants, urutan, dan risiko lock. Jangan menganggap backup public schema mencakup seluruh Auth/Storage yang dikelola Supabase.

Periksa versi `bunx --bun supabase --version` dan bantuan `bunx --bun supabase db push --help`. Untuk CLI yang mendukung opsi berikut, setelah target diverifikasi gunakan hanya dry-run:

```sh
bunx --bun supabase db push --remote=dogyibbzwfslspflsidm --dry-run --skip-vault
```

Dry-run harus menampilkan tepat migration 11-15 berurutan, tanpa seed atau migration tambahan. Jika versi CLI berbeda, target tidak cocok, atau history berubah, hentikan dan sesuaikan prosedur sebelum meminta persetujuan. Perintah push tanpa `--dry-run` merupakan deployment dan memerlukan persetujuan eksplisit setelah hasil review; tidak dijalankan otomatis oleh dokumen ini.

Setelah deployment disetujui, periksa history, role NOLOGIN, grants, RLS, trigger, RPC admin, helper privat, quota, Security Advisor dan smoke test read-only. Jangan membuat akun/fixture atau memproses data warga untuk tes tanpa izin terpisah. Periksa setiap tahap secara berurutan dan hentikan saat terjadi kegagalan. Tidak semua migration atau efek operasional dijamin atomik lintas file.

Rollback kode dan penghentian worker/fitur melalui flag tidak membalikkan DDL yang sudah terpasang. Jangan menjalankan `db reset`, menghapus tabel atau memanipulasi history. Jika rollout gagal, pertahankan fitur nonaktif, catat schema/history, lalu susun migration perbaikan atau rencana restore yang spesifik dan disetujui. Pemulihan dari backup berpotensi kehilangan data baru dan tidak boleh dilakukan otomatis.

## Operasional worker mock non-production

Tidak ada akun login yang dibuat oleh migration 15. Siapkan identitas database terpisah yang hanya dapat `SET ROLE musrenai_worker_runtime`, tanpa hak tabel atau role administratif. Provisioning login dan secret memerlukan persetujuan lingkungan target. Koneksi menggunakan host langsung `db.<project-ref>.supabase.co` port 5432, TLS dengan validasi sertifikat, dan user khusus `musrenai_worker_login`. Meskipun tidak memiliki akses tabel langsung, role ini dapat menerima isi usulan melalui fungsi claim, sehingga kredensialnya tetap sensitif dan harus disimpan sebagai secret backend. Runtime memverifikasi peran dan menolak konfigurasi yang tidak aman; kompatibilitas jaringan IPv6, CA, role dan pooler belum dibuktikan pada Supabase remote.

Variabel opsional: `MUSRENAI_WORKER_ENABLED` default off; `MUSRENAI_WORKER_MODE=mock` adalah satu-satunya mode yang ada; `MUSRENAI_WORKER_PROJECT_REF` dan `MUSRENAI_WORKER_DATABASE_URL` wajib bila aktif. `MUSRENAI_WORKER_INTERVAL_SECONDS` default 60, rentang 30-3600. `MUSRENAI_WORKER_LOG_LEVEL=off|basic` default off dan hanya mencatat pesan statis tanpa konten, token atau ID. Scheduler menjalankan satu siklus berurutan dan berhenti saat konfigurasi atau layanan gagal.

Retensi default off. `MUSRENAI_RETENTION_ENABLED=true` memerlukan `MUSRENAI_RETENTION_DAYS` antara 30 dan 3650; fungsi hanya menghapus cache ringkasan selesai/gagal berdasarkan `created_at` yang melewati cutoff, maksimal 100 per siklus, tidak menghapus usulan warga. Mengaktifkan retensi memerlukan keputusan kebijakan dan persetujuan data terpisah.

Kuota pesan warga pada migration 11 tetap terpisah dari kuota provider bersama pada migration 13. Pengelola database dapat mengatur `private.musrenai_provider_settings.daily_limit` melalui jalur tepercaya setelah persetujuan; nilai awal 300 per hari WIB adalah batas aplikasi, bukan jaminan free tier atau biaya. Setiap percobaan jaringan dan retry harus memperoleh reservasi baru. Retry Warga maksimal dua percobaan total untuk gangguan sementara; 429 tidak diulang otomatis. Gunakan satu API key aktif dalam secret backend. Rotasi key dilakukan jika terpapar atau untuk keamanan, bukan untuk menghindari kuota per project.

## Handoff frontend

MusrenAI Warga: `POST /functions/v1/musrenai-chat` memerlukan JWT pengguna. Tangani 401 untuk sesi, 429 `RATE_LIMITED` atau `PROVIDER_LIMITED`, 503 `AI_UNAVAILABLE`/`AUTH_UNAVAILABLE`, dan 504 `AI_TIMEOUT`. Edge Function yang belum di-deploy juga dapat menghasilkan respons platform non-JSON atau 404; tampilkan layanan belum tersedia tanpa mengasumsikan format error selalu sama.

Admin: `get_proposal_ai_review` dan RPC statistik/snapshot/retry ringkasan hanya untuk admin. Kode frontend harus menangani RPC belum tersedia saat migration pending, serta status `not_analyzed`, `pending`, `processing`, `failed`, dan `stale`. Jangan menjadikan flag sebagai keputusan moderasi. Statistik SQL tetap dapat ditampilkan saat narasi gagal. Tampilkan `coverage`, `sampling_method`, sumber dan keterbatasan; narasi stale tidak boleh ditampilkan sebagai hasil terbaru. Kontrak lengkap ada di `scripts/musrenai-summary/README.md`.

Tidak ada pengujian Gemini nyata, billing, deployment Edge Function atau worker, penjadwalan production, atau pengiriman konten warga dalam tahap kesiapan ini. Pengujian provider nyata jika nanti disetujui harus menggunakan environment terisolasi, data sintetis, satu key, batas kuota dan biaya yang disetujui, serta bukti cleanup.
