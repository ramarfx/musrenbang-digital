

**PRODUCT REQUIREMENTS**  
**DOCUMENT**

**Musrenbang Digital**

*Anggaran kota, diputuskan bersama.*

Platform digitalisasi Musyawarah Perencanaan Pembangunan (Musrenbang) yang mengubah proses perencanaan pembangunan dari rapat luring yang terbatas menjadi partisipasi warga yang terbuka, terukur, dan dapat dilacak. Warga tidak hanya melihat data anggaran, tetapi ikut mengusulkan program, mengalokasikan anggaran virtual, dan membandingkan prioritas mereka dengan Anggaran Pendapatan dan Belanja Daerah (APBD) yang sebenarnya.

Dokumen ini adalah spesifikasi produk lengkap untuk pembangunan Minimum Viable Product (MVP) yang akan dilombakan pada WIA MIA 2026 (Multimedia in Action), subtema utama Data-Driven Decision Support dengan subtema pendukung Open Government Data.

| Informasi Dokumen | Detail |
| :---- | :---- |
| Nama Produk | Musrenbang Digital |
| Jenis Dokumen | Product Requirements Document (PRD) |
| Versi | 1.0 — 18 Oktober 2026 |
| Status | Siap untuk pembangunan MVP |
| Kompetisi | WIA MIA 2026 — Multimedia in Action |
| Tema Besar | Powering Public Transparency |
| Subtema Utama | Subtema 4 — Data-Driven Decision Support |
| Subtema Pendukung | Subtema 1 — Open Government Data (sumber data APBD) |
| Cakupan Wilayah MVP | 1 kota, 1 tahun anggaran (ditentukan pada Fase 1\) |
| Platform | Web responsif (desktop dan mobile) |
| Stack Utama | Next.js, Supabase, Leaflet/OpenStreetMap, Recharts, Tailwind CSS |

| Cara menggunakan dokumen ini: Dokumen ini dapat dibagikan langsung ke tim pengembang, desainer, dan juri sebagai acuan tunggal. Jika terdapat perbedaan antara dokumen ini dan keputusan lisan, yang berlaku adalah versi terbaru dari dokumen ini yang telah disetujui pemilik produk. |
| :---- |

*Daftar isi ringkas — 1\. Ringkasan Eksekutif, 2\. Latar Belakang dan Masalah, 3\. Visi, Tujuan, dan Sasaran, 4\. Ruang Lingkup, 5\. Pengguna dan Persona, 6\. Prinsip Produk dan Pembeda, 7\. User Journey dan Alur Utama, 8\. Spesifikasi Fitur Fungsional, 9\. Arsitektur Informasi Halaman, 10\. Model Data, 11\. Desain API dan Integrasi, 12\. Kebutuhan Non-Fungsional, 13\. Analitik dan Metrik Keberhasilan, 14\. Roadmap dan Fase Pembangunan, 15\. Risiko, Asumsi, dan Mitigasi, 16\. Naskah Demo dan Kriteria Penerimaan Rilis, Lampiran.*

# **1\. Ringkasan Eksekutif**

Musrenbang adalah mekanisme resmi perencanaan pembangunan di Indonesia. Melalui Musrenbang, warga, pemerintah kelurahan dan kecamatan, hingga pemerintah kota secara berjenjang membahas usulan program pembangunan untuk tahun anggaran berikutnya. Di atas kertas, mekanisme ini partisipatif. Dalam praktiknya, sebagian besar warga tidak pernah hadir, tidak tahu kapan forum berlangsung, dan tidak dapat melihat apakah usulan mereka benar-benar masuk ke dalam APBD.

Musrenbang Digital memindahkan loop terpenting dari proses tersebut ke dalam platform web yang dapat diakses siapa saja. Warga dapat melihat APBD dalam bentuk visual yang mudah dipahami, mengusulkan program dengan lokasi pada peta dan estimasi biaya, mengalokasikan anggaran virtual sebesar Rp10.000.000 per warga sebagai unit simulasi (nilai ini adalah parameter konfigurasi yang dapat disesuaikan sebelum rilis), memberikan suara pada usulan warga lain, dan yang paling penting, membandingkan hasil agregat alokasi seluruh warga dengan APBD nyata secara berdampingan.

Perbandingan tersebut, yang disebut Gap Warga–APBD, adalah inti produk ini. Ketika warga secara kolektif mengalokasikan 35 persen anggaran virtual untuk infrastruktur jalan, sementara APBD hanya mengalokasikan 18 persen, selisih itu langsung terlihat sebagai grafik, angka, dan penjelasan dalam bahasa yang sederhana. Dari satu layar tersebut, pengunjung memahami nilai produk tanpa perlu penjelasan tambahan.

Setelah usulan diverifikasi admin, statusnya dapat dilacak publik melalui linimasa: Diajukan, Diverifikasi, Masuk APBD, Dikerjakan, dan Selesai. Dengan demikian transparansi berjalan dua arah. Pemerintah membuka data anggarannya, warga membuka prioritasnya, dan keduanya bertemu dalam satu perbandingan yang jujur.

| Nilai demo: Dalam demo berdurasi dua sampai tiga menit, juri dapat melakukan sendiri seluruh loop: membuka peta usulan, memberikan suara, menggeser slider alokasi, menyimpan, lalu melihat halaman Bandingkan yang berubah karena tindakan mereka. Tidak ada langkah yang memerlukan penjelasan lisan yang panjang. |
| :---- |

# **2\. Latar Belakang dan Masalah**

## **2.1 Konteks**

Setiap tahun pemerintah daerah menyusun APBD yang menentukan program apa saja yang dibiayai, di wilayah mana, dan dengan nilai berapa. Musrenbang dirancang sebagai pintu masuk warga ke dalam keputusan tersebut, mulai dari tingkat kelurahan, kecamatan, hingga kota. Namun forum tersebut diselenggarakan secara luring pada jam kerja, dihadiri perwakilan terbatas, dan hasilnya jarang dipublikasikan kembali dalam format yang dapat dibaca warga biasa.

Di sisi lain, data anggaran sebenarnya tersedia melalui portal data terbuka pemerintah, situs Badan Pusat Statistik (BPS), dan data.go.id. Masalahnya bukan ketiadaan data, melainkan formatnya. Data disajikan sebagai tabel panjang dan dokumen anggaran yang sulit dipahami warga non-teknis, tanpa konteks perbandingan terhadap kebutuhan nyata di lapangan.

## **2.2 Masalah utama**

1. Partisipasi rendah dan tidak representatif. 

Hanya warga yang dapat hadir secara fisik pada waktu yang ditentukan yang suaranya tercatat. Pekerja, pelajar, dan warga yang tinggal jauh dari lokasi forum hampir tidak pernah terwakili.

2. Prioritas warga tidak teragregasi. 

Sekalipun usulan disampaikan, tidak ada mekanisme yang mengumpulkan seluruh usulan dan alokasi prioritas warga menjadi satu gambaran kuantitatif yang dapat dibandingkan dengan APBD.

3. APBD sulit dibaca warga. 

Dokumen APBD bersifat teknis dan tebal. Warga tidak dapat menjawab pertanyaan sederhana seperti: berapa persen anggaran tahun ini untuk jalan, untuk pendidikan, dan untuk kesehatan?

4. Tidak ada pelacakan setelah usulan disampaikan. 

Warga tidak tahu apakah usulannya diterima, ditolak, masuk anggaran, atau sudah dikerjakan. Kekosongan informasi ini menurunkan kepercayaan dan membuat warga enggan berpartisipasi pada tahun berikutnya.

5. Tidak ada umpan balik berbasis data untuk pengambil keputusan. 

Pemerintah daerah tidak memiliki cermin yang ringkas mengenai selisih antara prioritas warga dan alokasi resmi. Keputusan tetap dibuat, tetapi tanpa sinyal partisipatif yang terstruktur.

## **2.3 Peluang**

Kombinasi tiga hal membuka peluang yang belum digarap oleh peserta lomba pada umumnya. Pertama, data terbuka pemerintah menyediakan bahan baku APBD yang sah dan dapat dikutip sumbernya. Kedua, teknologi web modern memungkinkan agregasi dan visualisasi secara real-time dengan biaya pembangunan yang rendah. Ketiga, mekanik simulasi anggaran yang menyerupai permainan membuat topik yang biasanya terasa berat menjadi interaktif dan mudah didemokan. Sebagian besar tim akan membangun aplikasi pengaduan atau dasbor anggaran satu arah. Musrenbang Digital berbeda karena ia membangun partisipasi dan perbandingan, bukan hanya penyajian.

# **3\. Visi, Tujuan, dan Sasaran**

## **3.1 Visi produk**

*Menjadi cara paling sederhana bagi warga untuk memahami anggaran kotanya, menyampaikan prioritasnya dengan data, dan melihat dengan mata sendiri jarak antara prioritas tersebut dan keputusan anggaran yang sebenarnya.*

## **3.2 Tujuan produk**

* Meningkatkan partisipasi perencanaan pembangunan dengan menurunkan hambatan menjadi partisipasi daring yang dapat dilakukan dalam waktu kurang dari lima menit.  
* Menyajikan APBD dalam visual yang dapat dipahami warga non-teknis dalam waktu kurang dari tiga puluh detik sejak halaman dibuka.  
* Menghasilkan agregat prioritas warga yang kuantitatif dan dapat dibandingkan kategori demi kategori dengan APBD.  
* Memberikan pelacakan status usulan yang publik dan transparan dari pengajuan sampai selesai.  
* Menyediakan bahan evaluasi berbasis data bagi admin dan pemangku kepentingan mengenai kategori dengan gap terbesar.

## **3.3 Sasaran terukur untuk MVP**

