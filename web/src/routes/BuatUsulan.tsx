import { PageHeader } from '@/components/ui/PageHeader';
import { ProposalForm } from '@/features/proposals/components/ProposalForm';

export default function BuatUsulan() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat usulan"
        description="Tulis masalah di lingkunganmu dan penanganan yang kamu usulkan. Admin memeriksa usulan lebih dulu. Setelah disetujui, usulanmu tampil publik dan bisa di-upvote warga lain."
      />
      <ProposalForm />
    </div>
  );
}
