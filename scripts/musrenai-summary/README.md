# MusrenAI Admin: Ringkasan Aspirasi

Migration `20261103104403_musrenai_admin_aspiration_summary.sql` hanya untuk pengujian lokal; migration 11 sampai 14 belum diotorisasi untuk production. Runner remote tetap mengharapkan sepuluh migration production.

## Kontrak RPC

- `get_aspiration_statistics(p_from, p_to, p_moderation, p_category)` mengembalikan total, distribusi kategori dan moderasi, status analisis (`analyzed`, `not_analyzed`, `failed`, `stale`), dan jumlah usulan dengan indikasi. Default periode 30 hari dan moderasi `Menunggu`; pilihan lain `Disetujui` dan `Semua`. Rentang adalah `[p_from, p_to)` dan maksimal 366 hari; kategori harus valid.
- `request_aspiration_summary(p_from, p_to, p_moderation, p_category)` mengembalikan `summary_id`, `state`, dan `coverage`. Filter dan sumber yang identik memakai cache.
- `retry_aspiration_summary(p_summary_id)` mengantrekan ulang snapshot gagal jika sumbernya masih sama. Setiap percobaan provider tetap memerlukan reservasi kuota.
- `get_aspiration_summary(p_summary_id)` mengembalikan status, `stale`, cakupan, statistik snapshot, sumber, dan narasi. Narasi tidak dikembalikan ketika snapshot stale. Dashboard harus memanggil RPC statistik terpisah jika membutuhkan angka terkini.

Semua RPC membutuhkan JWT admin. Snapshot memakai maksimal 100 referensi pertama berdasarkan ID, dan cakupan `sample` bila total lebih besar. `statistics` dihitung dari seluruh data yang sesuai filter. Tema narasi harus merujuk ID dari snapshot; angka dalam teks narasi ditolak agar statistik ditampilkan dari SQL. Sumber yang disiapkan worker hanya ID dan kategori, tanpa nama, kontak, lokasi, judul, atau deskripsi.

`scripts/musrenai-summary/local-worker.ts` hanya mengizinkan database pengujian lokal `musrenai_admin_test_*`. Worker menjalankan provider mock dalam proses dan menggunakan reservasi provider bersama per panggilan mock. Untuk menjalankannya, siapkan database fixture terisolasi dan atur `MUSRENAI_LOCAL_DATABASE_URL` melalui lingkungan lokal yang aman. Jangan memasukkan kredensial atau isi usulan ke log atau repository.

Provider gagal atau timeout membuat status `failed`; statistik SQL tetap tersedia. Worker dan scheduler production belum ada. Sebelum aktivasi diperlukan desain identitas dan penjadwalan, batas retensi snapshot, review privasi dan izin pemrosesan data, serta evaluasi keselamatan provider sungguhan. Jangan menghubungkan Gemini atau data warga ke runner ini.
