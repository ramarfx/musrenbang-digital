# Handoff Backend untuk Tim Frontend

Dokumen ini menjelaskan kontrak backend yang ada, perbedaan remote dan migration
lokal, serta pekerjaan yang memerlukan keputusan produk. Status terakhir dicatat
pada 27 Oktober 2026. Tidak ada kredensial atau data pribadi dalam dokumen ini.

## Status environment

- Proyek development yang diizinkan: `musrenbang-digital-backend`, ref
  `dogyibbzwfslspflsidm`.
- Remote memiliki enam migration fondasi dan security hardening. Migration
  `20261027065525_mvp_public_stats_status_audit.sql` hanya lokal dan belum disetujui
  untuk deployment.
- Kesiapan deployment migration 7: **NOT READY FOR REMOTE DEPLOYMENT**. Frontend
  masih memanggil RPC status dua parameter, sedangkan migration 7 mewajibkan catatan.
  Kontrak frontend harus disesuaikan dan diuji sebelum migration dipasang.
- Preflight remote read-only terakhir memastikan project/API target, signup aktif,
  provider email aktif, dan konfirmasi email diwajibkan. Tidak ada akun atau fixture
  remote dibuat.
- `SITE_URL`, redirect allowlist, rincian SMTP, rate limit, dan fingerprint lengkap
  remote belum diverifikasi. Lihat `REMOTE_INTEGRATION_TESTING.md`.
- Pengujian tulis remote berstatus **WAITING FOR APPROVAL**.

## Validasi lokal terakhir

- Supabase Auth, PostgREST, Mailpit, RLS, RPC, concurrency HTTP, dan cleanup:
  **243 lulus, 0 gagal**.
- SQL assertions dengan tujuh migration di satu transaksi yang diakhiri rollback:
  **153 lulus, 0 gagal**; postcheck memastikan tidak ada tabel atau akun fixture yang tertinggal.
- Unit tests: **51 lulus, 129 assertions**. Typecheck, lint, format terarah, dan build lulus.
- Pemeriksaan format seluruh repository masih menemukan 103 file. Semua file formatable
  dalam delta ini lulus pemeriksaan terarah; file di luar cakupan tidak diformat massal.
- Ini semua pengujian lokal. Pengujian tulis remote belum pernah dijalankan.

## Auth dan profil

Browser menggunakan Supabase Auth dan anon/publishable key dari environment `VITE_*`.
Password dan token hanya dikelola `supabase-js`; jangan menyalinnya ke API aplikasi,
log, atau tabel sendiri.

Alur warga:

1. `supabase.auth.signUp({ email, password, options: { data: { nama } } })`.
2. Dengan konfirmasi email aktif, pengguna membuka tautan email sebelum login.
3. `supabase.auth.signInWithPassword({ email, password })`.
4. Trigger Auth membuat `profiles` dengan role `warga`; metadata tidak dapat
   menentukan `peran`.
5. Refresh token/logout memakai metode `supabase.auth.refreshSession()` dan
   `supabase.auth.signOut()`.

Admin tidak dibuat melalui `user_metadata` atau `app_metadata`. Provisioning role
admin adalah tindakan operator tepercaya setelah identitas Auth diverifikasi; jangan
berikan hak tersebut melalui endpoint browser.

## Matriks akses aplikasi

