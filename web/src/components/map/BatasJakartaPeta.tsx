import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { WILAYAH_PILIHAN } from '@/lib/wilayah';

const HIJAU = '#047857';

/**
 * Garis hijau putus-putus di sekeliling Jakarta (lima kota dan pulau Kepulauan Seribu), dengan
 * isi sangat tipis, supaya jelas di mana titik boleh ditaruh. Statis dan tidak bisa diklik,
 * jadi klik di dalam atau di luarnya tetap sampai ke peta.
 */
export function BatasJakartaPeta() {
  const map = useMap();
  useEffect(() => {
    const lapisan = L.geoJSON(
      {
        type: 'FeatureCollection',
        features: WILAYAH_PILIHAN.map((wilayah) => ({
          type: 'Feature',
          properties: {},
          geometry: wilayah.geometri,
        })),
      } as GeoJSON.FeatureCollection,
      {
        interactive: false,
        style: {
          color: HIJAU,
          weight: 1.5,
          dashArray: '5 5',
          fillColor: HIJAU,
          fillOpacity: 0.05,
        },
      },
    ).addTo(map);
    return () => {
      map.removeLayer(lapisan);
    };
  }, [map]);
  return null;
}
