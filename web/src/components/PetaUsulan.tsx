import L from 'leaflet';
import type { ReactNode } from 'react';
import { AttributionControl, MapContainer, Marker, TileLayer } from 'react-leaflet';

export const PUSAT_JAKARTA: [number, number] = [-6.2088, 106.8456];

/** Penanda hijau bulat (pengganti penanda biru bawaan Leaflet). */
export const penandaHijau = L.divIcon({
  className: '',
  html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#047857;border:3px solid #fff;box-shadow:0 0 0 1px rgb(20 34 43 / 0.25)"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

/**
 * Peta dasar OpenStreetMap. Ubinnya dibuat abu hangat lewat filter CSS
 * (kelas peta-hangat di index.css) supaya air tidak tampil biru.
 */
export function Peta({ children, tinggi = 'h-80' }: { children?: ReactNode; tinggi?: string }) {
  return (
    <MapContainer
      center={PUSAT_JAKARTA}
      zoom={11}
      className={`peta-hangat w-full rounded-2xl ${tinggi}`}
      attributionControl={false}
    >
      {/* Kredit OSM wajib tetap tampil; awalan Leaflet ditulis tanpa ikon bendera. */}
      <AttributionControl prefix='<a href="https://leafletjs.com">Leaflet</a>' />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  );
}

export { Marker };