| Sumber                               | Anon                                  | Warga                                                                                | Admin                                                    |
| ------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `profiles`                           | tidak dapat membaca                   | baca profil sendiri, ubah nama sendiri                                               | baca semua; perubahan role bukan dari API                |
| `categories`, `config`, `apbd_items` | baca                                  | baca                                                                                 | kelola; migration lokal 7 menambah guard provenance APBD |
| `proposals`                          | usulan `Disetujui`                    | usulan disetujui dan milik sendiri; buat/edit milik sendiri saat moderasi `Menunggu` | baca dan kelola semua                                    |
| `v_proposals`                        | hanya usulan yang dapat dibaca publik | publik + milik sendiri                                                               | semua                                                    |
| `votes`                              | tidak dapat membaca                   | suara sendiri; satu suara per proposal; hanya proposal disetujui                     | baca semua untuk moderasi                                |
| `comments`, `v_comments`             | komentar pada proposal terlihat       | komentar pada proposal terlihat; insert sebagai diri sendiri pada proposal disetujui | moderasi/hapus sesuai policy                             |
| `proposal_status_history`, view-nya  | hanya riwayat proposal terlihat       | riwayat publik + proposal sendiri                                                    | baca semua; tulis melalui jalur status tepercaya         |
| `allocations`                        | tidak dapat membaca                   | baca alokasi sendiri; simpan lewat RPC saja                                          | baca semua; tulis langsung tetap ditolak                 |
| `v_gap`, `v_public_stats`            | agregat publik tanpa ID pengguna      | agregat yang sama                                                                    | agregat yang sama                                        |
| `v_admin_stats` (migration lokal 7)  | tidak tersedia                        | hasil kosong/ditolak oleh policy                                                     | statistik operasional admin                              |

Policy database adalah otoritas. Guard frontend hanya membantu pengalaman pengguna.
`private` tidak boleh dimasukkan ke exposed schemas PostgREST.

## Kontrak API yang digunakan

Semua jalur PostgREST memakai anon/publishable key di header `apikey`; request
terautentikasi memakai JWT Supabase pada `Authorization: Bearer <access-token>`.
Jangan menaruh service-role/secret key di browser.

### Membaca usulan dan riwayat

- `GET /rest/v1/v_proposals?select=*` — daftar dan detail; RLS menyaring moderasi.
- `GET /rest/v1/v_comments?proposal_id=eq.<id>&select=*` — nama penulis aman tanpa
  email atau `user_id` publik.
- `GET /rest/v1/v_proposal_status_history?proposal_id=eq.<id>&select=*` — riwayat
  untuk proposal yang boleh dibaca.
- `GET /rest/v1/v_gap?select=*` — baris agregat per kategori.
- Migration lokal 7 menambah `jumlah_partisipan` dan `apbd_tersedia` pada `v_gap`.
  Client harus memeriksa `apbd_tersedia`; nilai `persen_apbd = 0` saat tidak tersedia
  bukan bukti bahwa alokasi APBD kategori memang nol.
- Client juga perlu menyembunyikan angka/persentase warga dan sorotan gap saat
  `jumlah_partisipan = 0`, sesuai FR-09; nilai nol pada kolom view adalah nilai
  komputasi, bukan partisipasi warga.
- Migration lokal 7 menambah `v_public_stats` dan admin-only `v_admin_stats`. View
  ini belum dipakai oleh client saat ini.
- Untuk kartu “Hasil kamu”, klien dapat membaca alokasi pengguna yang sedang masuk
  melalui tabel `allocations` (RLS hanya mengembalikan miliknya) lalu menggabungkannya
  dengan total kategori pada `v_gap`. Dengan metodologi rasio jumlah nominal, total
  warga lain per kategori adalah `total_alokasi_warga - alokasi_pengguna`; jumlah
  warga lain mengurangi `jumlah_partisipan` satu hanya jika pengguna tersebut memiliki
  set alokasi aktif. Jangan tampilkan pembagi nol. Rumus final tetap menunggu keputusan
  FR-09 vs Bab 10.2.
- Untuk konversi “kalau APBD mengikuti warga”, gunakan
  `gap_poin_persen / 100 * total belanja program terverifikasi`. `total belanja program`
  adalah jumlah `nominal_apbd` di `v_gap`; jangan lakukan konversi bila
  `apbd_tersedia` false. Nilai ini tidak mencakup belanja rutin.

### Membuat dan memoderasi proposal

- `POST /rest/v1/proposals` memakai JWT warga; database memaksa tahap `Diajukan`,
  moderasi `Menunggu`, pemilik dari `auth.uid()`, dan waktu dari database.
- Update isi hanya diizinkan untuk pemilik selama moderasi `Menunggu`. Klien tidak
  boleh mengubah pemilik, status, waktu, atau field moderasi.
- `POST /rest/v1/rpc/moderate_proposal` dengan payload:

```json
{
  "p_proposal_id": 123,
  "p_moderasi": "Disetujui",
  "p_catatan": null
}
```

