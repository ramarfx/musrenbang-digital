import { allocateByWeights } from './lib';

/** Jumlah koin yang dibagi warga, dan berapa persen pilihan tiap koin. */
export const JUMLAH_KOIN = 10;
export const PERSEN_PER_KOIN = 100 / JUMLAH_KOIN;
/** Berapa bidang yang dipilih warga sebagai prioritas. */
export const BATAS_PILIHAN = 3;

export type Koin = Record<string, number>;

export function totalKoin(koin: Koin): number {
  return Object.values(koin).reduce((jumlah, nilai) => jumlah + nilai, 0);
}

export function sisaKoin(koin: Koin): number {
  return JUMLAH_KOIN - totalKoin(koin);
}

/** Pembagian awal yang rata; sisa pembulatan jatuh ke bidang pertama (mis. 4, 3, 3). */
export function bagiRata(pilihan: readonly string[]): Koin {
  if (pilihan.length === 0) return {};
  return (
    allocateByWeights(
      pilihan,
      Object.fromEntries(pilihan.map((nama) => [nama, 1])),
      JUMLAH_KOIN,
      1,
    ) ?? {}
  );
}

/** Mengubah koin satu bidang tanpa pernah di bawah nol atau melebihi sisa koin. */
export function ubahKoin(koin: Koin, kategori: string, selisih: number): Koin {
  const sekarang = koin[kategori] ?? 0;
  const lain = totalKoin(koin) - sekarang;
  const baru = Math.max(0, Math.min(sekarang + selisih, JUMLAH_KOIN - lain));
  return { ...koin, [kategori]: baru };
}

/**
 * Mengubah koin jadi alokasi rupiah untuk semua kategori (bidang yang tidak dipilih bernilai nol),
 * memakai anggaran virtual dan kelipatan yang sama dengan penyimpanan alokasi yang sudah ada.
 */
export function koinKeAlokasi(
  semuaKategori: readonly string[],
  koin: Koin,
  anggaran: number,
  kelipatan: number,
): { kategori: string; jumlah: number }[] {
  const bobot = Object.fromEntries(semuaKategori.map((nama) => [nama, koin[nama] ?? 0]));
  const hasil = allocateByWeights(semuaKategori, bobot, anggaran, kelipatan);
  return semuaKategori.map((kategori) => ({ kategori, jumlah: hasil?.[kategori] ?? 0 }));
}

/**
 * Membaca alokasi tersimpan menjadi pilihan dan koin. Hanya alokasi yang berisi paling banyak
 * tiga bidang yang bisa dibaca; alokasi lama yang menyebar ke banyak bidang dimulai dari awal.
 */
export function muatDariAlokasi(
  tersimpan: readonly { kategori: string; jumlah: number }[],
  semuaKategori: readonly string[],
): { pilihan: string[]; koin: Koin } | null {
  const berisi = tersimpan
    .filter((baris) => baris.jumlah > 0 && semuaKategori.includes(baris.kategori))
    .sort((a, b) => b.jumlah - a.jumlah || a.kategori.localeCompare(b.kategori));
  if (berisi.length === 0 || berisi.length > BATAS_PILIHAN) return null;
  const nama = berisi.map((baris) => baris.kategori);
  const koin = allocateByWeights(
    nama,
    Object.fromEntries(berisi.map((baris) => [baris.kategori, baris.jumlah])),
    JUMLAH_KOIN,
    1,
  );
  return koin ? { pilihan: nama, koin } : null;
}
