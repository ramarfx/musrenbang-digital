import L from 'leaflet';

/**
 * Penanda bawaan Leaflet berwarna biru, jadi semua penanda diganti titik hijau
 * (warna data warga) bergaris putih. Sekaligus menghindari masalah gambar
 * penanda bawaan yang tidak ditemukan bundler Vite.
 */
L.Marker.prototype.options.icon = L.divIcon({
  className: '',
  html: '<span class="peta-titik" style="display:block;width:18px;height:18px;border-radius:9999px;background:#047857;border:3px solid #fff;box-shadow:0 0 0 1px rgb(20 34 43 / 0.25)"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

/**
 * Peta tidak bisa digeser atau di-zoom keluar dari Indonesia: kotak ini dari ujung barat Aceh
 * sampai ujung timur Papua, dan zoom minimum 4 masih menampilkan seluruh negeri.
 */
export const BATAS_INDONESIA: L.LatLngBoundsExpression = [
  [-11.5, 94.5],
  [6.5, 141.5],
];
export const ZOOM_MIN_PETA = 4;

/**
 * Opsi bersama semua peta: roda mouse men-zoom peta dan ruang gerak dibatasi ke Indonesia.
 * `zoomSnap: 0` memperbolehkan tingkat zoom pecahan, supaya peta bisa pas mengisi batas
 * wilayah; tanpa itu Leaflet membulatkan ke bawah dan wilayahnya tampil kekecilan. Tombol
 * tambah dan kurang tetap melangkah satu tingkat lewat `zoomDelta`.
 */
export const OPSI_PETA = {
  scrollWheelZoom: true,
  minZoom: ZOOM_MIN_PETA,
  maxZoom: 18,
  zoomSnap: 0,
  zoomDelta: 1,
  maxBounds: BATAS_INDONESIA,
  maxBoundsViscosity: 1,
} as const;

/** Kredit OSM wajib tampil; awalan Leaflet ditulis tanpa ikon bendera bawaan. */
export const ATTRIBUTION_PREFIX = '<a href="https://leafletjs.com">Leaflet</a>';

/**
 * Peta berwarna ala peta daring umum: taman hijau, laut biru, jalan kuning dan putih. Memakai
 * gaya "bright" dari OpenFreeMap (data OpenStreetMap), gratis dan tanpa kunci API. CARTO dan
 * MapTiler sekarang meminta kunci, peta standar OSM berwarna krem, dan Esri hanya punya gaya
 * pucat. Semua peta memakai komponen `LapisanPeta`, yang membaca dua nilai ini.
 */
export const GAYA_PETA = 'https://tiles.openfreemap.org/styles/bright';

/** Kredit wajib dari OpenFreeMap dan OpenStreetMap; tampil di pojok peta. */
export const KREDIT_PETA =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data dari <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
