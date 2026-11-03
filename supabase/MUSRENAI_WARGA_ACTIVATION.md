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
- Migration 16 lokal memperbarui reservasi bersama dengan penguncian atomik,
  maksimum 10 percobaan dalam rolling 60 detik, 300 dalam rolling 24 jam dan
  300 dalam hari Pacific. Nilai konfigurasi lebih rendah tetap dihormati,
  sedangkan nilai lebih tinggi tidak menaikkan batas 300. Retry ikut dihitung.
  Migration ini belum diizinkan atau diterapkan ke production.
- Dua koneksi lokal dengan 20 percobaan menghasilkan tepat 10 reservasi.
  Assertion SQL juga memeriksa batas dan perubahan DST Pacific. Pengujian
  tambahan dan verifikasi staging tetap diperlukan.
- Input memiliki batas ukuran, tetapi tidak ada pengukuran token provider yang
  presisi; 250.000 input TPM belum dijamin oleh limiter aplikasi. Google
  menerapkan kuota per project dan penggunaan layanan lain di luar aplikasi
  tidak dapat dikendalikan oleh limiter MusrenAI.

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
