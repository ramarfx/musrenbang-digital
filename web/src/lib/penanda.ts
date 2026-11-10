import L from 'leaflet';
import { getCategoryInfo } from '@/features/categories/info';

const TINTA = '#14222B';
const STABILO = '#4FC79C';
const RUAS = 5;

/**
 * Penanda usulan: pin tinta dengan ikon kategori berwarna stabilo, dikelilingi cincin lima ruas
 * yang terisi sesuai TAHAP usulan: Diajukan satu ruas, Dikerjakan empat, Selesai lima (penuh).
 * Lima ruas sengaja sama dengan lima tahap, sehingga cincin terbaca sebagai kemajuan pengerjaan,
 * sama dengan "Tahap 4 dari 5" di kartu dan halaman usulan. Dukungan warga tidak digambar di
 * pin; jumlahnya ada di popup. Pin jatuh masuk lalu ruasnya menyala satu per satu (kelas `pin-*`
 * di index.css); `tunda` menggeser awal animasi per pin supaya pin muncul berurutan. Pin dibuat
 * ulang hanya saat kategori, tahap, atau tundanya berubah, jadi menggeser peta tidak mengulang
 * animasinya. Tahap `null` membuat pin tanpa cincin, untuk peta satu usulan yang sedang dipilih
 * lokasinya.
 */
export function buatIkonPin(kategori: string, tahap: number | null, tunda: number): L.DivIcon {
  const { ikon } = getCategoryInfo(kategori);
  let ruas = '';
  for (let i = 0; tahap !== null && i < RUAS; i += 1) {
    const nyala = i < tahap;
    ruas += `<circle class="pin-ruas${nyala ? ' pin-ruas-nyala' : ''}" style="--urut:${i}" cx="17" cy="16" r="13.5" fill="none" stroke="${STABILO}" stroke-width="3" stroke-opacity="${nyala ? 1 : 0.25}" pathLength="100" stroke-dasharray="16 84" stroke-dashoffset="${-i * 20 - 2}" transform="rotate(-90 17 16)"/>`;
  }
  const html = `
    <div class="pin-usulan" style="--tunda:${tunda}ms">
      <svg class="pin-badan" width="34" height="44" viewBox="0 0 34 44" aria-hidden="true">
        <path d="M17 43C17 43 2 28 2 16a15 15 0 0 1 30 0c0 12-15 27-15 27z" fill="${TINTA}"/>
        ${ruas}
        <g transform="translate(10.4 9.4) scale(0.6)" fill="none" stroke="${STABILO}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${ikon}"/></g>
      </svg>
    </div>`;
  return L.divIcon({
    className: '',
    html,
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -40],
  });
}

const BADAN_PIN = 'M17 43C17 43 2 28 2 16a15 15 0 0 1 30 0c0 12-15 27-15 27z';

/**
 * Pin berangka: bentuk dan ukurannya sama dengan pin usulan (sedikit lebih kecil), dengan jumlah
 * di dalam kepalanya sebagai pengganti ikon kategori. Gugus usulan memakai kepala berisi warna
 * penuh, bukan cincin, supaya tidak tertukar dengan cincin tahap di pin usulan. Ikon kota tetap
 * bercincin warna kotanya, sama dengan titik warna di daftar wilayah.
 */
function pinAngka(angka: number, warnaCincin: string, warnaAngka: string, isi?: string): string {
  const ukuran = angka >= 1000 ? 10 : angka >= 100 ? 12 : 14;
  const kepala = isi
    ? `<circle cx="17" cy="16" r="13.5" fill="${isi}"/>`
    : `<circle cx="17" cy="16" r="13.5" fill="none" stroke="${warnaCincin}" stroke-width="3"/>`;
  return `<svg class="pin-badan" width="32" height="41" viewBox="0 0 34 44" aria-hidden="true">
    <path d="${BADAN_PIN}" fill="${TINTA}"/>
    ${kepala}
    <text x="17" y="${16 + ukuran * 0.36}" text-anchor="middle" font-size="${ukuran}" font-weight="700" fill="${warnaAngka}">${angka}</text>
  </svg>`;
}

/** Penanda gabungan untuk banyak usulan yang berdekatan: pin berangka jumlah usulannya. */
export function buatIkonGugus(jumlah: number, tunda: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="gugus-usulan" style="--tunda:${tunda}ms">${pinAngka(jumlah, STABILO, TINTA, STABILO)}</div>`,
    iconSize: [32, 41],
    iconAnchor: [16, 41],
  });
}

/**
 * Penanda satu kota administrasi (atau seluruh Jakarta) saat peta di-zoom jauh: pin berangka
 * dengan cincin warna kotanya, sama dengan arsiran dan titik di daftar wilayah, dan nama kota
 * di gelembung yang turun dari atas pin hanya saat kursor di atasnya. Angkanya jumlah usulan di
 * kota itu.
 */
export function buatIkonKota(
  nama: string,
  jumlah: number,
  warna: string,
  tunda: number,
): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="kota-usulan" style="--tunda:${tunda}ms">${pinAngka(jumlah, warna, '#FFFFFF')}<span class="kota-nama">${nama}</span></div>`,
    iconSize: [32, 41],
    iconAnchor: [16, 41],
  });
}
