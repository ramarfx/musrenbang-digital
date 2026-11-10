import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import {
  BATAS_JAKARTA_DARAT,
  WILAYAH_PILIHAN,
  cariWilayah,
  hitungBatas,
  type PilihanWilayah,
  type Wilayah,
} from '@/lib/wilayah';

/** Batas percobaan menunggu peta punya ukuran, kira-kira satu detik pada 60 bingkai per detik. */
const BATAS_TUNGGU = 60;

/**
 * Di bawah zoom ini peta dianggap jauh. Seluruh Jakarta pas di peta pada zoom sekitar 10,5
 * sampai 11. Warna wilayah tetap tampil saat peta diam di jarak apa pun; hanya selama zoom yang
 * melewati jarak jauh warnanya disembunyikan.
 */
const ZOOM_WILAYAH_JAUH = 9.5;

/** Garis bayangan tinta di bawah garis wilayah, supaya batas tetap terbaca di atas peta. */
const TINTA = '#14222B';

/**
 * Arsiran wilayah di atas peta, lalu peta terbang ke sana. Tiap wilayah punya warnanya sendiri,
 * sama dengan titik warna di daftar pilihan. Batasnya digambar dua kali: garis tinta tipis di
 * bawah, lalu garis warna wilayah di atasnya, supaya warna muda tidak tenggelam di peta.
 * Arsiran baru muncul setelah peta selesai terbang. Garisnya tergambar dari ujung ke ujung dan arsirannya memudar masuk (kelas `wilayah-*` di
 * index.css); `pathLength` disetel 1 supaya panjang garis tidak perlu diukur sendiri.
 * Tanpa pilihan, enam wilayah diarsir sekaligus tetapi peta hanya menyesuaikan diri ke kota
 * daratan, jadi tidak mundur jauh ke Kepulauan Seribu. Pilihan `'tanpa'` tidak mengarsir apa pun.
 */
export function LapisanWilayah({ kode }: { kode: PilihanWilayah }) {
  const map = useMap();

  useEffect(() => {
    const satu = kode === null || kode === 'tanpa' ? undefined : cariWilayah(kode);
    const digambar: Wilayah[] = satu ? [satu] : kode === 'tanpa' ? [] : WILAYAH_PILIHAN;
    const batas = satu ? hitungBatas(satu.geometri) : BATAS_JAKARTA_DARAT;

    const lapisanGambar: L.GeoJSON[] = [];
    const gambar = (wilayah: Wilayah, gaya: L.PathOptions) => {
      const fitur = {
        type: 'Feature',
        properties: {},
        geometry: wilayah.geometri,
      } as GeoJSON.Feature;
      const lapisan = L.geoJSON(fitur, { interactive: false, style: gaya }).addTo(map);
      for (const path of lapisan.getLayers()) {
        const elemen = (path as L.Path).getElement();
        if (!elemen) continue;
        elemen.setAttribute('pathLength', '1');
        elemen.classList.add('wilayah-arsir');
      }
      lapisanGambar.push(lapisan);
    };

    // Arsiran baru digambar setelah peta selesai terbang, supaya animasinya tidak berjalan
    // sambil peta masih bergerak.
    let sudahGambar = false;
    const arsir = () => {
      if (sudahGambar) return;
      sudahGambar = true;
      for (const wilayah of digambar) {
        gambar(wilayah, { color: TINTA, weight: 3, opacity: 0.35, fill: false });
      }
      for (const wilayah of digambar) {
        gambar(wilayah, {
          color: wilayah.warna,
          weight: 1.5,
          fillColor: wilayah.warna,
          fillOpacity: 0.3,
        });
      }
    };

    // Peta di pop-up baru punya ukuran sesudah tampil. Menghitung zoom dari ukuran nol
    // menghasilkan NaN dan membuat Leaflet berhenti, jadi tunggu sampai terukur.
    let bingkai = 0;
    let sisa = BATAS_TUNGGU;
    let cadangan = 0;
    const terbang = () => {
      const ukuran = map.getSize();
      if (ukuran.x === 0 || ukuran.y === 0) {
        if (sisa <= 0) {
          arsir();
          return;
        }
        sisa -= 1;
        bingkai = requestAnimationFrame(terbang);
        return;
      }
      const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      map.once('moveend', arsir);
      // Jika peta sudah di tujuan, moveend bisa tidak terpicu; cadangan menjamin arsiran tampil.
      cadangan = window.setTimeout(arsir, kurangiGerak ? 50 : 1300);
      map.flyToBounds(batas, {
        padding: [24, 24],
        animate: !kurangiGerak,
        duration: 0.9,
      });
    };
    terbang();

    // Selama peta sedang berzoom lewat jarak jauh (mis. tombol ulang dari tampilan yang jauh),
    // warna wilayah disembunyikan lewat kelas di wadah peta, karena arsirannya ikut diskalakan
    // dan tampak pecah. Begitu zoom selesai, warnanya muncul lagi, di jarak mana pun.
    const kelas = map.getContainer().classList;
    let sedangZoom = false;
    let lewatJauh = false;
    const terapkan = () => kelas.toggle('peta-wilayah-bergerak', sedangZoom && lewatJauh);
    const mulaiZoom = () => {
      sedangZoom = true;
      lewatJauh = map.getZoom() < ZOOM_WILAYAH_JAUH;
      terapkan();
    };
    const saatZoom = () => {
      if (map.getZoom() < ZOOM_WILAYAH_JAUH) lewatJauh = true;
      terapkan();
    };
    const selesaiZoom = () => {
      sedangZoom = false;
      lewatJauh = false;
      terapkan();
    };
    map.on('zoomstart', mulaiZoom);
    map.on('zoom', saatZoom);
    map.on('zoomend', selesaiZoom);

    return () => {
      map.off('zoomstart', mulaiZoom);
      map.off('zoom', saatZoom);
      map.off('zoomend', selesaiZoom);
      kelas.remove('peta-wilayah-bergerak');
      cancelAnimationFrame(bingkai);
      clearTimeout(cadangan);
      map.off('moveend', arsir);
      for (const lapisan of lapisanGambar) map.removeLayer(lapisan);
    };
  }, [map, kode]);

  return null;
}
