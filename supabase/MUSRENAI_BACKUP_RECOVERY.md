# Prosedur backup dan recovery Musrenbang

Status: BELUM TERVERIFIKASI. Dokumen ini menyiapkan prosedur, bukan bukti bahwa
backup dapat dipulihkan. Jangan menerapkan migration production sampai pemilik
database menyetujui cakupan, menjalankan uji restore terisolasi dan memeriksa
buktinya.

## Kondisi yang sudah diperiksa

Project target adalah `dogyibbzwfslspflsidm`. Backup manual yang ada dalam
folder lokal khusus di luar repository berisi dump schema dan data
`public,private`. Kedua file dapat dibaca, tetapi belum memuat data Auth
secara lengkap, objek Storage, konfigurasi managed, dan belum diuji restore.
Pada pemeriksaan read-only 3 November 2026 terdapat 7 akun Auth, 7 profil, serta 0 bucket dan 0 objek Storage. Angka dapat berubah dan harus diperiksa lagi sebelum backup. Terdapat akun Auth dan profil yang saling
berelasi, sehingga dump tersebut tidak cukup sebagai bukti recovery lengkap.

Supabase menjelaskan bahwa proyek Free tidak memiliki backup harian otomatis.
Dokumentasi Supabase juga menyatakan bahwa data `auth` termasuk akun dan
password hash dapat dimigrasikan melalui ekspor SQL, tetapi tidak ada skrip
satu ukuran untuk semua proyek. Backup database tidak mencakup isi objek
Storage. Sumber:

- https://supabase.com/kb/faqs/platform/free-plan-backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/kb/troubleshooting/migrating-auth-users-between-projects
- https://supabase.com/docs/guides/platform/backups

## Cakupan dan pengamanan sebelum ekspor

1. Pemilik database menentukan recovery point, periode quiet window atau
   snapshot konsisten, dan cakupan: schema, data aplikasi, akun Auth, custom
   role/grants, migration history, konfigurasi Auth, dan objek Storage.
   Dump yang dibuat pada waktu berbeda tidak otomatis konsisten.
2. Data Auth dapat mencakup hash password, identitas dan token sesi. Gunakan
   penyimpanan terenkripsi di luar repository, akses minimum, retensi dan
   penghapusan sesuai kebijakan tim. Jangan tampilkan isi dump dalam terminal,
   log, CI, PR atau chat. Jangan memasukkan password/connection string pada
   riwayat perintah, argumen proses, atau repository.
3. Simpan manifest tanpa isi data pribadi: target/ref, waktu awal/akhir,
   cakupan tiap file, versi CLI/PostgreSQL, ukuran, SHA-256 dan hasil keluar
   tiap proses. Verifikasi bahwa backup mencakup tabel yang dibutuhkan; jangan
   menyimpulkan cakupan Auth hanya karena file dump berhasil dibuat.
4. Bila Storage berisi objek, siapkan pencadangan objek dan metadata secara
   terpisah serta verifikasi akses pemulihannya. Catat konfigurasi Auth,
   providers, redirects dan secrets sebagai prosedur penyediaan ulang melalui
   mekanisme aman, tanpa menyalin nilai secret ke manifest.
5. Ikuti panduan resmi backup CLI untuk ekspor role, schema dan data, termasuk
   data Auth yang diperlukan dan perubahan trigger pada schema managed. Pastikan
   target source eksplisit dan cocok sebelum setiap perintah. Periksa dokumentasi
   versi CLI yang dipakai dan semua exclusion. Jika CLI tidak memiliki izin,
   hentikan; jangan menurunkan keamanan atau mengekspor ulang secara sembarang.

## Uji restore yang wajib

1. Siapkan target restore terisolasi yang benar-benar terpisah dari production,
   dengan versi PostgreSQL/Supabase yang kompatibel, jaringan dan penyimpanan
   terlindungi, serta izin yang mencukupi. Jangan membuat project cloud atau
   mengaktifkan biaya tanpa persetujuan. Jangan restore ke production untuk tes.
2. Terapkan prosedur restore resmi sesuai dependensi role, schema, data dan
   trigger. Gunakan penghentian pada error dan catat status tiap langkah.
   Hindari mengaktifkan integrasi, provider atau pengiriman email nyata.
3. Bandingkan jumlah dan fingerprint aman untuk data aplikasi serta jumlah dan
   relasi Auth/profil tanpa mengekspos identitas. Verifikasi primary/foreign key,
   RLS, grants, fungsi dan trigger; uji login hanya pada identitas sintetis yang
   khusus disiapkan untuk lingkungan restore. Jangan menguji password warga.
4. Periksa kecocokan migration history dan kebutuhan penyediaan ulang secret,
   Auth settings dan Storage. Jangan mengubah migration history production.
   Validasi restore parsial tidak boleh disebut restore penuh.
5. Dokumentasikan bukti restore, ketidaksesuaian dan recovery point. Bersihkan
   salinan sementara secara aman hanya sesuai kebijakan data yang disetujui.
   Bila ada langkah yang gagal atau cakupan tidak dapat dibuktikan, gate backup
   tetap gagal dan migration production tidak dijalankan.

## Latihan sintetis lokal

Jalankan `pwsh scripts/test-synthetic-auth-restore.ps1` hanya pada stack lokal
`supabase_db_foundation-local`. Runner membuat dua database fixture bernama
unik, memasang sepuluh migration awal pada sumber sintetis, membentuk satu akun,
profil dan usulan sintetis, lalu mengekspor dan memulihkan schema/data terpilih.
Pengujian memeriksa jumlah akun, profil dan usulan, kemudian membersihkan kedua
database fixture. Latihan ini lulus pada PostgreSQL lokal 17.

Latihan menggunakan role superuser lokal untuk restore dan menonaktifkan trigger
pada target fixture; hal ini tidak mengubah production dan tidak boleh ditiru
secara sembarang pada schema managed. Restore tanpa ownership dan grants ini
belum memverifikasi RLS/grants, login Auth, Storage, konfigurasi, secret, backup
production aktual maupun kemampuan restore project Free. Salinan schema Auth
lokal yang digunakan hanya untuk fixture PostgreSQL, bukan instruksi menimpa
schema managed Supabase. Kegagalan latihan awal restore semua schema platform
menunjukkan adanya objek Realtime yang memerlukan izin khusus; gunakan prosedur
Supabase yang sesuai untuk target sesungguhnya.

## Jika terjadi insiden setelah deployment

Hentikan perubahan, pertahankan bukti dan batasi akses hanya melalui prosedur
yang disetujui. Jangan otomatis menjalankan reset, menghapus history migration,
atau memulihkan dump ke production. Tentukan dampak, RPO/RTO dan prosedur
pemulihan bersama pemilik database; restore adalah operasi berisiko dan perlu
persetujuan tersendiri. Nonaktifkan fitur AI melalui flag yang disetujui bila
aman, tanpa menganggap ini sebagai rollback database.
