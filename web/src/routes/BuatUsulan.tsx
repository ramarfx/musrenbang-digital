import { PageHeader } from '@/components/ui/PageHeader';
import { ProposalForm } from '@/features/proposals/components/ProposalForm';

export default function BuatUsulan() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat usulan"
        description="Tulis program pembangunan yang kamu harap masuk anggaran tahun depan. Admin memeriksa usulan lebih dulu. Setelah disetujui, usulanmu tampil publik dan bisa di-upvote warga lain. Kerusakan yang perlu segera diperbaiki lebih cepat lewat kanal pengaduan resmi."
      />
      <ProposalForm />
    </div>
  );
}