| Sasaran | Target MVP | Cara Mengukur |
| :---- | :---- | :---- |
| Usulan terkumpul | Minimal 20 usulan contoh (seed) \+ usulan pengguna nyata | Hitungan tabel proposals |
| Partisipasi alokasi | Minimal 50 sesi alokasi tersimpan pada data demo | Hitungan tabel allocations per pengguna unik |
| Waktu menyelesaikan alokasi | Median di bawah 2 menit | Pengujian pengguna / analitik peristiwa |
| Keterbacaan gap | Pengguna uji dapat menyebutkan kategori gap terbesar setelah melihat halaman Bandingkan | Uji pemahaman 5 pengguna |
| Kelengkapan pelacakan | 100% usulan terverifikasi memiliki riwayat status | Audit tabel proposal\_status\_history |
| Keberhasilan demo | Loop inti selesai dalam 2–3 menit tanpa error | Checklist naskah demo Bab 16 |

## **3.4 Hal yang bukan tujuan MVP**

* Menggantikan Musrenbang resmi atau sistem perencanaan pemerintah. Produk ini adalah prototipe partisipasi dan transparansi untuk keperluan lomba dan pembuktian konsep, bukan sistem resmi pemerintah.  
* Mengelola anggaran negara yang sebenarnya. Seluruh alokasi warga bersifat virtual dan tidak memiliki dampak finansial nyata.  
* Mencakup seluruh kota di Indonesia. MVP dibatasi pada satu kota dan satu tahun anggaran.

# **4\. Ruang Lingkup**

## **4.1 Di dalam ruang lingkup (In Scope)**

* Autentikasi warga dan admin dengan email melalui Supabase Auth.  
* Profil pengguna dengan peran warga atau admin.  
* Pembuatan, pembacaan, pembaruan terbatas, dan penampilan usulan program dengan kategori, lokasi pada peta, dan estimasi biaya.  
* Voting satu pengguna satu suara per usulan, dengan kemampuan membatalkan suara.  
* Komentar pada detail usulan.  
* Simulator alokasi anggaran virtual per pengguna dengan slider per kategori, indikator sisa anggaran secara real-time, dan penyimpanan.  
* Agregasi alokasi seluruh warga dan halaman perbandingan Warga vs APBD per kategori, lengkap dengan sorotan gap dan penjelasan teks otomatis.  
* Data APBD untuk satu kota dan satu tahun, dimuat sebagai data awal (seed) dengan sumber dan tahun dicantumkan secara eksplisit.  
* Moderasi admin: menyetujui, menolak, dan mengubah status usulan, serta mengelola data APBD.  
* Linimasa riwayat status pada setiap usulan.  
* Halaman publik tanpa login untuk peta usulan, agregat, perbandingan, dan dasbor transparansi.  
* Data contoh (seed) sekitar 20 usulan agar platform tidak tampil kosong saat pertama kali didemokan.

## **4.2 Di luar ruang lingkup (Out of Scope)**

* Aplikasi mobile native (Android/iOS). MVP adalah web responsif.  
* Pembayaran, donasi, atau penggalangan dana dalam bentuk apa pun.  
* Integrasi langsung dan otomatis dengan sistem keuangan pemerintah daerah. Data APBD MVP dimuat secara manual sebagai seed yang bersumber jelas.  
* Forum diskusi umum, pesan pribadi antar pengguna, dan notifikasi melalui WhatsApp atau SMS.  
* Verifikasi identitas kependudukan (KTP/NIK). MVP menggunakan akun email untuk menekan hambatan partisipasi; konsekuensi risikonya dicatat pada Bab 15\.  
* Multi-kota dan multi-tahun dalam satu penerapan. Struktur data disiapkan agar dapat diperluas, tetapi antarmuka MVP hanya menampilkan satu kota dan satu tahun terpilih.

## **4.3 Batasan dan ketergantungan**

* Ketersediaan data APBD terbuka untuk kota terpilih dalam format yang dapat diolah.  
* Layanan Supabase (Auth, Postgres, Realtime, Storage), peta Leaflet dengan tile OpenStreetMap, dan platform deployment.  
* Koneksi internet pengguna. Tidak ada mode luring pada MVP.

| Keputusan terbuka: Kota dan tahun APBD final dipilih pada awal Fase 1 berdasarkan kelengkapan data terbuka yang tersedia. Kandidat yang disebut dalam diskusi awal adalah Kota Depok atau DKI Jakarta. Keputusan akhir dan sumber data wajib dicatat pada halaman Tentang/Data dan pada data awal (seed), bukan diasumsikan. Keputusan 25 Okt 2026: DKI Jakarta, cadangan Kota Depok (lihat Lampiran D.1). |
| :---- |

# **5\. Pengguna dan Persona**

## **5.1 Peran pengguna**

| Peran | Deskripsi | Hak Akses Inti |
| :---- | :---- | :---- |
| Publik (tanpa login) | Pengunjung yang ingin memahami anggaran dan usulan | Lihat landing, peta, agregat, Bandingkan, detail usulan, dasbor transparansi |
| Warga (login) | Pengguna terdaftar yang berpartisipasi aktif | Semua akses publik \+ buat usulan, vote, komentar, alokasi virtual, lacak usulan sendiri |
| Admin / Verifikator | Pengelola platform dan perwakilan pengelola data | Semua akses warga \+ moderasi usulan, ubah status, kelola APBD, lihat statistik partisipasi |

## **5.2 Persona**

### **Persona 1 — Sari, 29 tahun, warga dan pekerja kantoran**

Sari tinggal di kota cakupan platform dan setiap hari melewati jalan lingkungan yang rusak. Ia pernah mendengar istilah Musrenbang, tetapi tidak pernah dapat hadir karena forum diadakan pada jam kerja. Ia nyaman menggunakan ponsel, menginginkan proses yang cepat, dan hanya akan berpartisipasi jika usulannya dapat ia lacak kembali. Kebutuhan utamanya: mengajukan usulan dalam waktu singkat, melihat dukungannya bertambah, dan menerima kepastian status. Frustrasi utamanya: formulir panjang dan ketidakjelasan nasib usulan.

### **Persona 2 — Budi, 41 tahun, ketua RT dan penggerak warga**

Budi terbiasa mengusulkan kebutuhan lingkungannya, tetapi usulannya selalu bersaing tanpa data pendukung. Ia membutuhkan halaman perbandingan dan agregat untuk menunjukkan bahwa kebutuhan jalan dan drainase bukan hanya pendapatnya, melainkan prioritas kolektif warga. Ia akan membagikan tautan usulan dan halaman Bandingkan kepada warga dan perangkat kelurahan. Kebutuhan utamanya: bukti kuantitatif dan tampilan yang meyakinkan saat dicetak atau dibagikan.

### **Persona 3 — Ratna, 35 tahun, admin/verifikator**

Ratna mengelola data APBD dan memverifikasi usulan yang masuk. Ia membutuhkan antrean moderasi yang jelas, tindakan setujui/tolak yang cepat, dan pembaruan status yang tercatat otomatis dalam riwayat. Ia juga bertanggung jawab memastikan tidak ada usulan duplikat, spam, atau berisi data pribadi yang tidak seharusnya tampil publik. Kebutuhan utamanya: efisiensi moderasi dan jejak audit yang rapi.

## **5.3 User stories utama**

* Sebagai warga, saya ingin melihat komposisi APBD dalam grafik sederhana, agar saya memahami ke mana anggaran kota dialokasikan tanpa membaca dokumen teknis.  
* Sebagai warga, saya ingin mengusulkan program dengan menandai lokasi pada peta dan menuliskan estimasi biaya, agar kebutuhan di lingkungan saya tercatat secara konkret.  
* Sebagai warga, saya ingin memberikan suara pada usulan warga lain, agar prioritas bersama muncul dari dukungan yang terukur.  
* Sebagai warga, saya ingin mengalokasikan anggaran virtual dengan slider dan melihat sisa anggaran secara langsung, agar saya merasakan trade-off dalam menyusun anggaran.  
* Sebagai publik, saya ingin membandingkan alokasi warga dengan APBD per kategori, agar saya melihat kategori mana yang paling jauh selisihnya.  
* Sebagai warga, saya ingin melacak linimasa status usulan saya, agar saya tahu usulannya sudah sampai tahap apa.  
* Sebagai admin, saya ingin menyetujui atau menolak usulan dan memperbarui statusnya, agar data publik tetap berkualitas dan pelacakan tetap akurat.

# **6\. Prinsip Produk dan Pembeda**

## **6.1 Prinsip produk**

* Transparansi dua arah. 

Platform tidak hanya menampilkan data pemerintah kepada warga, tetapi juga menampilkan agregat prioritas warga kepada publik dan pengambil keputusan.

* Angka sebelum opini. 

Setiap klaim pada halaman Bandingkan dan dasbor harus berasal dari agregasi data yang dapat ditelusur, bukan teks yang ditulis bebas.

* Sederhana untuk warga, ketat untuk data. 

Bahasa antarmuka menggunakan istilah sehari-hari, sedangkan model data, validasi, dan riwayat status dijaga secara ketat di sisi sistem.

* Setiap usulan dapat dilacak. 

Tidak ada usulan terverifikasi yang berhenti tanpa status. Setiap perubahan status tercatat dengan waktu dan catatan.

* Jujur soal sumber data. 

Setiap angka APBD mencantumkan kota, tahun, dan sumbernya. Jika data merupakan data awal untuk demo, hal itu dinyatakan secara terbuka.

## **6.2 Pembeda dibandingkan solusi umum**

