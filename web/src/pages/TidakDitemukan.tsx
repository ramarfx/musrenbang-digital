import { JudulHalaman } from '../components/Halaman';
import { TombolLink } from '../components/Tombol';

export default function TidakDitemukan() {
  return (
    <>
      <JudulHalaman
        judul="Halaman tidak ditemukan"
        sub="Alamat ini tidak ada di Musrenbang Digital. Mungkin tautannya salah ketik."
      />
      <TombolLink to="/" varian="utama">
        Kembali ke beranda
      </TombolLink>
    </>
  );
}
