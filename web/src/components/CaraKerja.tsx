import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';

/**
 * Tiga langkah alur utama (PRD FR-02). Tiap langkah menautkan ke halaman yang benar-benar
 * mengerjakannya, jadi bagian ini juga jalan pintas ke loop inti: urutkan, bandingkan, usulkan.
 * Sengaja tanpa ikon bulat bernomor; nomor ditulis sebagai teks dan isinya spesifik.
 */
const LANGKAH = [
  {
    judul: 'Urutkan prioritasmu',
    isi: 'Beri nomor 1 sampai 10 pada program, dari yang paling penting menurutmu.',
    tautan: '/simulator',
    teks: 'Buka simulator',
  },
  {
    judul: 'Lihat selisihnya dengan APBD',
    isi: 'Urutan semua warga digabung, lalu dibandingkan dengan porsi APBD tiap program.',
    tautan: '/bandingkan',
    teks: 'Lihat Bandingkan',
  },
  {
    judul: 'Usulkan dan pantau',
    isi: 'Tulis usulan untuk lingkunganmu, lalu ikuti statusnya sampai selesai.',
    tautan: '/usulan/baru',
    teks: 'Buat usulan',
  },
] as const;

export function CaraKerja() {
  return (
    <section aria-labelledby="judul-cara-kerja">
      <h2 id="judul-cara-kerja" className="mb-3 text-xl font-bold">
        Cara kerjanya
      </h2>
      <Card className="p-0 sm:p-0">
        <ol className="stagger grid divide-y divide-rule md:grid-cols-3 md:divide-x md:divide-y-0">
          {LANGKAH.map((langkah, index) => (
            <li key={langkah.judul} className="flex flex-col p-5 sm:p-6">
              <span className="text-[13px] text-muted">Langkah {index + 1}</span>
              <b className="mt-1 text-[17px] font-bold tracking-[-0.01em]">{langkah.judul}</b>
              <span className="mt-1.5 text-sm text-ink/80">{langkah.isi}</span>
              <Link
                to={langkah.tautan}
                className="mt-4 w-fit text-sm font-semibold text-warga underline underline-offset-4 transition-colors duration-150 hover:text-hijau-tekan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
              >
                {langkah.teks}
              </Link>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}