| Aspek | Aplikasi Pengaduan / Dasbor Biasa | Musrenbang Digital |
| :---- | :---- | :---- |
| Arah transparansi | Satu arah: pemerintah ke warga | Dua arah: APBD dibuka \+ prioritas warga diagregasi |
| Peran warga | Melapor atau melihat | Mengusulkan, mengalokasikan, mem-vote, melacak |
| Mekanik inti | Formulir laporan / grafik statis | Simulator anggaran virtual \+ Gap Warga–APBD |
| Hasil akhir | Daftar laporan | Perbandingan kuantitatif \+ linimasa akuntabilitas |
| Keterikatan lokal | Umum | Berakar pada proses nyata Musrenbang Indonesia |

# **7\. User Journey dan Alur Utama**

## **7.1 Loop inti produk**

1. Warga atau pengunjung membuka landing dan melihat statistik partisipasi serta ringkasan APBD.  
2. Pengunjung menjelajahi usulan pada peta dan daftar, memfilter berdasarkan kategori dan status.  
3. Pengunjung membuka detail usulan, membaca deskripsi, lokasi, estimasi biaya, dan linimasa status.  
4. Untuk berpartisipasi, pengunjung masuk sebagai warga, lalu memberikan suara dan komentar.  
5. Warga membuat usulan baru atau langsung menuju simulator alokasi anggaran virtual.  
6. Warga menggeser slider per kategori sampai total alokasi mencapai batas virtual, lalu menyimpan.  
7. Sistem mengagregasi alokasi warga tersebut ke dalam rata-rata kolektif dan memperbarui halaman Bandingkan.  
8. Pengunjung membuka halaman Bandingkan dan melihat selisih warga vs APBD serta sorotan gap terbesar.  
9. Warga kembali ke usulannya secara berkala untuk melacak perubahan status yang dilakukan admin.

## **7.2 Alur pembuatan usulan**

1. Warga memilih tombol Buat Usulan. Jika belum masuk, sistem mengarahkan ke halaman masuk dan mengembalikan warga ke formulir setelah berhasil.  
2. Warga mengisi judul, deskripsi, kategori, estimasi biaya, dan menandai lokasi pada peta (latitude/longitude terisi dari penanda).  
3. Sistem memvalidasi kelengkapan. Judul dan deskripsi tidak boleh kosong, kategori wajib dipilih, estimasi biaya harus bernilai positif, dan lokasi wajib ditandai.  
4. Usulan tersimpan dengan status Diajukan dan status moderasi Menunggu. Usulan belum tampil pada daftar publik sampai disetujui admin, kecuali pada halaman Usulan Saya milik pembuatnya.  
5. Admin menerima usulan pada antrean moderasi dan menyetujui atau menolak dengan catatan.  
6. Usulan yang disetujui tampil publik dan dapat menerima suara serta komentar.

## **7.3 Alur alokasi anggaran virtual**

1. Warga membuka halaman Alokasi Anggaran dan melihat total anggaran virtual serta daftar kategori.  
2. Warga menggeser slider atau mengisi nominal per kategori. Sisa anggaran diperbarui secara real-time pada setiap perubahan.  
3. Sistem mencegah penyimpanan jika total melebihi batas virtual. Jika total kurang dari batas, sistem menampilkan peringatan bahwa masih ada sisa yang belum dialokasikan dan meminta konfirmasi sebelum menyimpan.  
4. Setelah disimpan, alokasi warga menggantikan alokasi sebelumnya (satu set alokasi aktif per pengguna per periode) dan ikut dihitung dalam agregat publik.  
5. Warga diarahkan untuk melihat dampaknya pada halaman Bandingkan.

## **7.4 Alur moderasi dan pelacakan status**

1. Admin membuka antrean moderasi dan memeriksa isi usulan, lokasi, dan estimasi biaya.  
2. Admin menyetujui atau menolak. Penolakan wajib disertai catatan alasan yang dapat dilihat pembuat usulan.  
3. Admin memperbarui status usulan yang disetujui mengikuti tahapan Diverifikasi, Masuk APBD, Dikerjakan, dan Selesai, dengan catatan pada setiap perubahan.  
4. Setiap perubahan menulis satu baris baru pada riwayat status dan tampil seketika pada linimasa detail usulan melalui pembaruan real-time.

## **7.5 Kondisi tepi (edge cases)**

* Suara ganda: kombinasi proposal\_id dan user\_id bersifat unik. Percobaan memberikan suara kedua pada usulan yang sama akan membatalkan suara pertama (toggle), bukan menambah suara baru.  
* Usulan ditolak: usulan tidak tampil publik, tetapi tetap dapat dilihat pembuatnya beserta catatan penolakan.  
* Alokasi belum lengkap: agregat hanya menghitung pengguna yang telah menyimpan alokasi. Jumlah partisipan alokasi selalu ditampilkan di samping agregat agar rata-rata tidak disalahartikan.  
* Belum ada data warga: jika belum ada alokasi warga yang tersimpan, halaman Bandingkan menampilkan APBD saja dengan ajakan untuk menjadi warga pertama yang mengalokasikan.  
* Lokasi di luar wilayah kota: sistem menampilkan peringatan, tetapi tetap mengizinkan admin yang memutuskan pada tahap moderasi. MVP tidak melakukan penolakan geografis otomatis.

# **8\. Spesifikasi Fitur Fungsional**

Setiap fitur di bawah ini diberi kode kebutuhan (FR), prioritas, dan kriteria penerimaan. Prioritas menggunakan MoSCoW: Must (wajib untuk MVP), Should (penting, dikerjakan setelah Must selesai), dan Could (dikerjakan jika waktu memungkinkan).

### **FR-01 — Autentikasi dan Profil Pengguna (Must)**

Pengguna dapat mendaftar dan masuk menggunakan email dan kata sandi melalui Supabase Auth. Saat pertama kali masuk, sistem membuat profil dengan peran default warga. Peran admin hanya dapat diberikan secara manual oleh pengelola melalui basis data atau dasbor admin yang sudah terautentikasi sebagai admin, tidak dapat dipilih sendiri saat pendaftaran.

* Kriteria penerimaan: pengguna yang belum masuk tidak dapat membuat usulan, memberikan suara, berkomentar, atau menyimpan alokasi; pengguna diarahkan ke halaman masuk dan dikembalikan ke halaman asal setelah berhasil masuk.  
* Kriteria penerimaan: sesi tetap aktif setelah halaman dimuat ulang, dan pengguna dapat keluar dengan benar.  
* Kriteria penerimaan: tidak ada cara melalui antarmuka bagi warga untuk mengubah perannya sendiri menjadi admin.

### **FR-02 — Landing dan Statistik Publik (Must)**

Halaman utama menampilkan penjelasan singkat produk, cara kerja dalam tiga langkah, statistik total usulan terverifikasi, total pemberi suara, total partisipan alokasi, dan total anggaran virtual yang dialokasikan warga, serta ajakan utama untuk menjelajahi usulan dan mencoba simulator alokasi.

* Kriteria penerimaan: seluruh angka statistik berasal dari data nyata pada basis data, bukan angka yang ditulis statis pada kode tampilan.  
* Kriteria penerimaan: halaman dapat dibuka tanpa login dan tampil dengan benar pada layar ponsel.

### **FR-03 — Jelajahi Usulan: Peta, Daftar, dan Filter (Must)**

Halaman Jelajahi menampilkan peta interaktif (Leaflet/OpenStreetMap) dengan penanda untuk setiap usulan terverifikasi yang memiliki lokasi, berdampingan atau bergantian dengan daftar usulan. Pengguna dapat memfilter berdasarkan kategori dan status, serta mengurutkan berdasarkan suara terbanyak atau terbaru.

* Kriteria penerimaan: mengklik penanda pada peta atau kartu pada daftar membuka detail usulan yang sama.  
* Kriteria penerimaan: filter kategori dan status bekerja bersamaan dan jumlah hasil diperbarui sesuai filter.  
* Kriteria penerimaan: usulan yang belum disetujui atau ditolak tidak muncul pada halaman publik.

### **FR-04 — Detail Usulan dan Linimasa Status (Must)**

Halaman detail menampilkan judul, deskripsi, kategori, lokasi pada peta kecil, estimasi biaya, pembuat (nama tampilan), jumlah suara, daftar komentar, dan linimasa status dalam urutan kronologis dari riwayat status.

* Kriteria penerimaan: linimasa menampilkan seluruh entri riwayat status termasuk status awal Diajukan beserta tanggal dan catatan admin.  
* Kriteria penerimaan: perubahan status yang dilakukan admin tampil pada halaman detail yang sedang terbuka tanpa perlu memuat ulang halaman secara manual (real-time), atau selambat-lambatnya setelah halaman dimuat ulang.

### **FR-05 — Pembuatan dan Pengelolaan Usulan oleh Warga (Must)**

Warga yang telah masuk dapat membuat usulan dengan judul, deskripsi, kategori, lokasi pada peta, dan estimasi biaya. Warga dapat melihat daftar usulannya sendiri beserta status moderasinya, dan mengedit usulannya hanya selama status moderasinya masih Menunggu.

* Kriteria penerimaan: formulir menolak penyimpanan jika ada kolom wajib yang kosong atau estimasi biaya tidak positif, dengan pesan kesalahan yang spesifik per kolom.  
* Kriteria penerimaan: usulan yang sudah disetujui tidak dapat lagi diedit oleh pembuatnya; perubahan selanjutnya hanya melalui admin.  
* Kriteria penerimaan: tidak ada fitur unggah foto pada MVP kecuali dinyatakan sebagai penambahan Should. Lokasi dan deskripsi menjadi bukti utama usulan pada MVP.

### **FR-06 — Voting (Must)**

Warga yang telah masuk dapat memberikan satu suara pada setiap usulan terverifikasi dan membatalkannya dengan tindakan yang sama. Jumlah suara selalu dihitung dari tabel votes, bukan dari kolom hitungan yang diperbarui manual.

