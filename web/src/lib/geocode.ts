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

const alamatSchema = z.object({
  display_name: z.string().optional(),
  address: z.record(z.string(), z.string()).optional(),
});

/**
 * Susun alamat pendek dari balasan Nominatim (reverse): jalan, kelurahan, kecamatan, lalu kota.
 * Di data Jakarta, Nominatim menaruh kelurahan di `village`, kecamatan di `suburb`, dan kota
 * administrasi di `city_district`; `city` hanya berisi nama provinsi, jadi baru dipakai bila
 * tidak ada yang lain. Bagian yang namanya sama dengan bagian sebelumnya dibuang. Tanpa rincian alamat, dipakai tiga bagian pertama nama
 * lengkapnya. Hasil kosong berarti titik itu tidak punya alamat yang bisa dibaca.
 */
export function bacaAlamat(data: unknown): string | null {
  const parsed = alamatSchema.safeParse(data);
  if (!parsed.success) return null;
  const a = parsed.data.address ?? {};
  const bagian = [
    a.road ?? a.pedestrian ?? a.footway ?? a.path,
    a.village,
    a.suburb,
    a.city_district ?? a.city ?? a.county ?? a.state,
  ].filter((nilai): nilai is string => typeof nilai === 'string' && nilai.trim() !== '');
  const unik = bagian.filter((nilai, index) => nilai !== bagian[index - 1]);
  if (unik.length > 0) return unik.slice(0, 4).join(', ');
  const nama = parsed.data.display_name?.split(',').slice(0, 3).join(',').trim();
  return nama ? nama : null;
}

/**
 * Cari alamat dari koordinat lewat Nominatim, tanpa kunci API. Koordinat titik yang dipilih
 * terkirim ke layanan itu. Aturan layanannya satu permintaan per detik, jadi pemanggil menunggu
 * sebentar setelah klik terakhir (lihat `useAlamatTitik`).
 */
export async function cariAlamat(lat: number, lng: number, signal?: AbortSignal) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lng),
    zoom: '18',
    addressdetails: '1',
    'accept-language': 'id',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { signal });
  if (!response.ok) throw new Error('Alamat titik sedang tidak bisa dicari.');
  return bacaAlamat(await response.json());
}
