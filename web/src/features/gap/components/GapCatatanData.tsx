import { Link } from 'react-router-dom';
import type { GapRingkasan } from '../lib';

/**
 * Catatan batas data di atas Bandingkan: berapa warga yang sudah berpartisipasi, dan seberapa
 * lengkap sisi APBD. Berupa teks polos tanpa kotak, supaya tidak bersaing dengan kartu temuan.
 * "APBD tersedia" dari server hanya berarti ada setidaknya satu kategori terverifikasi, jadi yang
 * dihitung di sini adalah jumlah kategori terverifikasinya.
 */
export function GapCatatanData({ ringkasan }: { ringkasan: GapRingkasan }) {
  const { jumlahPartisipan, statusVerifikasiServer, jumlahApbdTerverifikasi, rows } = ringkasan;
  const totalKategori = rows.length;
  const tanpaApbd = statusVerifikasiServer !== 'terverifikasi' || jumlahApbdTerverifikasi === 0;
  const sebagian = !tanpaApbd && jumlahApbdTerverifikasi < totalKategori;
  const lihatStatus = (
    <Link to="/apbd" className="font-semibold text-warga underline">
      Lihat status data
    </Link>
  );

  return (
    <div role="note" className="space-y-2 text-[13px] text-muted">
      {(jumlahPartisipan === undefined || jumlahPartisipan === 0) && (
        <p>
          {jumlahPartisipan === undefined
            ? 'Jumlah warga yang sudah mengisi simulator belum tersedia dari server.'
            : 'Belum ada warga yang mengisi simulator.'}
        </p>
      )}
      {tanpaApbd && (
        <p>
          {statusVerifikasiServer === 'tidak_diketahui'
            ? 'Server belum memberi status verifikasi, jadi angka APBD tidak dianggap terverifikasi dan selisih tidak dihitung.'
            : 'Belum ada kategori dengan data terverifikasi, jadi selisih dengan APBD belum bisa dihitung.'}{' '}
          Yang tampil baru pilihan warga. {lihatStatus}.
        </p>
      )}
      {sebagian && (
        <p>
          {jumlahApbdTerverifikasi} dari {totalKategori} kategori punya data APBD terverifikasi.
          Kategori lain tidak ikut dibandingkan, dan porsi APBD dihitung hanya dari kategori yang
          terverifikasi. {lihatStatus}.
        </p>
      )}
    </div>
  );
}
