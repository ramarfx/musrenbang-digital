# Kontrak simulator urutan prioritas

Migration `20261102141207_priority_rankings.sql` menambah tabel `priority_rankings` (user_id, kategori, posisi). Setiap pengguna memiliki satu ranking aktif. Kategori dan posisi unik per pengguna. Akses tabel langsung hanya SELECT atas baris sendiri; penulisan melalui RPC. Profil dikunci saat penyimpanan sehingga penggantian atomik.

Frontend perlu mengganti pemanggilan `save_allocations` pada simulator urutan prioritas dengan `save_priority_rankings({ p_rows: [{ kategori, posisi }, ...] })`, dengan sepuluh kategori dan posisi 1 sampai 10 masing-masing sekali. Ambil ranking sendiri dengan `get_priority_rankings()` yang terurut menurut posisi. Validasi client tersedia melalui `priorityRankingPayloadSchema`; database memvalidasi kategori. UI belum diubah: simulator lama masih menulis allocations sampai pemanggilan diganti.

`get_priority_ranking_summary()` hanya untuk admin dan mengembalikan nol baris jika kurang dari dua partisipan. Skor Borda adalah jumlah (11 - posisi), dengan posisi pertama bernilai 10 dan terakhir 1. Agregat tidak tersedia untuk publik. Selisih antara snapshot populasi kecil dapat membocorkan pilihan kepada admin; kebijakan privasi perlu keputusan produk sebelum akses diperluas.

Simulator anggaran tetap memakai `save_allocations` dan batas terkonfigurasi (default Rp10.000.000). Data allocations lama tidak direklasifikasi karena asal simulatornya tidak dapat dibuktikan. Rumus Gap dan data APBD tidak diubah. Migration ini baru lokal; remote runner tetap memeriksa sembilan migration yang diketahui dan harus diperbarui setelah rollout disetujui.
