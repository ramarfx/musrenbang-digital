import { PageHeader } from '@/components/ui/PageHeader';
import { ProposalForm } from '@/features/proposals/components/ProposalForm';

export default function BuatUsulan() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat usulan"
        description="Tulis masalah di lingkunganmu dan penanganan yang kamu usulkan. Usulan langsung tampil publik dan bisa di-upvote warga lain."
      />
      <ProposalForm />
    </div>
  );
}
