import { describe, expect, test } from 'bun:test';
import {
  WILAYAH,
  cariWilayah,
  dalamJakarta,
  hitungBatas,
  titikDiWilayah,
  type GeometriWilayah,
} from './wilayah';

// Kotak sederhana 0..10 dengan lubang 4..6, dipakai supaya hasilnya bisa dihitung manual.
const KOTAK: GeometriWilayah = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
    [
      [4, 4],
      [6, 4],
      [6, 6],
      [4, 6],
      [4, 4],
    ],
  ],
};

describe('data wilayah', () => {
  test('memuat tujuh wilayah Jakarta, masing-masing berwarna dan bergeometri', () => {
    expect(WILAYAH).toHaveLength(7);
    expect(WILAYAH.map((w) => w.kode)).toEqual([
      'dki',
      'pusat',
      'utara',
      'barat',
      'selatan',
      'timur',
      'seribu',
    ]);
    for (const wilayah of WILAYAH) {
      expect(wilayah.warna).toMatch(/^#[0-9A-F]{6}$/i);
      expect(['Polygon', 'MultiPolygon']).toContain(wilayah.geometri.type);
    }
  });

  test('cariWilayah mengembalikan wilayah yang diminta', () => {
    expect(cariWilayah('timur')?.nama).toBe('Jakarta Timur');
  });

  test('batas tiap wilayah masuk akal untuk Jakarta', () => {
    for (const wilayah of WILAYAH) {
      const [[latSelatan, lngBarat], [latUtara, lngTimur]] = hitungBatas(wilayah.geometri);
      expect(latSelatan).toBeLessThan(latUtara);
      expect(lngBarat).toBeLessThan(lngTimur);
      expect(latSelatan).toBeGreaterThan(-7);
      // Kepulauan Seribu memanjang jauh ke utara, jadi ambangnya longgar.
      expect(latUtara).toBeLessThan(-4.9);
      expect(lngBarat).toBeGreaterThan(106);
      expect(lngTimur).toBeLessThan(107.5);
    }
  });
});

describe('hitungBatas', () => {
  test('membalik urutan GeoJSON (lng, lat) menjadi urutan Leaflet (lat, lng)', () => {
    expect(hitungBatas(KOTAK)).toEqual([
      [0, 0],
      [10, 10],
    ]);
  });

  test('mencakup semua bagian MultiPolygon', () => {
    const banyak: GeometriWilayah = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
        [
          [
            [8, 8],
            [9, 8],
            [9, 9],
            [8, 8],
          ],
        ],
      ],
    };
    expect(hitungBatas(banyak)).toEqual([
      [0, 0],
      [9, 9],
    ]);
  });
});

describe('titikDiWilayah', () => {
  test('titik di dalam kotak dihitung masuk', () => {
    expect(titikDiWilayah(KOTAK, 2, 2)).toBe(true);
  });

  test('titik di luar kotak dihitung tidak masuk', () => {
    expect(titikDiWilayah(KOTAK, 20, 20)).toBe(false);
    expect(titikDiWilayah(KOTAK, -1, 5)).toBe(false);
  });

  test('titik di dalam lubang dihitung tidak masuk', () => {
    expect(titikDiWilayah(KOTAK, 5, 5)).toBe(false);
  });

  test('Monas masuk Jakarta Pusat dan seluruh Jakarta, tidak masuk Jakarta Timur', () => {
    const pusat = cariWilayah('pusat');
    const dki = cariWilayah('dki');
    const timur = cariWilayah('timur');
    expect(titikDiWilayah(pusat!.geometri, -6.1754, 106.8272)).toBe(true);
    expect(titikDiWilayah(dki!.geometri, -6.1754, 106.8272)).toBe(true);
    expect(titikDiWilayah(timur!.geometri, -6.1754, 106.8272)).toBe(false);
  });
});

describe('dalamJakarta', () => {
  test('titik di dalam kota administrasi dihitung di Jakarta', () => {
    expect(dalamJakarta(-6.1754, 106.8272)).toBe(true); // Monas
    expect(dalamJakarta(-6.2615, 106.8106)).toBe(true); // Jakarta Selatan
  });

  test('titik di luar Jakarta ditolak', () => {
    expect(dalamJakarta(-6.595, 106.8166)).toBe(false); // Bogor
    expect(dalamJakarta(-6.9175, 107.6191)).toBe(false); // Bandung
    expect(dalamJakarta(-6.3, 107.3)).toBe(false); // Karawang
    expect(dalamJakarta(-5.0, 106.8)).toBe(false); // laut utara Kepulauan Seribu
  });
});
