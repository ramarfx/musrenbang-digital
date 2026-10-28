import { Link } from 'react-router-dom';
import type { GapRingkasan } from '../lib';

/**
 * Catatan batas data di atas Bandingkan: berapa warga yang sudah berpartisipasi, dan seberapa
 * lengkap sisi APBD. "APBD tersedia" dari server hanya berarti ada setidaknya satu kategori
 * terverifikasi, jadi yang dihitung di sini adalah jumlah kategori terverifikasinya.
 */
export function GapCatatanData({ ringkasan }: { ringkasan: GapRingkasan }) {
  const { jumlahPartisipan, statusVerifikasiServer, jumlahApbdTerverifikasi, rows } = ringkasan;
  const totalKategori = rows.length;
  const tanpaApbd = statusVerifikasiServer !== 'terverifikasi' || jumlahApbdTerverifikasi === 0;
  const sebagian = !tanpaApbd && jumlahApbdTerverifikasi < totalKategori;

  return (
    <div role="note" className="space-y-1.5 rounded-2xl bg-active px-4 py-3 text-[13px] text-ink">
      <p>
        <b>Partisipan:</b>{' '}
        {jumlahPartisipan === undefined
          ? 'jumlah warga yang sudah mengurutkan belum tersedia dari server.'
          : jumlahPartisipan === 0
            ? 'belum ada warga yang menyimpan urutan prioritas.'
            : `${jumlahPartisipan} warga sudah menyimpan urutan prioritas.`}
      </p>
      {tanpaApbd && (
        <p>
          <b>Data APBD:</b>{' '}
          {statusVerifikasiServer === 'tidak_diketahui'
            ? 'server belum memberi status verifikasi, jadi angka APBD tidak dianggap terverifikasi dan selisih tidak dihitung.'
            : 'belum ada kategori dengan data terverifikasi, jadi selisih dengan APBD belum bisa dihitung.'}{' '}
          Yang tampil baru pilihan warga.{' '}
          <Link to="/apbd" className="font-semibold text-warga underline">
            Lihat status data
          </Link>
          .
        </p>
      )}
      {sebagian && (
        <p>
          <b>Data APBD:</b> {jumlahApbdTerverifikasi} dari {totalKategori} kategori punya data
          terverifikasi. Kategori lain tidak ikut dibandingkan, dan porsi APBD dihitung hanya dari
          kategori yang terverifikasi.{' '}
          <Link to="/apbd" className="font-semibold text-warga underline">
            Lihat status data
          </Link>
          .
        </p>
      )}
    </div>
  );
}