* Kriteria penerimaan: satu pengguna tidak dapat memiliki lebih dari satu baris suara untuk usulan yang sama; batasan ini ditegakkan pada tingkat basis data dengan unique constraint.  
* Kriteria penerimaan: jumlah suara pada kartu daftar dan halaman detail selalu sama untuk usulan yang sama.

### **FR-07 — Komentar (Should)**

Warga yang telah masuk dapat menulis komentar pada usulan terverifikasi. Komentar menampilkan nama tampilan penulis dan waktu. Admin dapat menghapus komentar yang melanggar ketentuan.

* Kriteria penerimaan: pengunjung tanpa login dapat membaca komentar, tetapi tidak dapat menulis komentar.  
* Kriteria penerimaan: komentar kosong atau hanya berisi spasi tidak dapat dikirim.

### **FR-08 — Simulator Alokasi Anggaran Virtual (Must) — Fitur Pembeda**

Warga yang telah masuk mendapatkan anggaran virtual dengan total yang ditetapkan pada konfigurasi produk (nilai tampilan awal per pengguna: Rp10.000.000 sebagai unit simulasi, dapat disesuaikan sebelum rilis tanpa mengubah kode tampilan). Untuk setiap kategori anggaran, warga mengatur nominal melalui slider dan isian angka yang saling tersinkron. Antarmuka menampilkan total teralokasi, sisa anggaran, dan persentase per kategori secara real-time.

* Kriteria penerimaan: total alokasi tidak dapat melebihi anggaran virtual; kontrol penyimpanan nonaktif atau penyimpanan ditolak dengan pesan yang jelas jika total melebihi batas.  
* Kriteria penerimaan: menyimpan alokasi menggantikan alokasi aktif sebelumnya dari pengguna yang sama, bukan menambah set baru yang menggandakan suara pengguna dalam agregat.  
* Kriteria penerimaan: setelah menyimpan, pengguna melihat konfirmasi dan tautan langsung ke halaman Bandingkan.  
* Kriteria penerimaan: alokasi yang tersimpan tetap tampil dengan nilai yang sama saat pengguna kembali membuka halaman ini pada sesi berikutnya.

### **FR-09 — Halaman Bandingkan: Warga vs APBD (Must) — Fitur Pembeda**

Halaman publik ini menampilkan, untuk setiap kategori, persentase rata-rata alokasi warga dan persentase APBD secara berdampingan dalam grafik batang (Recharts), tabel angka, dan sorotan gap. Gap dihitung sebagai selisih persentase warga dikurangi persentase APBD. Tiga gap terbesar ditampilkan sebagai sorotan dengan kalimat penjelasan yang dihasilkan dari angka, contoh format: Warga mengalokasikan X persen untuk kategori A, sementara APBD mengalokasikan Y persen — selisih Z poin persen. Pembaruan 25 Okt 2026: persentase APBD dihitung dari belanja program saja (lihat Lampiran D.2).

* Kriteria penerimaan: persentase warga dihitung dari rata-rata alokasi seluruh pengguna yang telah menyimpan alokasi, dan jumlah partisipan selalu ditampilkan pada halaman.  
* Kriteria penerimaan: persentase APBD dihitung dari data apbd\_items untuk kota dan tahun terpilih, dan sumber serta tahun APBD dicantumkan pada halaman.  
* Kriteria penerimaan: urutan kategori pada grafik, tabel, dan simulator selalu sama agar mudah dibandingkan.  
* Kriteria penerimaan: jika belum ada partisipan alokasi, halaman menampilkan APBD saja beserta ajakan berpartisipasi, tanpa menampilkan angka warga nol persen yang menyesatkan.

### **FR-10 — Dashboard Admin dan Moderasi (Must)**

Admin memiliki area terpisah yang hanya dapat diakses peran admin, berisi antrean moderasi usulan, daftar seluruh usulan dengan pengubah status, pengelolaan data APBD (tambah, ubah, hapus item kategori), dan statistik partisipasi (total pengguna, total usulan per status, total partisipan alokasi, total suara).

* Kriteria penerimaan: warga dan pengunjung tanpa login yang mencoba membuka area admin akan ditolak dan diarahkan kembali, baik pada tingkat antarmuka maupun pada tingkat aturan akses basis data (Row Level Security).  
* Kriteria penerimaan: setiap perubahan status melalui dasbor ini wajib mengisi catatan dan otomatis menulis entri baru pada riwayat status.  
* Kriteria penerimaan: penolakan usulan wajib menyertakan alasan, dan alasan tersebut dapat dibaca oleh pembuat usulan pada halaman Usulan Saya.

### **FR-11 — Halaman Tentang dan Sumber Data (Should)**

Halaman yang menjelaskan apa itu Musrenbang, bagaimana platform ini bekerja, kota dan tahun APBD yang ditampilkan, sumber data APBD beserta tautannya, serta pernyataan bahwa alokasi warga bersifat simulasi dan platform ini adalah prototipe untuk keperluan lomba dan pembuktian konsep.

* Kriteria penerimaan: tidak ada angka APBD pada platform yang tampil tanpa kota, tahun, dan sumber yang dapat dirujuk ke halaman ini.

### **FR-12 — Pencarian Usulan (Could)**

Jika waktu memungkinkan setelah seluruh fitur Must dan Should selesai, daftar usulan dilengkapi pencarian teks berdasarkan judul dan deskripsi. Fitur ini tidak boleh menggeser penyelesaian fitur pembeda FR-08 dan FR-09.

# **9\. Arsitektur Informasi Halaman**

| Halaman / Rute Konseptual | Akses | Isi Utama |
| :---- | :---- | :---- |
| Landing (/) | Publik | Penjelasan produk, statistik, cara kerja, ajakan utama |
| Jelajahi Usulan (/usulan) | Publik | Peta \+ daftar usulan, filter kategori/status, urutan |
| Detail Usulan (/usulan/\[id\]) | Publik baca, Warga interaksi | Deskripsi, peta, vote, komentar, linimasa status |
| Buat Usulan (/usulan/baru) | Warga | Formulir usulan \+ penanda lokasi pada peta |
| Usulan Saya (/usulan-saya) | Warga | Usulan milik pengguna \+ status moderasi \+ alasan penolakan |
| Alokasi Anggaran (/alokasi) | Warga | Simulator slider per kategori, sisa anggaran, simpan |
| Bandingkan (/bandingkan) | Publik | Grafik \+ tabel Warga vs APBD, sorotan gap, sumber data |
| Tentang & Sumber Data (/tentang) | Publik | Penjelasan Musrenbang, sumber APBD, batasan prototipe |
| Masuk / Daftar (/masuk) | Publik | Formulir autentikasi Supabase Auth |
| Dashboard Admin (/admin) | Admin | Moderasi, kelola status, kelola APBD, statistik |

Navigasi utama pada tampilan desktop dan ponsel menampilkan: Jelajahi Usulan, Alokasi Anggaran, Bandingkan, dan Tentang. Tombol Buat Usulan tampil sebagai ajakan utama yang menonjol. Menu akun menampilkan Usulan Saya dan Keluar untuk warga, ditambah Dashboard Admin untuk admin. Halaman Bandingkan harus dapat dicapai dalam satu klik dari halaman mana pun, karena halaman tersebut adalah puncak dari loop produk dan demo.

## **9.1 Pedoman konten dan bahasa antarmuka**

* Gunakan istilah sehari-hari: Usulan untuk proposal, Bandingkan untuk halaman perbandingan, dan Alokasi Anggaran untuk simulator. Hindari istilah teknis basis data pada antarmuka publik.  
* Seluruh nominal ditampilkan dalam format Rupiah Indonesia dengan pemisah ribuan, dan persentase ditampilkan dengan satu angka desimal.  
* Setiap grafik wajib memiliki padanan tabel angka agar informasi yang sama dapat dibaca tanpa bergantung pada warna.  
* Pesan kesalahan ditulis sebagai kalimat yang menjelaskan apa yang salah dan apa yang harus dilakukan pengguna, bukan kode kesalahan.

# **10\. Model Data**

Basis data menggunakan PostgreSQL pada Supabase. Seluruh tabel berada pada skema publik dengan Row Level Security (RLS) aktif. Nama tabel dan kolom di bawah ini mengikuti rancangan awal pada diskusi produk dan menjadi acuan untuk migrasi basis data.

## **10.1 Tabel inti**

| Tabel | Kolom Kunci | Keterangan |
| :---- | :---- | :---- |
| profiles | id (FK auth.users), nama, peran (warga/admin) | Satu baris per pengguna terdaftar |
| proposals | id, judul, deskripsi, kategori, lat, lng, estimasi\_biaya, status, moderasi, created\_by | Usulan program dari warga |
| votes | proposal\_id, user\_id (unik bersama) | Satu suara per pengguna per usulan |
| allocations | user\_id, kategori, nominal | Satu baris per pengguna per kategori pada set alokasi aktif |
| apbd\_items | kategori, nominal, tahun, kota, sumber | Komposisi APBD kota dan tahun terpilih |
| proposal\_status\_history | proposal\_id, status, catatan, created\_at, changed\_by | Jejak audit setiap perubahan status |
| comments | proposal\_id, user\_id, isi, created\_at | Komentar warga pada usulan |

## **10.2 Definisi kolom penting**