Nilai moderasi: `Menunggu`, `Disetujui`, `Ditolak`. `Ditolak` wajib memiliki alasan
1–2000 karakter. Identitas dan waktu admin diisi database.

### Status kemajuan dan catatan audit

Remote enam migration masih menyediakan `change_proposal_status(p_proposal_id,
p_status)`. Kandidat migration lokal 7 menambahkan:

```json
{
  "p_proposal_id": 123,
  "p_status": "Diverifikasi",
  "p_catatan": "Dokumen dan lokasi telah diperiksa."
}
```

Kirim payload tersebut ke
`POST /rest/v1/rpc/change_proposal_status_with_note`. Catatan wajib 1–2000 karakter;
database menulis status dan riwayat dalam satu transaksi. Status yang diizinkan:
`Diajukan`, `Diverifikasi`, `Masuk APBD`, `Dikerjakan`, `Selesai`.

`web/src/features/admin/api.ts` saat ini masih memanggil RPC lama tanpa catatan.
Migration 7 mempertahankan nama RPC lama tetapi menolak pemanggilan dengan SQLSTATE
`22023`. Tim frontend perlu menambahkan input catatan admin dan memanggil RPC baru
sebelum migration tersebut dipasang. Backend tidak mengubah frontend pada tahap ini.

### Voting, komentar, dan alokasi

- Voting: `POST /rest/v1/votes` dengan `proposal_id`; `user_id` harus mengikuti
  identitas JWT. Constraint unik mencegah suara ganda. Warga dapat membatalkan
  suaranya sendiri.
- Komentar: `POST /rest/v1/comments` dengan `proposal_id` dan `isi`; database
  menentukan `user_id` dari JWT. Akses komentar mengikuti visibilitas proposal.
- Alokasi: `POST /rest/v1/rpc/save_allocations` dengan `p_rows`, array objek
  `{ "kategori": "Pendidikan", "jumlah": 1000000 }`. RPC mengganti seluruh set
  aktif secara atomik, memvalidasi kategori dan batas anggaran virtual Rp10.000.000.
  Jangan menulis langsung ke tabel `allocations`.

Error yang mungkin muncul di PostgREST: `42501` akses tidak sah/RLS, `22023` payload
atau status tidak valid, `23514` constraint, `23505` duplikasi suara, dan `P0002`
proposal tidak ditemukan. Respons 200 dengan array kosong dapat berarti policy
menyaring baris; periksa isi, bukan status HTTP saja.

## APBD, provenance, dan batas data

Migration lokal 7 menambah `sumber_url` dan `catatan_pemetaan`. Nilai
`verified_program` memerlukan sumber tekstual dan URL, dan hanya baris dengan status
tersebut yang masuk sisi APBD `v_gap`. View juga membatasi data ke kota/tahun pada
`config`. Item lama yang tidak memiliki URL diturunkan ke `perlu_lampiran` tanpa
menghapus baris atau mengubah nominal.

CSV seed berisi delapan nominal riset awal dan dua kategori tanpa nominal. Semua
berstatus `perlu_lampiran`; dua baris kosong dilewati seed. Tautan yang sekarang ada
menunjuk halaman ringkasan APBD, bukan bukti langsung setiap pemetaan program. Nilai
belum layak disebut komposisi APBD program terverifikasi.

Referensi primer yang diperiksa:

