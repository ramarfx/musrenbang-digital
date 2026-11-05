import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { SUMBER_APBD_URL } from '@/features/apbd/lib';
import { useAppConfigQuery } from '@/features/config/queries';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-3 max-w-[68ch] space-y-3 text-ink">{children}</div>
    </Card>
  );
}

/**
 * Isi halaman ini mengikuti ARSITEKTUR.md (bab Algoritma Gap dan Data seed).
 * Kota dan tahun dibaca dari tabel config; angka lain hanya yang tertulis di dokumen.
 */
export default function Metodologi() {
  const { data: config } = useAppConfigQuery();
  const kota = config?.kota ?? 'DKI Jakarta';
  const tahun = config?.tahunAnggaran ?? 2025;

  return (
    <div className="stagger space-y-6">
      <PageHeader
        title="Metodologi"
        description="Dari mana angka di aplikasi ini datang, bagaimana dihitung, dan apa batasnya."
      />

      <Section title="Apa ini, dan apa bukan">
        <p>
          Musrenbang Digital adalah prototipe kanal pra-musrenbang untuk warga. Aplikasi ini bukan
          pengganti musrenbang resmi dan bukan sistem pemerintah. Simulator tidak memakai uang
          nyata: warga hanya mengurutkan program dari yang paling penting.
        </p>
      </Section>

      <Section title="Sumber data APBD">
        <p>
          Data APBD adalah APBD {tahun} {kota} menurut Perda DKI Jakarta No. 9 Tahun 2024. Angka
          tiap kategori diambil dari Lampiran 2 Perda itu, yaitu total belanja per urusan
          pemerintahan, bukan per program. Berkasnya (
          <a
            href={SUMBER_APBD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-warga underline"
          >
            zip dari PPID DKI Jakarta
          </a>
          ) bisa dibuka juga di{' '}
          <Link to="/apbd#dokumen-resmi" className="font-semibold text-warga underline">
            halaman APBD
          </Link>
          .
        </p>
        <p>
          Sepuluh kategori di aplikasi ini dipetakan dari urusan itu, misalnya kategori Pendidikan
          dari urusan Pendidikan. Pemetaan ini buatan kami, dan catatannya tampil di tabel halaman
          APBD. Satu urusan bisa mencakup lebih dari satu jenis kegiatan (penerangan jalan,
          misalnya, masih ikut belanja Bina Marga), jadi angka per kategori adalah pendekatan, bukan
          angka resmi per kategori.
        </p>
        <p>
          Tiap kategori punya salah satu dari tiga status: terverifikasi (ada tautan sumber), belum
          terverifikasi (ada angka awal, belum resmi), atau data belum ada. Hanya kategori
          terverifikasi yang ikut dibandingkan dengan pilihan warga. Angka yang belum terverifikasi
          tidak dipakai di perbandingan.
        </p>
        <p>
          Rincian nominal, sumber, dan status tiap kategori ada di halaman{' '}
          <Link to="/apbd" className="font-semibold text-warga underline">
            APBD
          </Link>
          .
        </p>
      </Section>

      <Section title="Cara menghitung selisih warga dan APBD">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Tiap warga memberi nomor 1 sampai 10 pada sepuluh program, nomor 1 untuk yang paling
            penting, dan tiap nomor dipakai sekali. Nomor diubah jadi poin: nomor 1 mendapat 10
            poin, nomor 2 mendapat 9 poin, dan seterusnya sampai nomor 10 mendapat 1 poin.
          </li>
          <li>Poin dari semua warga dijumlahkan per kategori.</li>
          <li>
            Persentase warga sebuah kategori adalah poin kategori itu dibagi total poin semua
            kategori.
          </li>
          <li>
            Persentase APBD sebuah kategori adalah nominal APBD kategori itu dibagi total nominal
            APBD yang terpetakan.
          </li>
          <li>
            Selisih adalah persentase warga dikurangi persentase APBD, dalam poin persentase.
            Selisih positif berarti warga memprioritaskan kategori itu lebih tinggi daripada APBD.
          </li>
          <li>Kategori diurutkan dari selisih terbesar, tanpa melihat arahnya.</li>
        </ol>
        <p>
          Selisih dihitung langsung dari data setiap kali halaman dibuka, tidak disimpan. Kalau
          belum ada urutan dari warga, persentase warga nol dan halaman tetap menampilkan sisi APBD.
          Tidak ada angka yang dikarang.
        </p>
      </Section>

      <Section title="Batas yang perlu diketahui">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Persentase APBD dihitung terhadap total kategori yang terverifikasi, bukan terhadap
            total belanja daerah resmi. Kalau hanya sebagian kategori yang terverifikasi, porsi APBD
            hanya mencerminkan sebagian itu, dan halaman Bandingkan menyebutkannya.
          </li>
          <li>
            Belum ada verifikasi KTP atau NIK, jadi satu orang bisa membuat beberapa akun. Ini
            risiko pada agregat pilihan warga yang dicatat, bukan disembunyikan.
          </li>
          <li>
            Pilihan warga adalah sampel orang yang memakai aplikasi ini, bukan survei yang mewakili
            seluruh penduduk.
          </li>
        </ul>
      </Section>
    </div>
  );
}