* proposals.status: tahapan publik usulan — Diajukan, Diverifikasi, Masuk APBD, Dikerjakan, Selesai, atau Ditolak. Nilai ini yang tampil pada linimasa.  
* proposals.moderasi: status peninjauan internal — Menunggu, Disetujui, Ditolak. Usulan hanya tampil publik jika moderasi bernilai Disetujui. Pemisahan status dan moderasi mencegah usulan yang belum ditinjau tampil sebelum waktunya.  
* proposals.kategori: salah satu dari daftar kategori resmi pada Lampiran B. Kategori yang sama persis harus digunakan pada allocations dan apbd\_items agar perbandingan pada FR-09 valid.  
* allocations: untuk menghitung agregat warga, sistem menjumlahkan nominal per kategori dari seluruh set alokasi aktif, lalu mengubahnya menjadi persentase terhadap total keseluruhan. Mengganti alokasi berarti menghapus atau menimpa baris lama pengguna tersebut sebelum menyimpan baris baru dalam satu transaksi.  
* apbd\_items.sumber: teks sumber data (nama portal/dokumen dan tahun). Kolom ini wajib terisi dan ditampilkan rujukannya pada halaman Bandingkan dan Tentang.

## **10.3 Aturan integritas**

* Kunci asing dari proposals.created\_by, votes.user\_id, allocations.user\_id, dan comments.user\_id mengacu pada profiles.id.  
* Unique constraint pada votes (proposal\_id, user\_id) dan pada gabungan kategori per set alokasi aktif per pengguna.  
* Hapus bertingkat (cascade) hanya untuk data turunan yang memang tidak bermakna tanpa induknya, seperti votes dan comments ketika usulan dihapus oleh admin. Riwayat status tidak dihapus ketika status berubah; riwayat hanya bertambah.  
* Indeks pada proposals (kategori, status, moderasi), votes (proposal\_id), allocations (user\_id, kategori), dan proposal\_status\_history (proposal\_id, created\_at).

## **10.4 Aturan akses (Row Level Security)**

| Tabel | Publik Baca | Warga Tulis | Admin |
| :---- | :---- | :---- | :---- |
| profiles | Nama tampilan saja | Ubah nama sendiri | Lihat semua, ubah peran |
| proposals | Hanya yang Disetujui | Buat baru, edit milik sendiri saat Menunggu | Semua baca, moderasi, ubah status |
| votes | Jumlah agregat | Tambah/hapus suara sendiri | Lihat semua |
| allocations | Agregat saja, bukan milik orang lain | Tulis milik sendiri | Lihat agregat |
| apbd\_items | Baca semua | — | Tambah, ubah, hapus |
| proposal\_status\_history | Baca untuk usulan publik | — | Tulis melalui perubahan status |
| comments | Baca untuk usulan publik | Tulis milik sendiri | Hapus komentar melanggar |

| Privasi agregat: Alokasi individual milik warga lain tidak pernah ditampilkan sebagai data personal pada antarmuka publik. Yang tampil publik hanyalah hasil agregat dan jumlah partisipan, untuk menjaga privasi preferensi anggaran setiap warga. |
| :---- |

# **11\. Desain API dan Integrasi**

## **11.1 Pendekatan API**

MVP tidak membangun server API terpisah. Aplikasi Next.js berkomunikasi langsung dengan Supabase melalui PostgREST untuk operasi data, Supabase Auth untuk autentikasi, Supabase Realtime untuk pembaruan status, dan Supabase Storage hanya jika fitur unggah berkas ditambahkan di luar MVP. Seluruh keamanan ditegakkan melalui Row Level Security, sehingga aturan akses pada Bab 10.4 berlaku konsisten baik dari antarmuka web maupun dari permintaan API langsung.

## **11.2 Operasi data utama**

| Operasi | Sumber | Catatan |
| :---- | :---- | :---- |
| Daftar usulan publik | GET proposals (moderasi \= Disetujui) \+ hitungan votes | Dukung filter kategori, status, dan urutan suara/terbaru |
| Detail \+ riwayat | GET proposals/\[id\] \+ proposal\_status\_history | Urutkan riwayat dari yang terlama |
| Buat usulan | POST proposals | created\_by dari sesi pengguna, moderasi awal Menunggu |
| Toggle suara | POST/DELETE votes | Unique constraint mencegah duplikasi |
| Simpan alokasi | Transaksi: timpa allocations milik pengguna | Ganti set lama secara atomik, bukan append |
| Agregat warga | View / fungsi agregasi allocations | Kembalikan persen per kategori \+ jumlah partisipan |
| Data APBD | GET apbd\_items (kota \+ tahun terpilih) | Hitung persen per kategori di sisi klien/server dari nominal |
| Ubah status | UPDATE proposals.status \+ INSERT riwayat | Kedua operasi harus berhasil bersamaan |

## **11.3 Integrasi eksternal**

* Peta: Leaflet dengan tile OpenStreetMap. Penanda lokasi disimpan sebagai latitude dan longitude numerik pada proposals. Tidak diperlukan kunci API berbayar.  
* Data APBD: portal data terbuka pemerintah kota terpilih, BPS, atau data.go.id. Data diambil secara manual pada Fase 1, dibersihkan ke dalam format kategori Lampiran B, dan dimuat sebagai seed dengan sumber dan tahun yang dicatat. Tidak ada scraping otomatis pada MVP.  
* Deployment: Vercel atau Cloudflare. Variabel lingkungan Supabase (URL proyek dan anon key) dikonfigurasi pada platform deployment dan tidak pernah ditulis pada repositori publik. Kunci service role tidak pernah digunakan pada kode sisi klien.

## **11.4 Penanganan kesalahan**

* Jika Supabase tidak terjangkau, antarmuka menampilkan pesan kesalahan yang dapat dipahami dengan tombol coba lagi, bukan halaman kosong.  
* Jika tile peta gagal dimuat, daftar usulan tetap berfungsi penuh; peta menampilkan pesan bahwa peta sedang tidak tersedia.  
* Seluruh pengiriman formulir bersifat idempoten sebisa mungkin: mengklik simpan dua kali tidak menciptakan usulan atau suara ganda.

# **12\. Kebutuhan Non-Fungsional**

## **12.1 Performa**

* Halaman publik utama (Landing, Jelajahi, Bandingkan) dimuat dan dapat digunakan dalam waktu di bawah 3 detik pada koneksi 4G umum untuk data demo standar (sekitar 20 sampai 100 usulan).  
* Perhitungan ulang agregat dan sisa anggaran pada simulator terjadi secara langsung pada sisi klien tanpa menunggu respons server.  
* Grafik Bandingkan dirender dari hasil agregat yang telah dihitung, bukan dari pemindaian berulang seluruh tabel pada setiap render.

## **12.2 Keamanan**

* Row Level Security aktif pada seluruh tabel. Anon key hanya memberikan akses sesuai kebijakan RLS.  
* Peran admin tidak dapat diperoleh melalui pendaftaran mandiri atau manipulasi permintaan sisi klien.  
* Seluruh input teks dibersihkan dari markup yang dapat dieksekusi sebelum ditampilkan. Komentar dan deskripsi dirender sebagai teks, bukan HTML mentah.  
* Tidak ada data pribadi sensitif yang dikumpulkan pada MVP: tidak ada NIK, alamat rumah, atau nomor telepon. Nama tampilan dan email akun adalah batas maksimum data personal.

## **12.3 Aksesibilitas dan keterbacaan**

* Kontras teks memenuhi pedoman keterbacaan umum. Informasi pada grafik tidak bergantung pada warna saja; selalu tersedia tabel angka.  
* Seluruh kontrol utama (slider, tombol suara, filter) dapat dioperasikan dengan keyboard dan memiliki label yang jelas.  
* Tampilan responsif wajib berfungsi pada lebar ponsel umum mulai dari 360 piksel. Peta dan daftar pada ponsel ditampilkan bergantian melalui tab atau susunan vertikal, bukan berdampingan yang terjepit.

## **12.4 Keandalan dan pencadangan**

* Data demo (seed APBD dan 20 usulan contoh) disimpan sebagai berkas migrasi/seed pada repositori sehingga lingkungan demo dapat dibangun ulang dari awal.  
* Sebelum sesi demo atau penilaian, lakukan ekspor cadangan basis data Supabase dan verifikasi bahwa akun admin demo dapat masuk.

## **12.5 Lingkungan dan kompatibilitas**

* Browser yang didukung: versi terbaru Chrome, Edge, Firefox, dan Safari pada desktop dan perangkat seluler.  
* Bahasa antarmuka: Bahasa Indonesia untuk seluruh antarmuka publik dan admin pada MVP.

# **13\. Analitik dan Metrik Keberhasilan**

## **13.1 Peristiwa yang dicatat**

* usulan\_dibuat, suara\_diberikan, suara\_dibatalkan, komentar\_dikirim, alokasi\_disimpan, halaman\_bandingkan\_dibuka, dan usulan\_dibuka dari peta dibandingkan dari daftar.  
* Pencatatan analitik MVP dapat berupa tabel peristiwa sederhana pada Supabase atau layanan analitik web yang ringan. Pencatatan tidak boleh memperlambat interaksi utama pengguna.

## **13.2 Metrik produk**

| Metrik | Definisi | Target / Penggunaan |
| :---- | :---- | :---- |
| Tingkat partisipasi alokasi | Pengguna login yang menyimpan alokasi / total pengguna login | Mengukur daya tarik fitur pembeda |
| Usulan terverifikasi | Usulan Disetujui / total usulan masuk | Mengukur kualitas usulan dan beban moderasi |
| Gap terbesar | Nilai absolut selisih persen terbesar antar kategori | Materi utama presentasi dan evaluasi |
| Waktu moderasi median | Waktu dari usulan dibuat sampai dimoderasi | Mengukur kesiapan operasional admin |
| Penyelesaian loop | Pengguna yang membuka Bandingkan setelah menyimpan alokasi | Mengukur apakah loop inti dipahami |

## **13.3 Kriteria keberhasilan lomba**

Untuk keperluan penilaian, keberhasilan MVP tidak diukur dari jumlah fitur terbanyak, melainkan dari tiga hal: loop inti dapat didemokan tanpa hambatan, halaman Bandingkan menghasilkan insight yang dapat dibaca juri dalam hitungan detik, dan seluruh angka yang tampil dapat dijelaskan sumber serta cara hitungnya. Jika harus memilih antara menambah fitur baru dan memperkokoh tiga hal tersebut, yang dipilih adalah memperkokoh ketiganya.

