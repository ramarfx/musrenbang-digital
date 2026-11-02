import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import {
  BATAS_JAKARTA_DARAT,
  cariWilayah,
  hitungBatas,
  type KodeWilayah,
} from '@/lib/wilayah';

/** Batas percobaan menunggu peta punya ukuran, kira-kira satu detik pada 60 bingkai per detik. */
const BATAS_TUNGGU = 60;

/** Garis bayangan tinta di bawah garis wilayah, supaya batas tetap terbaca di atas peta. */
const TINTA = '#14222B';

/**
 * Arsiran batas wilayah terpilih di atas peta, lalu peta terbang ke wilayah itu. Batasnya
 * digambar dua kali: garis tinta tebal di bawah, lalu garis warna wilayah di atasnya. Tanpa
 * garis bawah itu, warna muda seperti mustard tenggelam di peta yang juga kekuningan.
 * Garisnya tergambar dari ujung ke ujung dan arsirannya memudar masuk (kelas `wilayah-*` di
 * index.css); `pathLength` disetel 1 supaya panjang garis tidak perlu diukur sendiri.
 * Arsirannya tipis supaya penanda usulan di atasnya tetap terbaca, dan hanya satu wilayah
 * tampil pada satu waktu, jadi petanya tidak penuh garis. Tanpa wilayah terpilih tidak ada
 * arsiran dan peta kembali ke seluruh Jakarta daratan.
 */
export function LapisanWilayah({ kode }: { kode: KodeWilayah | null }) {
  const map = useMap();

  useEffect(() => {
    const wilayah = kode === null ? undefined : cariWilayah(kode);
    const batas = wilayah ? hitungBatas(wilayah.geometri) : BATAS_JAKARTA_DARAT;

    const fitur = wilayah && ({
      type: 'Feature',
      properties: {},
      geometry: wilayah.geometri,
    } as GeoJSON.Feature);

    const gambar = (gaya: L.PathOptions) => {
      if (!fitur) return undefined;
      const lapisan = L.geoJSON(fitur, { interactive: false, style: gaya }).addTo(map);
      for (const path of lapisan.getLayers()) {
        const elemen = (path as L.Path).getElement();
        if (!elemen) continue;
        elemen.setAttribute('pathLength', '1');
        elemen.classList.add('wilayah-arsir');
      }
      return lapisan;
    };

    const bawah = gambar({ color: TINTA, weight: 6, opacity: 0.5, fill: false });
    const atas = wilayah
      ? gambar({
          color: wilayah.warna,
          weight: 3,
          fillColor: wilayah.warna,
          fillOpacity: 0.18,
        })
      : undefined;

    // Peta di dalam pop-up baru punya ukuran sesudah dialognya terbuka. Menghitung zoom dari
    // ukuran nol menghasilkan NaN dan membuat Leaflet berhenti, jadi tunggu sampai terukur.
    let bingkai = 0;
    let sisa = BATAS_TUNGGU;
    const terbang = () => {
      const ukuran = map.getSize();
      if (ukuran.x === 0 || ukuran.y === 0) {
        if (sisa <= 0) return;
        sisa -= 1;
        bingkai = requestAnimationFrame(terbang);
        return;
      }
      const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      map.flyToBounds(batas, {
        padding: [24, 24],
        animate: !kurangiGerak,
        duration: 0.9,
      });
    };
    terbang();

    return () => {
      cancelAnimationFrame(bingkai);
      if (bawah) map.removeLayer(bawah);
      if (atas) map.removeLayer(atas);
    };
  }, [map, kode]);

  return null;
}
