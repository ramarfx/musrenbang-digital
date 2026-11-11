import type { LangkahTur } from '@/components/tutorial/TurHalaman';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProposalForm } from '@/features/proposals/components/ProposalForm';

const TUR_BUAT: readonly LangkahTur[] = [
  {
    target: 'isi',
    judul: 'Isi usulanmu',
    isi: 'Tulis programnya, bukan kerusakannya. Misalnya "Pembangunan drainase Jalan X", bukan "Jalan berlubang".',
  },
  {
    target: 'titik',
    judul: 'Tandai lokasinya',
    isi: 'Boleh dilewati. Cari daerahnya atau klik peta supaya warga lain mudah menemukan usulanmu.',
  },
  {
    target: 'kirim',
    judul: 'Kirim untuk diperiksa',
    isi: 'Admin memeriksa dulu. Setelah disetujui, usulanmu tampil publik dan bisa didukung warga lain.',
  },
];

export default function BuatUsulan() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat usulan"
        tur={TUR_BUAT}
      />
      <ProposalForm />
    </div>
  );
}