- [APBD Jakarta 2026](https://www.jakarta.go.id/index.php/apbd-jakarta-2026) menyebut
  Perda 4/2025 dan postur APBD murni.
- [Pergub 10/2026 pada JDIH DKI](https://jdih.jakarta.go.id/index.php/dokumen/detail/14929)
  mengubah penjabaran Pergub 44/2025 dan tercatat berstatus berlaku.
- [Persetujuan Ranperda Perubahan APBD 2026](https://www.jakarta.go.id/siaran-pers/7052-SP-HMS-09-2026)
  melaporkan persetujuan DPRD pada 22 September 2026. Bahan resmi final dan rincian
  per program belum dipastikan dari halaman yang diperiksa.
- [SmartAPBD 2026](https://apbd.jakarta.go.id/landingpage/tahun/2026) menampilkan
  rincian belanja; pemetaan resmi ke sepuluh kategori produk belum selesai.

PRD D.2 mengharuskan belanja rutin/administratif dipisahkan dari belanja program.
Backend saat ini belum memiliki jenis belanja dan model/view khusus untuk menampilkan
total rutin beserta porsinya. Jangan mengisi angka dengan total belanja daerah atau
mencampurnya ke denominator program.

Kontrak yang disarankan untuk dibahas adalah sumber terpisah berindeks kota/tahun
yang menyimpan total atau komponen belanja rutin, nominal, sumber, URL, dan status
verifikasi; read model publik kemudian mengembalikan total program, total rutin,
persentase rutin, dan flag ketersediaan masing-masing. Tabel kategori program tetap
terpisah agar nominal rutin tidak masuk `v_gap`. Ini belum diimplementasikan karena
struktur lampiran APBD final dan pemetaan komponen rutin belum diverifikasi.

## Keputusan produk yang masih terbuka

1. **Metodologi agregat warga.** FR-09 menyebut rata-rata alokasi pengguna, sedangkan
   Bab 10.2 secara eksplisit menjumlah nominal per kategori sebelum menghitung
   persentase. D.5 mengizinkan alokasi parsial, sehingga kedua cara dapat berbeda.
   Rasio jumlah nominal saat ini mengikuti langkah rinci Bab 10.2. Contoh: satu orang
   mengalokasikan Rp10 juta ke A dan satu orang Rp1 juta ke B menghasilkan rasio
   jumlah 90,91%/9,09%, sedangkan rata-rata persentase per orang 50%/50%. Jangan ubah
   rumus sebelum pemilik produk mengklarifikasi apakah FR-09 atau Bab 10.2 yang
   mengatur perilaku final.
2. **Privasi agregat.** Ambang partisipan menahan statistik sampai ukuran kelompok
   memadai, tetapi menunda insight awal dan tidak sepenuhnya mencegah serangan beda
   dua snapshot ketika peserta baru masuk. Snapshot periodik/final mengurangi
   perubahan real-time, tetapi tetap memerlukan aturan pembukaan dan dapat tertinggal.
   Penundaan mengurangi pengamatan beruntun namun tidak menghilangkan inferensi saat
   data dibuka. Pengurangan presisi/granularitas mengurangi detail tetapi tidak
   meniadakan inferensi lintas kategori. Differential privacy memberi batas formal
   pada kebocoran, tetapi membutuhkan mekanisme noise, anggaran privasi, dan audit
   berulang. Keputusan publikasi dan ambang belum ditetapkan.
3. **Belanja rutin.** Perlu konfirmasi struktur data, definisi komponen rutin, dan
   sumber resmi yang akan dipakai.
4. **Penanda masalah sepanjang tahun (PRD D.4).** Belum ada tabel/API. Sebelum dibuat,
   perlu aturan visibilitas, moderasi, duplikasi, lokasi presisi, retensi, dan
   hubungan ke proposal supaya penanda tidak otomatis dianggap usulan terverifikasi.
5. **Kebijakan status.** PRD mengharuskan catatan admin pada transisi status. Catatan
   dan RPC sudah disiapkan lokal, tetapi client perlu mendukung payload baru.

Pengujian minimal 50–100 responden dan wawancara satu narasumber pemerintah pada PRD
D.7 adalah pekerjaan validasi produk, bukan hasil yang dapat dibuktikan oleh test
database.

## Perintah pengujian lokal

```powershell
pwsh -NoProfile -File scripts/test-backend.ps1
pwsh -NoProfile -File scripts/test-integration.ps1 -EnvironmentSuffix mvp
bun test
bun run typecheck
bun run lint
```

`test-backend.ps1` menjalankan SQL assertion pada satu koneksi dan transaksi yang
diakhiri `ROLLBACK`. Integration runner memakai Auth/PostgREST lokal, Mailpit,
JWT sungguhan dari Auth lokal, concurrency HTTP, dan fixture cleanup. Tidak satu pun
perintah tersebut mengakses remote. Untuk status remote dan prosedur tulis yang
belum disetujui, rujuk `REMOTE_INTEGRATION_TESTING.md`.