# **14\. Roadmap dan Fase Pembangunan**

| Fase | Fokus | Hasil Akhir Fase |
| :---- | :---- | :---- |
| Fase 1 — Fondasi | Repo, Supabase, Auth, skema, RLS, seed APBD 1 kota \+ 20 usulan | Login berfungsi, data awal tampil, aturan akses teruji |
| Fase 2 — Inti Warga | CRUD usulan, peta, voting, komentar, Usulan Saya | Warga dapat mengusulkan dan mendukung usulan secara penuh |
| Fase 3 — Pembeda | Simulator alokasi, agregasi, halaman Bandingkan | Gap Warga–APBD tampil dan berubah mengikuti alokasi baru |
| Fase 4 — Akuntabilitas | Linimasa status, dashboard admin, polish, data demo, latihan demo | Moderasi dan pelacakan lengkap, demo 2–3 menit siap |

## **14.1 Urutan pengerjaan yang wajib dijaga**

* Skema data dan keseragaman kategori (proposals, allocations, apbd\_items) diselesaikan dan dibekukan sebelum simulator dan halaman Bandingkan dibangun. Perubahan kategori di tengah jalan akan merusak agregasi.  
* FR-08 dan FR-09 tidak ditunda ke akhir. Keduanya dibangun pada Fase 3 dengan waktu khusus untuk pengujian perhitungan persentase.  
* Data contoh ditulis menyerupai usulan warga yang realistis untuk kota terpilih, tersebar pada seluruh kategori dan wilayah, dengan variasi suara dan status, agar peta, daftar, dan grafik tidak tampil kosong atau seragam.

## **14.2 Definisi selesai per fase**

Satu fase dinyatakan selesai hanya jika fitur pada fase tersebut telah diuji terhadap kriteria penerimaannya, data ujinya tersedia, dan tidak ada alur utama dari fase sebelumnya yang rusak. Pengujian minimal mencakup: typecheck, lint, format check, dan build untuk proyek Next.js, ditambah pengujian manual alur utama pada peramban desktop dan tampilan ponsel.

# **15\. Risiko, Asumsi, dan Mitigasi**

| Risiko / Asumsi | Dampak | Mitigasi |
| :---- | :---- | :---- |
| Data APBD kota terpilih sulit diperoleh atau tidak per kategori | Halaman Bandingkan tidak memiliki pembanding yang sah | Pilih kota berdasarkan ketersediaan data pada awal Fase 1; jika perlu, gunakan rincian program dalam dokumen APBD terbuka dan petakan ke kategori Lampiran B dengan metode yang dicatat |
| Cold start: belum ada usulan, suara, dan alokasi nyata | Platform tampil kosong dan gap tidak bermakna saat demo | Seed 20 usulan realistis \+ data partisipan demo; labeli dengan jujur sebagai data contoh bila ditanya juri |
| Spam dan usulan tidak serius | Kualitas data publik menurun, beban moderasi naik | Moderasi wajib sebelum tampil publik, penolakan dengan alasan, admin dapat menghapus komentar |
| Satu orang membuat banyak akun untuk memperbesar suara/alokasi | Agregat terdistorsi | MVP menerima risiko ini secara sadar (tanpa verifikasi NIK); nyatakan sebagai keterbatasan dan arah pengembangan, jangan diklaim sebagai sistem resmi |
| Kategori tidak konsisten antar tabel | Perbandingan menjadi tidak valid | Daftar kategori tunggal pada Lampiran B, ditegakkan dengan enum/check constraint dan pilihan dropdown, bukan teks bebas |
| Perhitungan persentase salah | Insight utama produk menjadi keliru di depan juri | Uji agregasi dengan dataset hitungan manual yang diketahui hasilnya sebelum demo; tampilkan jumlah partisipan dan total sebagai alat cek silang |
| Tile peta atau layanan Supabase terganggu saat demo | Demo terhenti | Siapkan tangkapan layar dan rekaman cadangan loop inti; daftar usulan tetap berfungsi tanpa peta |

## **15.1 Asumsi yang mendasari PRD ini**

* Tim memiliki akun dan akses untuk membuat proyek Supabase serta menerapkan deployment web, dan terbiasa dengan Next.js, Tailwind CSS, serta PostgreSQL.  
* Juri dan audiens demo memiliki koneksi internet dan peramban modern. Demo cadangan luring disiapkan sebagai mitigasi, bukan sebagai mode produk.  
* Nilai anggaran virtual per pengguna adalah parameter konfigurasi produk untuk keperluan simulasi. Nilai pastinya difinalkan sebelum rilis dan ditampilkan secara transparan pada halaman simulator beserta penjelasannya.

# **16\. Naskah Demo dan Kriteria Penerimaan Rilis**

## **16.1 Naskah demo (2–3 menit)**

1. Landing (20 detik). Tunjukkan statistik partisipasi dan jelaskan dalam satu kalimat: warga tidak hanya melihat APBD, tetapi ikut mengalokasikan dan membandingkan.  
2. Jelajahi Usulan (30 detik). Buka peta, saring satu kategori, dan buka satu usulan dari penandanya.  
3. Detail dan Voting (25 detik). Tunjukkan estimasi biaya dan linimasa status, lalu berikan suara pada usulan tersebut.  
4. Alokasi Anggaran (40 detik). Geser beberapa slider, tunjukkan sisa anggaran yang berubah secara langsung, lalu simpan alokasi.  
5. Bandingkan (40 detik). Tunjukkan grafik Warga vs APBD, tunjuk pada gap terbesar, dan bacakan kalimat penjelasannya. Akhiri dengan sumber dan tahun APBD yang tercantum pada halaman.  
6. Akuntabilitas (15 detik, jika waktu tersedia). Kembali ke detail usulan dan tunjukkan bahwa statusnya dapat dilacak publik sampai Selesai.

## **16.2 Checklist penerimaan rilis MVP**

* Seluruh fitur Must (FR-01 sampai FR-06, FR-08, FR-09, FR-10) lulus kriteria penerimaannya.  
* Data APBD satu kota dan satu tahun telah dimuat, sumbernya tercantum, dan persentase hasil hitungnya telah diverifikasi dengan perhitungan manual.  
* Seed 20 usulan tampil pada peta dan daftar, tersebar lintas kategori, dan setidaknya beberapa usulan memiliki status lanjutan selain Diajukan.  
* Loop demo Bab 16.1 dapat diselesaikan dalam tiga menit pada perangkat yang akan digunakan untuk presentasi, termasuk pada jaringan di lokasi lomba atau rekaman cadangannya.  
* Akun demo warga dan akun demo admin telah dibuat, diuji masuk, dan kredensialnya disimpan oleh tim (tidak ditulis pada dokumen publik ini).  
* Tidak ada kunci rahasia (service role, kata sandi basis data) yang terdapat pada repositori atau kode sisi klien.  
* Typecheck, lint, format check, dan build proyek lulus tanpa kesalahan.

## **16.3 Arah pengembangan setelah MVP**

* Multi-kota dan multi-tahun dengan pemilih wilayah dan perbandingan antar tahun maupun antar daerah.  
* Ekspor ringkasan gap dan usulan prioritas sebagai laporan yang dapat dibagikan kepada perangkat daerah.  
* Notifikasi perubahan status kepada pembuat usulan melalui email.  
* Klastering usulan serupa untuk mengurangi duplikasi dan menggabungkan dukungan.  
* Integrasi data realisasi APBD sehingga perbandingan dapat diperluas dari alokasi rencana menjadi alokasi dibandingkan realisasi.

Arah pengembangan di atas dicatat agar juri dapat melihat kelanjutan produk, tetapi tidak satu pun menjadi syarat rilis MVP dan tidak boleh mengambil sumber daya dari penyelesaian fitur Must.

# **Lampiran A — Glosarium**

| Istilah | Arti dalam Dokumen Ini |
| :---- | :---- |
| Musrenbang | Musyawarah Perencanaan Pembangunan, forum perencanaan pembangunan berjenjang di Indonesia |
| APBD | Anggaran Pendapatan dan Belanja Daerah, anggaran tahunan pemerintah daerah |
| Usulan | Program pembangunan yang diajukan warga melalui platform (proposal) |
| Alokasi Virtual | Pembagian anggaran simulasi oleh warga, bukan anggaran yang sebenarnya |
| Gap Warga–APBD | Selisih persentase alokasi warga dan persentase APBD pada kategori yang sama |
| Moderasi | Peninjauan admin sebelum usulan tampil publik: Menunggu, Disetujui, Ditolak |
| Linimasa Status | Urutan riwayat tahapan usulan dari Diajukan sampai Selesai |
| Seed | Data awal yang dimuat untuk keperluan demo dan pengujian |
| RLS | Row Level Security, aturan akses data pada tingkat baris di PostgreSQL/Supabase |
| MVP | Minimum Viable Product, versi terkecil yang sudah dapat didemokan secara utuh |

# **Lampiran B — Daftar Kategori Anggaran Resmi**

Daftar ini digunakan secara identik pada usulan, alokasi virtual, dan data APBD. Penambahan atau pengubahan kategori setelah Fase 1 memerlukan pemutakhiran data pada ketiga tempat tersebut dan pengujian ulang halaman Bandingkan.

