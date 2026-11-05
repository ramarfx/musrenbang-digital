import { z } from 'zod';

/** Balasan fungsi `musrenai-cost-hint`: rentang biaya kasar, bukan satu angka pasti. */
const saranSchema = z
  .object({
    min: z.number().int().positive(),
    max: z.number().int().positive(),
    alasan: z.string().min(1).max(300),
    label: z.string().max(300),
  })
  .refine((saran) => saran.min < saran.max);

export type SaranBiaya = z.infer<typeof saranSchema>;

export type MasukanSaran = { judul: string; deskripsi: string; kategori: string };

export function parseSaranBiaya(data: unknown): SaranBiaya {
  return saranSchema.parse(data);
}

/** Pesan untuk warga; detail galat server tidak pernah ditampilkan. */
export function saranBiayaGalat(status: number): string {
  switch (status) {
    case 400:
      return 'Isi judul (minimal 3 huruf), deskripsi (minimal 10 huruf), dan pilih kategori dulu.';
    case 401:
      return 'Sesi telah berakhir. Silakan masuk kembali.';
    case 403:
      return 'Akses ditolak. Silakan buka dari website resmi.';
    case 429:
      return 'Batas permintaan tercapai. Silakan coba lagi nanti.';
    default:
      return 'Saran biaya belum tersedia. Isi perkiraan sendiri atau coba lagi nanti.';
  }
}

/** Angka tengah rentang, dibulatkan ke ratusan ribu terdekat, untuk mengisi kolom biaya. */
export function angkaTengah(saran: Pick<SaranBiaya, 'min' | 'max'>): number {
  const tengah = (saran.min + saran.max) / 2;
  return Math.max(1, Math.round(tengah / 100_000) * 100_000);
}
