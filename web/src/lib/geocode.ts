import { z } from 'zod';

export type HasilCari = {
  /** Nama lengkap dari OpenStreetMap, untuk daftar hasil. */
  nama: string;
  /** Dua bagian pertama nama, cukup untuk mengisi kolom lokasi. */
  singkat: string;
  lat: number;
  lng: number;
};

const hasilSchema = z.array(
  z.object({
    display_name: z.string(),
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
  }),
);

/** Kotak DKI Jakarta (barat, utara, timur, selatan): hasil di dalamnya diutamakan, bukan satu-satunya. */
const KOTAK_JAKARTA = '106.55,-5.95,107.10,-6.45';

const MAKS_HASIL = 5;

/**
 * Ubah balasan Nominatim jadi hasil yang dipakai peta; data yang tidak sesuai bentuk dibuang.
 * Kecamatan dan kelurahan yang namanya sama muncul sebagai baris kembar, jadi hanya yang
 * pertama (paling relevan) yang disimpan.
 */
export function bacaHasilCari(data: unknown): HasilCari[] {
  const parsed = hasilSchema.safeParse(data);
  if (!parsed.success) return [];
  const terlihat = new Set<string>();
  const hasil: HasilCari[] = [];
  for (const item of parsed.data) {
    const singkat = item.display_name.split(',').slice(0, 2).join(',').trim();
    if (terlihat.has(singkat)) continue;
    terlihat.add(singkat);
    hasil.push({ nama: item.display_name, singkat, lat: item.lat, lng: item.lon });
  }
  return hasil.slice(0, MAKS_HASIL);
}

/**
 * Cari tempat di Indonesia lewat Nominatim (OpenStreetMap), tanpa kunci API. Aturan layanan
 * itu: satu permintaan per detik dan bukan pencarian tiap ketikan, jadi dipanggil hanya saat
 * pengguna menekan cari. Teks yang diketik ikut terkirim ke layanan itu.
 */
export async function cariTempat(kata: string, signal?: AbortSignal): Promise<HasilCari[]> {
  const q = kata.trim();
  if (q.length < 3) return [];
  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '10',
    countrycodes: 'id',
    'accept-language': 'id',
    viewbox: KOTAK_JAKARTA,
    bounded: '0',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal });
  if (!response.ok) throw new Error('Pencarian tempat sedang tidak bisa dipakai.');
  return bacaHasilCari(await response.json());
}
