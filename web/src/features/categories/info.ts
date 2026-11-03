/**
 * Kode dua huruf, deskripsi singkat, dan ikon garis 24px untuk 10 kategori seed APBD.
 * Nama kategori adalah teks dari database; kategori yang tidak dikenal tetap tampil
 * dengan kode dari dua huruf pertamanya dan ikon kotak umum.
 */
type CategoryInfo = { kode: string; deskripsi: string; ikon: string };

const IKON_UMUM = 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z';

const CATEGORY_INFO: Record<string, CategoryInfo> = {
  'Air Bersih dan Drainase': {
    kode: 'Ai',
    deskripsi: 'Banjir, saluran, air bersih',
    ikon: 'M12 3s6 6.3 6 10.5A6 6 0 0 1 6 13.5C6 9.3 12 3 12 3z',
  },
  'Ekonomi dan UMKM': {
    kode: 'Ek',
    deskripsi: 'UMKM, pelatihan kerja',
    ikon: 'M3 9l2-5h14l2 5M3 9h18M5 9v11h14V9M10 20v-5h4v5',
  },
  'Infrastruktur dan Jalan': {
    kode: 'Jl',
    deskripsi: 'Jalan, jembatan, flyover',
    ikon: 'M8 3 4 21M16 3l4 18M12 5v2M12 11v2M12 17v2',
  },
  'Keamanan dan Penerangan': {
    kode: 'Km',
    deskripsi: 'Lampu jalan, keamanan lingkungan',
    ikon: 'M12 3a6 6 0 0 1 4 10.5V16H8v-2.5A6 6 0 0 1 12 3zM9 19h6M10 22h4',
  },
  Kesehatan: {
    kode: 'Ks',
    deskripsi: 'Puskesmas, BPJS, alat kesehatan',
    ikon: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10zM12 9v4M10 11h4',
  },
  'Lingkungan dan Sampah': {
    kode: 'Lk',
    deskripsi: 'Pengelolaan dan bank sampah',
    ikon: 'M5 19c0-8 6-14 15-14 0 9-6 15-14 15M5 19l7-7',
  },
  Pendidikan: {
    kode: 'Pd',
    deskripsi: 'Sekolah, KJP, beasiswa',
    ikon: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',
  },
  'Sosial dan Budaya': {
    kode: 'Sb',
    deskripsi: 'Lansia, disabilitas, budaya',
    ikon: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M17 20a6 6 0 0 0-3-5',
  },
  'Teknologi dan Layanan Digital': {
    kode: 'Tk',
    deskripsi: 'Layanan daring, internet publik',
    ikon: 'M4 9a12 12 0 0 1 16 0M7 12.5a8 8 0 0 1 10 0M10 16a4 4 0 0 1 4 0M12 19.5h.01',
  },
  'Transportasi Publik': {
    kode: 'Tr',
    deskripsi: 'Transjakarta, MRT, LRT',
    ikon: 'M5 4h14a1 1 0 0 1 1 1v11H4V5a1 1 0 0 1 1-1zM4 11h16M7 16v3M17 16v3M7.5 13.5h.01M16.5 13.5h.01',
  },
};

const WARNA: Record<string, { latar: string; kuat: string }> = {
  'Air Bersih dan Drainase': { latar: '#BFE8D0', kuat: '#0E7C55' },
  'Ekonomi dan UMKM': { latar: '#F6D98B', kuat: '#9A6F00' },
  'Infrastruktur dan Jalan': { latar: '#F5C79B', kuat: '#B35C0E' },
  'Keamanan dan Penerangan': { latar: '#D9CCF0', kuat: '#5B3FA0' },
  'Kesehatan': { latar: '#F5B9B0', kuat: '#B03A32' },
  'Lingkungan dan Sampah': { latar: '#D3E8A3', kuat: '#4F7A12' },
  'Pendidikan': { latar: '#A9E0DC', kuat: '#0F6B66' },
  'Sosial dan Budaya': { latar: '#F2C4DB', kuat: '#9B3F6E' },
  'Teknologi dan Layanan Digital': { latar: '#C9D4DC', kuat: '#3D5566' },
  'Transportasi Publik': { latar: '#EDB59E', kuat: '#A94423' },
};
const WARNA_UMUM = { latar: '#E4DFD2', kuat: '#5A5648' };

const ORDER = Object.keys(CATEGORY_INFO);

export function getCategoryInfo(
  nama: string,
): CategoryInfo & { tone: 'hijau' | 'pasir'; warna: { latar: string; kuat: string } } {
  const info = CATEGORY_INFO[nama] ?? {
    kode: nama.slice(0, 2),
    deskripsi: '',
    ikon: IKON_UMUM,
  };
  // Kotak kategori bergantian hijau pucat dan pasir, seperti Desain 1 versi terang.
  return {
    ...info,
    tone: ORDER.indexOf(nama) % 2 === 0 ? 'hijau' : 'pasir',
    warna: WARNA[nama] ?? WARNA_UMUM,
  };
}
