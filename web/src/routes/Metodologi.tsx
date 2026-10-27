import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { PERGUB_APBD_URL } from '@/features/apbd/lib';
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
  const tahun = config?.tahunAnggaran ?? 2026;

  return (
    <div className="stagger space-y-6">
      <PageHeader
        title="Metodologi"
        description="Dari mana angka di aplikasi ini datang, bagaimana dihitung, dan apa batasnya."
      />

      <Section title="Apa ini, dan apa bukan">
        <p>
          Musrenbang Digital adalah prototipe kanal pra-musrenbang untuk warga. Aplikasi ini bukan
          pengganti musrenbang resmi dan bukan sistem pemerintah. Anggaran Rp10.000.000 di Simulator
          adalah anggaran virtual, bukan uang nyata.
        </p>
      </Section>

      <Section title="Sumber data APBD">
        <p>
          Data APBD adalah APBD murni {tahun} {kota}. Total belanja daerah resminya
          Rp74.285.299.931.740, menurut{' '}
          <a
            href={PERGUB_APBD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-warga underline"
          >
            Pergub DKI Jakarta No. 44 Tahun 2025
          </a>
          . Pergub itu hanya memuat total besar. Angka per bidang ada di lampirannya, yang tidak
          tersedia di situs JDIH.
        </p>
        <p>
          Karena itu angka per kategori di aplikasi ini bukan angka resmi per kategori. Angkanya
          dijumlahkan dari program yang dirinci pemberitaan (detiksatu.com, saiber.tv, dan
          maklumat.id) tentang APBD {tahun} yang disahkan. Dua rujukan resmi sudah dicocokkan: total
          belanja daerah, dan porsi fungsi pendidikan 26,59% dari belanja daerah. Sisanya belum
          dicocokkan ke lampiran.
        </p>
        <p>
          Delapan dari sepuluh kategori terisi. Dua kategori, Keamanan dan Penerangan serta
          Teknologi dan Layanan Digital, belum terisi dan ditampilkan sebagai &quot;data
          menyusul&quot;. Pergub 44/2025 tercatat sudah diubah oleh Pergub 10/2026; angka di sini
          belum dicocokkan dengan perubahan itu.
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
          <li>Semua alokasi warga dijumlahkan per kategori.</li>
          <li>
            Persentase warga sebuah kategori adalah alokasi warga kategori itu dibagi total alokasi
            semua kategori.
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
          belum ada alokasi warga, persentase warga nol dan halaman tetap menampilkan sisi APBD.
          Tidak ada angka yang dikarang.
        </p>
      </Section>

      <Section title="Batas yang perlu diketahui">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Persentase APBD dihitung terhadap total yang terpetakan, bukan terhadap total belanja
            daerah resmi. Kategori yang nominalnya lebih lengkap terpetakan akan terlihat lebih
            besar.
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
