import dataWilayah from '@/data/wilayah-jakarta.json';

/**
 * Batas wilayah DKI Jakarta untuk arsiran di peta. Datanya diunduh sekali dari Nominatim
 * (OpenStreetMap), disederhanakan, lalu disimpan di `data/wilayah-jakarta.json` supaya
 * aplikasi tidak memanggil layanan itu tiap halaman dibuka. Garis batasnya perkiraan, cukup
 * untuk menunjukkan cakupan wilayah, bukan patokan hukum.
 */

export type KodeWilayah = 'dki' | 'pusat' | 'utara' | 'barat' | 'selatan' | 'timur' | 'seribu';

type Titik = [number, number];
type Cincin = Titik[];
export type GeometriWilayah =
  | { type: 'Polygon'; coordinates: Cincin[] }
  | { type: 'MultiPolygon'; coordinates: Cincin[][] };

export type Wilayah = {
  kode: KodeWilayah;
  nama: string;
  /** Warna garis dan arsiran; semuanya token merek, tanpa gradasi. */
  warna: string;
  geometri: GeometriWilayah;
};

/** Satu warna per wilayah supaya mudah dibedakan sekilas; enam warna sama terang dan jenuhnya, tapi jauh beda hue. */
const WARNA: Record<KodeWilayah, string> = {
  dki: '#14222B',
  pusat: '#16A34A',
  utara: '#2563EB',
  barat: '#D97706',
  selatan: '#DC2626',
  timur: '#7C3AED',
  seribu: '#0891B2',
};

type FiturWilayah = {
  properties: { kode: KodeWilayah; nama: string };
  geometry: GeometriWilayah;
};

// TypeScript membaca pasangan koordinat di JSON sebagai `number[]`, bukan `[number, number]`,
// jadi bentuknya ditegaskan sekali di sini saja.
const fiturWilayah = (dataWilayah as unknown as { features: FiturWilayah[] }).features;

export const WILAYAH: Wilayah[] = fiturWilayah.map((fitur) => ({
  kode: fitur.properties.kode,
  nama: fitur.properties.nama,
  warna: WARNA[fitur.properties.kode],
  geometri: fitur.geometry,
}));

/**
 * Wilayah yang bisa dipilih warga: lima kota administrasi dan Kepulauan Seribu. Poligon
 * provinsi (`dki`) tidak ikut karena mencakup laut sampai Kepulauan Seribu; poligon Seribu
 * sendiri hanya berisi pulau-pulaunya.
 */
export const WILAYAH_PILIHAN: Wilayah[] = WILAYAH.filter((wilayah) => wilayah.kode !== 'dki');

export function cariWilayah(kode: KodeWilayah): Wilayah | undefined {
  return WILAYAH.find((wilayah) => wilayah.kode === kode);
}

/** Semua cincin terluar dan lubang dari Polygon maupun MultiPolygon, dalam satu daftar. */
function semuaCincin(geometri: GeometriWilayah): Cincin[] {
  return geometri.type === 'Polygon' ? geometri.coordinates : geometri.coordinates.flat();
}

/** Kotak pembatas sebagai [[latSelatan, lngBarat], [latUtara, lngTimur]] untuk Leaflet. */
export function hitungBatas(geometri: GeometriWilayah): [[number, number], [number, number]] {
  let latMin = Infinity;
  let latMaks = -Infinity;
  let lngMin = Infinity;
  let lngMaks = -Infinity;
  for (const cincin of semuaCincin(geometri)) {
    for (const [lng, lat] of cincin) {
      if (lat < latMin) latMin = lat;
      if (lat > latMaks) latMaks = lat;
      if (lng < lngMin) lngMin = lng;
      if (lng > lngMaks) lngMaks = lng;
    }
  }
  return [
    [latMin, lngMin],
    [latMaks, lngMaks],
  ];
}

/** Benar bila titik ada di dalam satu cincin; metode ray casting ke arah timur. */
function diDalamCincin(cincin: Cincin, lat: number, lng: number): boolean {
  let diDalam = false;
  for (let i = 0, j = cincin.length - 1; i < cincin.length; j = i++) {
    const titikI = cincin[i];
    const titikJ = cincin[j];
    if (!titikI || !titikJ) continue;
    const [lngI, latI] = titikI;
    const [lngJ, latJ] = titikJ;
    const memotong = latI > lat !== latJ > lat;
    if (memotong && lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI) {
      diDalam = !diDalam;
    }
  }
  return diDalam;
}

/**
 * Benar bila titik berada di dalam wilayah. Cincin pertama tiap poligon adalah batas luar,
 * cincin sesudahnya lubang (mis. enklave), jadi titik di dalam lubang dihitung di luar.
 */
export function titikDiWilayah(geometri: GeometriWilayah, lat: number, lng: number): boolean {
  const poligon = geometri.type === 'Polygon' ? [geometri.coordinates] : geometri.coordinates;
  return poligon.some((cincin) => {
    const [luar, ...lubang] = cincin;
    if (!luar || !diDalamCincin(luar, lat, lng)) return false;
    return !lubang.some((satuLubang) => diDalamCincin(satuLubang, lat, lng));
  });
}

/** Pilihan di peta: satu wilayah, seluruh Jakarta (`null`), atau tanpa arsiran (`'tanpa'`). */
export type PilihanWilayah = KodeWilayah | 'tanpa' | null;

/** Gabungan batas lima kota administrasi, tanpa Kepulauan Seribu; tampilan awal peta. */
export const BATAS_JAKARTA_DARAT: [[number, number], [number, number]] = (() => {
  const kota = WILAYAH_PILIHAN.filter((wilayah) => wilayah.kode !== 'seribu');
  const batas = kota.map((wilayah) => hitungBatas(wilayah.geometri));
  return [
    [
      Math.min(...batas.map(([[selatan]]) => selatan!)),
      Math.min(...batas.map(([[, barat]]) => barat!)),
    ],
    [
      Math.max(...batas.map(([, [utara]]) => utara!)),
      Math.max(...batas.map(([, [, timur]]) => timur!)),
    ],
  ];
})();

/** Kota administrasi (atau Kepulauan Seribu) tempat sebuah titik berada; kosong bila di luar Jakarta. */
export function wilayahDariTitik(lat: number, lng: number): Wilayah | undefined {
  return WILAYAH_PILIHAN.find((wilayah) => titikDiWilayah(wilayah.geometri, lat, lng));
}

/** Benar bila titik ada di salah satu kota administrasi atau pulau Kepulauan Seribu. */
export function dalamJakarta(lat: number, lng: number): boolean {
  return wilayahDariTitik(lat, lng) !== undefined;
}

/**
 * Kotak gerak peta pemilih lokasi: seluruh Jakarta termasuk Kepulauan Seribu, ditambah ruang
 * sedikit di tepinya supaya garis batas tidak menempel ke pinggir peta.
 */
export const BATAS_GERAK_JAKARTA: [[number, number], [number, number]] = (() => {
  const batas = WILAYAH_PILIHAN.map((wilayah) => hitungBatas(wilayah.geometri));
  const ruang = 0.12;
  return [
    [
      Math.min(...batas.map(([[selatan]]) => selatan!)) - ruang,
      Math.min(...batas.map(([[, barat]]) => barat!)) - ruang,
    ],
    [
      Math.max(...batas.map(([, [utara]]) => utara!)) + ruang,
      Math.max(...batas.map(([, [, timur]]) => timur!)) + ruang,
    ],
  ];
})();
