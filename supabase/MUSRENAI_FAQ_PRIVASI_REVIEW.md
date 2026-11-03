# MusrenAI Warga: FAQ dan privasi untuk review

Status: DRAFT. Dokumen ini belum menyetujui publikasi atau pengiriman data ke
Gemini. Jawaban yang dihasilkan AI perlu diverifikasi dan tidak menjadi
informasi pemerintah yang resmi.

## Usulan FAQ

1. **Apa itu Musrenbang?** Musrenbang adalah musyawarah perencanaan pembangunan.
   Periksa informasi resmi pemerintah daerah untuk jadwal dan prosedur setempat.
2. **Bagaimana menggunakan website?** Jelajahi usulan warga, simulator,
   perbandingan dan metodologi melalui menu. Rute: `/usulan`, `/simulator`,
   `/bandingkan`, `/metodologi`.
3. **Bagaimana mendaftar atau masuk?** Buka halaman masuk, pilih pendaftaran atau
   masuk dan ikuti petunjuk yang tersedia. Konfirmasi email mungkin diperlukan
   sesuai konfigurasi Auth. Rute: `/login`.
4. **Bagaimana menyampaikan aspirasi?** Masuk, buka formulir usulan dan isi
   sendiri. Usulan melewati moderasi; persetujuan tidak dijamin. Rute:
   `/usulan/baru`.
5. **Bagaimana melacak usulan?** Setelah masuk, buka Usulanku untuk melihat
   usulan milik sendiri dan informasi status yang tersedia. Rute: `/usulan-saya`.
6. **Apa yang dapat dilakukan MusrenAI?** Menjelaskan fitur dan memberi ide
   umum. MusrenAI tidak menulis atau mengirim formulir, mengubah status,
   menjamin persetujuan, atau menggantikan keputusan pemerintah.
7. **Bagaimana mengajukan pengaduan resmi?** Gunakan kanal resmi pemerintah
   daerah yang bersangkutan. Website ini tidak menjamin penyampaian pengaduan
   kepada pemerintah.

Rujukan implementasi: `supabase/functions/musrenai-chat/knowledge.ts`,
`web/src/app/router.tsx` dan alur autentikasi/pengajuan aplikasi. FAQ runtime
masih berstatus draft dan harus diselaraskan dengan naskah yang disetujui
sebelum flag persetujuan diaktifkan.

## Naskah pemberitahuan privasi

Pesan Anda dan sebagian riwayat percakapan dikirim ke Google Gemini melalui
layanan Free tier. Google dapat menggunakan konten tersebut untuk meningkatkan
produknya sesuai ketentuan yang berlaku. Jangan masukkan nama lengkap, NIK,
nomor telepon, alamat rinci, atau data pribadi lainnya.

Jawaban AI dapat keliru, tidak mengikat pemerintah dan bukan pengganti informasi
resmi. Periksa kembali informasi melalui sumber resmi. Untuk pengaduan, gunakan
kanal resmi pemerintah setempat. Percakapan pada halaman ini bersifat sementara;
ketentuan pemrosesan dan retensi oleh penyedia perlu dinilai dan disetujui tim.

Persetujuan tim atas FAQ, pemberitahuan, penggunaan Free tier dan pengiriman
data ke provider diperlukan sebelum mengaktifkan Gemini.
