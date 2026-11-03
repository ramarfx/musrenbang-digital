# Persiapan aktivasi MusrenAI Warga

Status: belum siap diaktifkan. FAQ masih draft, privasi dan biaya belum disetujui,
dan staging remote terisolasi belum diverifikasi. Jangan masukkan kredensial ke
repository atau log.

## Kontrak frontend

Halaman `/musrenai` dan menu hanya aktif saat build frontend memakai
`VITE_MUSRENAI_ENABLED=true`. Nilai ini adalah sakelar publik pada waktu build,
bukan secret atau mekanisme otorisasi. Tanpa nilai tersebut halaman menyatakan
layanan belum tersedia. Penggunaan memerlukan sesi Supabase Auth. Percakapan
disimpan di memori browser dan dibuang ketika akun berganti atau halaman dilepas.
Pesan dan sampai enam item riwayat dikirim ke Edge Function. Jangan sertakan
data pribadi; filter teknis bukan jaminan penghapusan seluruh data pribadi.

## Preflight sebelum meminta rollout

- Verifikasi target dan migration history read-only, checksum file, dampak dan
  dry-run. History yang dibaca 3 November 2026 berisi 10 migration. Dry-run
  merencanakan 11 sampai 15, tanpa seed atau Vault.
- Migration 12 memasang trigger enqueue pada usulan baru dan perubahan konten.
  Trigger ini mulai membuat pekerjaan dan data review meskipun worker tidak
  dijalankan. Jadi rollout semua migration bukan tindakan netral untuk AI Admin.
  Setujui dampak ini secara eksplisit; jangan mengasumsikan migration admin
  inert. Migration 15 membuat role NOLOGIN dan fungsi retensi, tanpa cron.
- Siapkan backup terbaru yang dapat dibaca dan uji pemulihan pada lingkungan
  terpisah. Dump standar tidak mencakup seluruh schema managed Auth/Storage.
  Belum ada bukti backup terkini atau uji restore pada tahap ini.
- Setujui FAQ, kebijakan privasi dan pengiriman input ke provider, model,
  kuota dan batas biaya. Verifikasi Free tier dan syarat pemrosesan data pada
  akun Google sebenarnya. Free tier dapat menggunakan konten untuk meningkatkan
  produk Google; jangan mengirim data warga tanpa persetujuan yang sesuai.
- Selesaikan browser/JWT/CORS dan koneksi worker pada staging terpisah sesuai
  kebutuhan. Worker Admin bukan syarat untuk menjalankan chat warga.

## Keputusan model dan batas yang masih perlu diterapkan

- Kandidat utama: `gemini-3.5-flash-lite` pada Free tier. Tim telah
  memverifikasi batas proyek Google: 15 RPM, 250.000 input TPM dan 500 RPD.
  Simpan satu key sebagai secret backend `GEMINI_API_KEY`; tetapkan
  `GEMINI_MODEL` saat aktivasi yang disetujui.
- Target aplikasi: maksimum 10 percobaan provider dalam 60 detik dan 300 per
  hari secara global, termasuk retry Warga dan Admin. Pembatas pesan warga
  terpisah dari pembatas percobaan provider.
- Implementasi saat ini belum memenuhi target tersebut. Reservasi bersama
  memakai penguncian database dan mencatat setiap retry, tetapi hanya membatasi
  jumlah harian berdasarkan nilai default 300 yang masih dapat diubah di atas 300. Belum ada pemeriksaan global per 60 detik atau penghitung input TPM.
- Hari pada limiter aplikasi dimulai pukul 00.00 WIB, sedangkan kuota RPD
  Google direset pukul 00.00 waktu Pacific. Karena batas hari berbeda, 300 per
  hari WIB tidak menjamin konsumsi di bawah 500 dalam hari provider. Layanan
  atau key lain dalam proyek Google yang sama juga berbagi kuota provider.
- Sebelum aktivasi, dibutuhkan pembatas bersama yang atomik lintas instance,
  mencakup semua pemanggil dan retry, dengan batas per menit dan per hari yang
  sesuai. Sediakan uji concurrency, batas waktu dan pergantian hari. Perubahan
  yang memerlukan migration atau konfigurasi remote belum diizinkan dan belum
  dilakukan. Jangan gunakan limiter memori per instance sebagai jaminan global.

## Urutan yang memerlukan persetujuan terpisah

1. Tentukan cakupan migration yang benar dan setujui dampak trigger Admin.
   Hentikan jika history, backup, dry-run atau target berbeda.
2. Terapkan migration yang disetujui, lalu verifikasi history, grants dan RPC.
3. Deploy `musrenai-chat` dengan verifikasi JWT platform tetap aktif. Tetapkan
   `MUSRENAI_ALLOWED_ORIGIN=https://musrenbang-digital.pages.dev`. Jangan
   memakai `--no-verify-jwt`.
4. Melalui mekanisme secret Supabase, atur `GEMINI_API_KEY`, `GEMINI_MODEL`
   dan konfigurasi yang diperlukan. Jangan menempelkan key di chat atau commit.
   Pastikan pengaturan bawaan Supabase URL, anon key dan service role tersedia
   hanya di runtime backend.
5. Setelah persetujuan FAQ, privasi dan biaya, atur
   `MUSRENAI_FAQ_APPROVED=true` dan `MUSRENAI_GEMINI_ENABLED=true`.
   Selesaikan blocker pembatas global yang dicatat di atas; batas 300 per hari adalah
   batas demo, bukan jaminan batas tagihan provider.
6. Jalankan smoke test dengan identitas dan pesan sintetis, termasuk JWT valid,
   invalid, origin terlarang, kuota dan kesalahan provider. Jangan menampilkan
   token atau key dalam log.
7. Hanya setelah hasil aman, aktifkan `VITE_MUSRENAI_ENABLED=true` pada build
   website yang disetujui dan uji login, percakapan, logout dan pergantian akun.

Jika terjadi masalah, sembunyikan frontend dengan build flag dan nonaktifkan
flag provider/FAQ melalui pengaturan yang disetujui. Ini tidak membatalkan
migration, tidak menghapus antrean, dan tidak memulihkan database. Pemulihan
database memerlukan rencana spesifik, backup terverifikasi dan persetujuan.
Worker, scheduler, Gemini Admin dan retensi tetap tidak diaktifkan.