* Infrastruktur dan Jalan — perbaikan dan pembangunan jalan, jembatan, dan trotoar.  
* Pendidikan — fasilitas sekolah, perpustakaan, dan dukungan belajar.  
* Kesehatan — puskesmas, layanan kesehatan lingkungan, dan fasilitas kesehatan.  
* Lingkungan dan Sampah — pengelolaan sampah, ruang terbuka hijau, dan kebersihan.  
* Air Bersih dan Drainase — drainase, pencegahan banjir, dan akses air bersih.  
* Transportasi Publik — halte, angkutan umum, dan keselamatan lalu lintas.  
* Keamanan dan Penerangan — penerangan jalan umum dan keamanan lingkungan.  
* Ekonomi dan UMKM — pasar, pelatihan, dan dukungan usaha kecil.  
* Sosial dan Budaya — bantuan sosial, kegiatan komunitas, dan fasilitas budaya.  
* Teknologi dan Layanan Digital — layanan publik digital dan infrastruktur konektivitas.

| Pemetaan APBD: Jika struktur APBD kota terpilih menggunakan pengelompokan yang berbeda, lakukan pemetaan satu kali dari kategori resmi APBD ke daftar di atas, catat tabel pemetaannya sebagai bagian dari seed, dan gunakan hasil pemetaan itu secara konsisten. Jangan mengubah nama kategori secara ad hoc pada data. |
| :---- |

# **Lampiran C — Tahapan Status Usulan**

| Urutan | Status | Arti |
| :---- | :---- | :---- |
| 1 | Diajukan | Usulan baru dibuat warga, menunggu atau sudah melewati moderasi awal |
| 2 | Diverifikasi | Admin telah memeriksa dan menyatakan usulan layak dan valid |
| 3 | Masuk APBD | Usulan tercantum atau terakomodasi dalam perencanaan anggaran |
| 4 | Dikerjakan | Program sedang dilaksanakan di lapangan |
| 5 | Selesai | Program selesai dilaksanakan dan dapat diverifikasi hasilnya |
| — | Ditolak | Usulan tidak dilanjutkan, disertai alasan yang dapat dibaca pembuatnya |

# **Lampiran D — Pendalaman Persona dan Peta Perjalanan Pengguna**

*Lampiran ini memperdalam Bab 5 (Pengguna dan Persona) dan Bab 7 (User Journey dan Alur Utama). Isinya tiga hal: satu persona tambahan yang mewakili warga dengan literasi digital terbatas, perincian kebutuhan dan frustrasi setiap persona beserta implikasi desainnya, dan peta perjalanan pengguna yang memuat aksi, perasaan, titik nyeri, dan peluang perbaikan pada setiap tahap. Peta perjalanan pada lampiran ini adalah hipotesis desain awal yang disusun dari karakter pengguna Musrenbang pada umumnya, dan akan divalidasi melalui uji coba pada bagian D.4.*

## **D.1 Persona tambahan: warga senior dengan literasi digital terbatas**

### **Persona 4 — Darma, 62 tahun, pensiunan dan warga senior**

*Darma tinggal di lingkungan yang sama dengan Sari dan Budi. Ia peduli pada kebutuhan lingkungannya, terutama penerangan jalan dan layanan posyandu, tetapi penglihatannya sudah menurun dan ia tidak terbiasa mengisi formulir digital yang panjang. Ia memakai ponsel Android lama dengan kuota terbatas, lebih percaya penjelasan dari pengurus RT dibanding teks di layar, dan cepat ragu saat menemukan istilah yang tidak ia kenal. Jika sebuah alur terasa rumit, ia memilih tidak ikut serta dan menitipkan suaranya ke orang lain, sehingga suara kelompoknya hilang dari data.*

* *Tujuan utama: memastikan kebutuhan lingkungannya ikut tercatat tanpa harus datang ke forum dan tanpa bergantung penuh pada orang lain.*  
* *Frustrasi: istilah anggaran yang asing, teks yang kecil, dan takut salah menekan tombol karena tidak tahu cara membatalkannya.*  
* *Kebutuhan dari platform: bahasa sehari-hari dengan penjelasan istilah di tempat, teks besar dan kontras tinggi, langkah yang sedikit, serta konfirmasi yang jelas sebelum usulan terkirim.*  
* *Implikasi desain: mode teks besar, glosarium istilah yang muncul saat istilah disentuh, target sentuh yang besar, dan ringkasan akhir sebelum kirim. Jalur pendampingan oleh pengurus RT tetap diakui sebagai cara masuk yang sah untuk kelompok ini.*

## **D.2 Perincian kebutuhan per persona**

### **Persona 1 — Sari (warga pengusul)**

* *Tujuan utama: mengusulkan perbaikan di lingkungannya di luar jam kerja, dalam waktu singkat dari ponsel.*  
* *Frustrasi: forum Musrenbang diadakan pada jam kerja, dan usulan lisan di forum tidak pernah jelas kelanjutannya.*  
* *Kebutuhan dari platform: formulir usulan yang ringkas, draf yang tersimpan otomatis, dan pemberitahuan setiap kali status usulannya berubah.*  
* *Implikasi desain: pembuatan usulan ditargetkan selesai di bawah lima menit, linimasa status tampil menonjol di detail usulan, dan notifikasi status menjadi fitur pendukung sejak MVP.*

### **Persona 2 — Budi (ketua RT dan penggerak warga)**

* *Tujuan utama: membawa bukti bahwa kebutuhan lingkungannya adalah prioritas bersama, bukan pendapat pribadi, ke forum resmi.*  
* *Frustrasi: usulan antarlingkungan bersaing tanpa data pendukung, sehingga pihak yang paling vokal yang didengar.*  
* *Kebutuhan dari platform: halaman perbandingan warga vs APBD dan agregat per wilayah yang mudah dibagikan dan ditunjukkan saat rapat.*  
* *Implikasi desain: tombol bagikan pada usulan dan halaman Bandingkan, tampilan ringkasan yang rapi di layar besar, dan ekspor ringkasan agregat untuk bahan rapat.*

### **Persona 3 — Ratna (admin dan verifikator)**

* *Tujuan utama: menjaga antrean moderasi tetap bersih dan status usulan selalu akurat dengan usaha seminimal mungkin.*  
* *Frustrasi: usulan duplikat dan spam, usulan yang memuat data pribadi, serta pembaruan status yang harus dicatat ulang secara manual.*  
* *Kebutuhan dari platform: penanda kemungkinan duplikat, tindakan setujui dan tolak yang cepat beserta catatan, dan riwayat status yang tertulis otomatis.*  
* *Implikasi desain: antrean moderasi dapat disaring per kategori dan wilayah, penolakan wajib beralasan, dan impor data APBD dari berkas resmi untuk mengurangi entri manual berulang.*

## **D.3 Peta perjalanan pengguna**

*Tahapan yang dipakai untuk semua persona: Menemukan, Memulai, Berpartisipasi, Memantau, dan Kembali. Setiap tahap dicatat dalam empat hal: aksi pengguna, yang dirasakan, titik nyeri, dan peluang desain.*

### **Perjalanan Sari: mengusulkan perbaikan jalan**

* *Tahap Menemukan. Aksi: membaca pengumuman di grup warga dan membuka tautan. Yang dirasakan: penasaran, tetapi skeptis karena merasa usulan warga jarang ditindaklanjuti. Titik nyeri: belum percaya platform ini berbeda dari formulir pengaduan biasa. Peluang: halaman awal langsung menampilkan contoh usulan yang sudah selesai dikerjakan, bukan sekadar janji.*  
* *Tahap Memulai. Aksi: masuk dengan email dan membuka halaman Buat Usulan. Yang dirasakan: lega karena langkahnya sedikit. Titik nyeri: ragu mengisi estimasi biaya karena tidak tahu angka yang wajar. Peluang: contoh estimasi per kategori ditampilkan sebagai panduan, bukan kewajiban.*  
* *Tahap Berpartisipasi. Aksi: mengisi judul, deskripsi, kategori, dan menandai lokasi di peta, lalu mengirim. Yang dirasakan: puas karena selesai dengan cepat. Titik nyeri: menandai lokasi di peta terasa asing pada percobaan pertama. Peluang: lokasi awal diisi dari posisi perangkat dengan izin, dan warga cukup menggeser penanda bila kurang tepat.*  
* *Tahap Memantau. Aksi: membuka kembali usulannya setelah beberapa hari dan membaca linimasa status. Yang dirasakan: tenang bila ada perubahan status beserta catatan admin. Titik nyeri: status yang lama tidak berubah tanpa penjelasan menurunkan kepercayaan. Peluang: catatan admin wajib pada setiap perubahan status, dan perkiraan waktu tahap berikutnya ditampilkan bila tersedia.*  
* *Tahap Kembali. Aksi: memberi suara pada usulan tetangga dan mencoba simulator alokasi. Yang dirasakan: merasa menjadi bagian dari keputusan bersama. Titik nyeri: muncul bila tidak ada usulan atau kabar baru dari wilayahnya. Peluang: halaman awal menampilkan usulan terbaru dari wilayah pengguna lebih dulu.*

### **Perjalanan Budi: membawa data ke forum resmi**

* *Tahap Menemukan. Aksi: mendapat tautan dari rekan pengurus dan membuka halaman Bandingkan tanpa masuk. Yang dirasakan: tertarik karena yang dilihat angka, bukan opini. Titik nyeri: perlu kepastian bahwa angka tersebut resmi sebelum berani mengutipnya. Peluang: sumber dan tahun data APBD selalu tercantum di samping grafik.*  
* *Tahap Memulai. Aksi: masuk dan memeriksa usulan-usulan dari wilayahnya. Yang dirasakan: terbantu karena semua usulan terkumpul di satu tempat. Titik nyeri: usulan lama dan baru bercampur. Peluang: saringan wilayah dan urutan berdasarkan jumlah dukungan tersedia sejak awal.*  
* *Tahap Berpartisipasi. Aksi: membagikan tautan usulan ke grup warga dan mengajak warga mengisi simulator. Yang dirasakan: percaya diri karena ada bahan ajakan yang konkret. Titik nyeri: sebagian warga menunda karena mengira harus mengisi banyak hal. Peluang: pesan ajakan bawaan yang menjelaskan bahwa simulator selesai dalam beberapa menit.*  
* *Tahap Memantau. Aksi: menjelang forum resmi, membuka agregat prioritas wilayahnya. Yang dirasakan: siap berargumen dengan data. Titik nyeri: ringkasan sulit dipakai ulang di luar platform. Peluang: ekspor ringkasan agregat dalam format yang siap dilampirkan pada dokumen usulan resmi.*  
* *Tahap Kembali. Aksi: setelah forum, memeriksa status usulan wilayahnya dan menyampaikan hasilnya ke warga. Yang dirasakan: perannya sebagai penghubung warga terbantu. Titik nyeri: hasil forum yang terjadi di luar platform tidak tercatat. Peluang: catatan admin dapat memuat hasil forum sebagai bagian dari riwayat status.*

