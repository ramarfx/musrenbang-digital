import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

/** Ke mana peta kembali: seluruh kotak batas, atau satu titik dengan zoom tertentu. */
export type TujuanKembali =
  | { batas: L.LatLngBoundsExpression }
  | { pusat: [number, number]; zoom: number };

const IKON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block;vertical-align:middle"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/></svg>';

/**
 * Tombol di bawah tombol zoom untuk mengembalikan peta ke tampilan awalnya setelah digeser atau
 * di-zoom ke mana-mana. Dibuat sebagai kontrol Leaflet bergaya sama dengan tombol zoom, jadi
 * urutan dan tampilannya mengikuti kontrol bawaan. Tujuan terbaru dibaca lewat ref, jadi
 * tombolnya tidak dibuat ulang tiap tujuan berubah.
 */
export function TombolKembaliPeta({ tujuan }: { tujuan: TujuanKembali }) {
  const map = useMap();
  const tujuanTerbaru = useRef(tujuan);

  useEffect(() => {
    tujuanTerbaru.current = tujuan;
  }, [tujuan]);

  useEffect(() => {
    const kontrol = new L.Control({ position: 'topleft' });
    kontrol.onAdd = () => {
      const wadah = L.DomUtil.create('div', 'leaflet-bar');
      const tombol = L.DomUtil.create('a', '', wadah);
      tombol.href = '#';
      tombol.setAttribute('role', 'button');
      tombol.setAttribute('aria-label', 'Kembali ke tampilan awal peta');
      tombol.title = 'Kembali ke tampilan awal';
      tombol.innerHTML = IKON;
      L.DomEvent.disableClickPropagation(wadah);
      L.DomEvent.on(tombol, 'click', (event) => {
        L.DomEvent.preventDefault(event);
        const tujuanKini = tujuanTerbaru.current;
        const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if ('batas' in tujuanKini) {
          map.flyToBounds(tujuanKini.batas, {
            padding: [24, 24],
            animate: !kurangiGerak,
            duration: 0.8,
          });
        } else {
          map.flyTo(tujuanKini.pusat, tujuanKini.zoom, {
            animate: !kurangiGerak,
            duration: 0.8,
          });
        }
      });
      return wadah;
    };
    kontrol.addTo(map);
    return () => {
      kontrol.remove();
    };
  }, [map]);

  return null;
}
