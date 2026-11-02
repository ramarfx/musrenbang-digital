import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { GAYA_PETA, KREDIT_PETA } from '@/lib/leaflet';

/**
 * Lapisan peta bersama untuk semua peta: peta vektor berwarna (taman hijau, laut biru, jalan
 * kuning) dari OpenFreeMap, digambar dengan MapLibre di dalam peta Leaflet. Penanda, popup,
 * klik, dan kontrol zoom tetap milik Leaflet, jadi komponen peta lain tidak berubah.
 *
 * Peta di dalam pop-up dibuat saat dialognya masih berukuran nol, dan MapLibre mengunci
 * kanvasnya di ukuran bawaan 400x300. Ukuran wadah diawasi, lalu Leaflet dan MapLibre diukur
 * ulang bersama, jadi peta terisi penuh begitu pop-up terbuka atau lebar layar berubah.
 */
export function LapisanPeta() {
  const map = useMap();

  useEffect(() => {
    const lapisan = maplibreGL({ style: GAYA_PETA, attribution: KREDIT_PETA } as Parameters<
      typeof maplibreGL
    >[0]);
    lapisan.addTo(map);

    const wadah = map.getContainer();
    const ukurUlang = () => {
      if (wadah.clientWidth === 0 || wadah.clientHeight === 0) return;
      map.invalidateSize();
      lapisan.getMaplibreMap().resize();
    };
    const pengamat = new ResizeObserver(ukurUlang);
    pengamat.observe(wadah);

    return () => {
      pengamat.disconnect();
      map.removeLayer(lapisan);
    };
  }, [map]);

  return null;
}
