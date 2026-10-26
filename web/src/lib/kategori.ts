/**
 * Kode dua huruf dan deskripsi singkat untuk 10 kategori seed APBD.
 * Nama kategori adalah teks dari database; kategori yang tidak dikenal
 * tetap tampil dengan kode dari dua huruf pertamanya.
 */
type InfoKategori = { kode: string; deskripsi: string };

const KATEGORI: Record<string, InfoKategori> = {
  'Air Bersih dan Drainase': { kode: 'Ai', deskripsi: 'Banjir, saluran, air bersih' },
  'Ekonomi dan UMKM': { kode: 'Ek', deskripsi: 'UMKM, pelatihan kerja' },
  'Infrastruktur dan Jalan': { kode: 'Jl', deskripsi: 'Jalan, jembatan, flyover' },
  'Keamanan dan Penerangan': { kode: 'Km', deskripsi: 'Lampu jalan, keamanan lingkungan' },
  Kesehatan: { kode: 'Ks', deskripsi: 'Puskesmas, BPJS, alat kesehatan' },
  'Lingkungan dan Sampah': { kode: 'Lk', deskripsi: 'Pengelolaan dan bank sampah' },
  Pendidikan: { kode: 'Pd', deskripsi: 'Sekolah, KJP, beasiswa' },
  'Sosial dan Budaya': { kode: 'Sb', deskripsi: 'Lansia, disabilitas, budaya' },
  'Teknologi dan Layanan Digital': { kode: 'Tk', deskripsi: 'Layanan daring, internet publik' },
  'Transportasi Publik': { kode: 'Tr', deskripsi: 'Transjakarta, MRT, LRT' },
};

const URUTAN = Object.keys(KATEGORI);

export function infoKategori(nama: string): InfoKategori & { nada: 'hijau' | 'pasir' } {
  const info = KATEGORI[nama] ?? { kode: nama.slice(0, 2), deskripsi: '' };
  const indeks = URUTAN.indexOf(nama);
  // Kotak kategori bergantian hijau pucat dan pasir, seperti Desain 1 versi terang.
  return { ...info, nada: indeks % 2 === 0 ? 'hijau' : 'pasir' };
}
