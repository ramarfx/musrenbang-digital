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

/** Kredit OSM wajib tampil; awalan Leaflet ditulis tanpa ikon bendera bawaan. */
export const ATTRIBUTION_PREFIX = '<a href="https://leafletjs.com">Leaflet</a>';