### **Perjalanan Darma: ikut serta dengan pendampingan**

* *Tahap Menemukan. Aksi: mendengar penjelasan dari pengurus RT, bukan dari media sosial. Yang dirasakan: ingin ikut, tetapi khawatir tidak bisa mengoperasikannya. Titik nyeri: tidak ada jalur selain membuka aplikasi sendiri. Peluang: penjelasan lisan dan pendampingan pengurus RT diakui dalam panduan penggunaan platform.*  
* *Tahap Memulai. Aksi: membuka platform di ponselnya dengan mode teks besar. Yang dirasakan: terbantu karena tulisan terbaca. Titik nyeri: proses masuk dengan email dan kata sandi terasa berbelit. Peluang: langkah masuk dijaga sesingkat mungkin dan sesi bertahan lama di perangkat yang sama.*  
* *Tahap Berpartisipasi. Aksi: mencoba simulator alokasi karena tampilannya seperti membagi anggaran ke pos-pos kebutuhan. Yang dirasakan: paham lebih cepat lewat praktik dibanding penjelasan. Titik nyeri: angka besar dengan banyak nol membingungkan. Peluang: nominal ditampilkan dalam format ringkas, misalnya dalam juta dan miliar, dengan penjelasan istilah saat disentuh.*  
* *Tahap Memantau. Aksi: menanyakan kabar usulan ke pengurus RT atau membuka halaman status yang sederhana. Yang dirasakan: cukup puas bila tahapannya dijelaskan dengan bahasa sehari-hari. Titik nyeri: istilah tahapan status yang birokratis. Peluang: nama tahapan memakai bahasa warga, selaras dengan pedoman bahasa pada bagian 9.1.*  
* *Tahap Kembali. Aksi: ikut lagi pada periode berikutnya bila pengalaman pertamanya mudah. Yang dirasakan: percaya karena merasa dilibatkan. Titik nyeri: tampilan yang berubah besar antarperiode membuatnya belajar dari awal. Peluang: tampilan dan istilah dijaga konsisten dari satu periode Musrenbang ke periode berikutnya.*

### **Perjalanan Ratna: moderasi dan pemeliharaan data**

* *Tahap Memulai. Aksi: masuk sebagai admin dan membuka antrean moderasi. Yang dirasakan: ingin segera tahu berapa usulan yang menunggu. Titik nyeri: jumlah antrean tidak terlihat dari halaman awal admin. Peluang: ringkasan antrean tampil pertama kali di dasbor admin.*  
* *Tahap Berpartisipasi. Aksi: memeriksa usulan, menyetujui atau menolak dengan catatan, dan menandai kemungkinan duplikat. Yang dirasakan: terbantu bila konteks usulan lengkap dalam satu layar. Titik nyeri: berpindah-pindah halaman untuk memeriksa lokasi dan isi. Peluang: tampilan periksa usulan memuat peta kecil, isi, dan riwayat pengusul dalam satu panel.*  
* *Tahap Memantau. Aksi: memperbarui status usulan yang berjalan dan memeriksa riwayatnya. Yang dirasakan: tenang karena setiap perubahan tercatat otomatis. Titik nyeri: status dari banyak usulan harus diubah satu per satu. Peluang: pembaruan status massal untuk usulan dalam tahap dan program yang sama, dengan catatan yang sama.*  
* *Tahap Kembali. Aksi: memperbarui data APBD saat tahun anggaran berganti dan membuka agregat untuk bahan laporan. Yang dirasakan: terbantu bila impor data berjalan tanpa entri ulang. Titik nyeri: format data sumber berubah antarperiode. Peluang: impor menerima berkas spreadsheet dengan pemetaan kolom yang dapat disesuaikan.*

## **D.4 Rencana validasi perjalanan pengguna**

*Peta perjalanan di atas belum diuji ke pengguna nyata. Agar dapat dipertanggungjawabkan sebagai riset pengguna, tim akan melakukan uji coba terbimbing menggunakan demo interaktif dengan ketentuan berikut.*

* *Peserta: minimal lima warga lintas usia dan latar, termasuk satu warga senior dan satu pengurus RT.*  
* *Tugas yang diujikan: membuat satu usulan, menyusun alokasi pada simulator sampai totalnya pas, dan menemukan kategori dengan selisih terbesar pada halaman Bandingkan.*  
* *Yang dicatat: tugas yang gagal atau membuat peserta ragu, waktu penyelesaian, pertanyaan yang muncul, dan istilah yang tidak dipahami.*  
* *Hasil uji dipakai untuk memperbarui peta perjalanan, memperbaiki pedoman bahasa antarmuka, dan menentukan prioritas perbaikan sebelum pembangunan MVP dimulai.*

*— Akhir dokumen —*

# **Lampiran D: Pembaruan Keputusan Tim (25 Oktober 2026\)**

Lampiran ini mencatat keputusan yang disepakati setelah riset tambahan. Jika ada perbedaan dengan bab sebelumnya, lampiran ini yang berlaku sampai bab terkait diperbarui.

## **D.1 Wilayah MVP**

Wilayah MVP ditetapkan DKI Jakarta (satu APBD provinsi; kota administrasi tidak memiliki APBD sendiri). Cadangan: Kota Depok, jika rincian APBD DKI per urusan tidak dapat diperoleh dari Pergub penjabaran APBD atau apbd.jakarta.go.id. Perluasan ke Jabodetabek dan perbandingan antar daerah menjadi arah pengembangan.

## **D.2 Perbandingan hanya terhadap belanja program**

Persentase APBD pada halaman Bandingkan dihitung hanya dari belanja program. Belanja pegawai, administrasi/penunjang urusan, dan belanja wajib tidak ikut dibandingkan, tetapi ditampilkan terpisah sebagai "belanja rutin" beserta porsinya. Alasannya, warga hanya membagi anggaran untuk program, sehingga perbandingan baru adil jika dasarnya sama. Tabel pemetaan urusan APBD ke 10 kategori dicantumkan di halaman Metodologi.

## **D.3 Posisi terhadap sistem yang sudah ada**

Riset menemukan e-Musrenbang sudah ada di beberapa daerah (Surabaya, Banda Aceh, Bandung, Tangerang Selatan, DKI Jakarta), SIPD wajib dipakai pemda, dan Jakarta memiliki Kanal Aspirasi RPJMD 2025 sampai 2029 serta JakLapor (JAKI) untuk pengaduan. Karena itu fitur usulan, peta, dan pelacakan status bukan pembeda utama. Pembeda utama produk ini adalah simulator anggaran warga dan Gap Warga vs APBD, yang belum ditemukan di Indonesia dalam penelusuran tim (di luar negeri konsep serupa ada, misalnya Balancing Act dan Citizen Budget). Produk diposisikan sebagai pelengkap e-Musrenbang, bukan penggantinya.

## **D.4 Fitur sepanjang tahun: tandai masalah**

Agar web tetap dipakai di luar musim Musrenbang, warga dapat menandai masalah lingkungan (misalnya jalan yang berulang kali rusak) di peta sepanjang tahun. Tanda ini diperlakukan sebagai bahan usulan anggaran, bukan pengaduan. Untuk perbaikan cepat, web mengarahkan warga ke JakLapor. Saat Musrenbang dibuka, tanda yang menumpuk menjadi bukti pendukung usulan.

## **D.5 Fitur tambahan yang disepakati**

Kuis satu pertanyaan "Tebak APBD" sebelum simulator; kartu "Hasil kamu" (kamu vs warga lain vs APBD) setelah menyimpan alokasi; halaman Rapor Tindak Lanjut berlabel simulasi; halaman Metodologi; konversi gap ke rupiah ("kalau APBD mengikuti warga"); dan simulator yang tidak mewajibkan total pas Rp10 juta, dengan slider berhenti otomatis saat sisa habis.

## **D.6 Arah desain**

Layout halaman Simulator: Dua Kolom Kerja (simulator di kiri, hasil di kanan). Gaya bentuk: Bulat Lembut (sudut besar, tombol kapsul). Mode tampilan: terang sebagai default dan mode gelap dengan tombol pengganti. Palet: hijau (opsi spesifik belum dipilih). Desain mengikuti aturan antislop (mode DURING), termasuk kontras teks minimal 4,5:1 di kedua mode. Wireframe seluruh halaman dibuat sebelum desain visual detail.

## **D.7 Data dan validasi**

APBD dan data penduduk memakai data asli bersumber. Usulan, dukungan, dan status di demo adalah data contoh berlabel. Tim mengumpulkan minimal 50 sampai 100 responden asli untuk simulator dan mewawancarai minimal satu narasumber pemerintah (kelurahan, kecamatan, atau Bappeda) sebelum final.

## **D.8 Jadwal lomba**

First Draft: 1 November 2026\. Final Submission: 11 November 2026\. Fokus sebelum First Draft: fondasi data APBD, simulator, dan halaman Bandingkan.

