// Jadwal umum Musrenbang tiap tahun. Tanggal pastinya diumumkan pemerintah daerah, jadi layar
// yang memakainya selalu menyebut bahwa ini jadwal umum.
export const TAHAP_MUSRENBANG = [
  { nama: 'Musrenbang kelurahan', bulan: 'Jan' },
  { nama: 'Musrenbang kecamatan', bulan: 'Feb' },
  { nama: 'Musrenbang kota', bulan: 'Mar' },
  { nama: 'Pembahasan APBD', bulan: 'Mei-Des' },
] as const;

/** Indeks tahap yang sedang berjalan. Sesudah April, usulan sedang dibahas menjadi APBD. */
export function tahapSekarang(tanggal: Date): number {
  const bulan = tanggal.getMonth();
  if (bulan === 0) return 0;
  if (bulan === 1) return 1;
  if (bulan <= 3) return 2;
  return 3;
}

/** Kalimat pendek tentang posisi Musrenbang hari ini, untuk subjudul Beranda. */
export function kalimatTahap(tanggal: Date): string {
  const tahap = tahapSekarang(tanggal);
  const tahunApbd = tanggal.getFullYear() + 1;
  if (tahap === 3) {
    return `Usulan tahun ini sedang dibahas menjadi APBD ${tahunApbd}, biasanya disahkan Desember.`;
  }
  return `${TAHAP_MUSRENBANG[tahap].nama} untuk APBD ${tahunApbd} sedang berjalan.`;
}
