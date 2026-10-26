import { PageHeader } from '@/components/ui/PageHeader';
import { ProposalForm } from '@/features/proposals/components/ProposalForm';

export default function BuatUsulan() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat usulan"
        description="Ceritakan masalah di lingkunganmu dan usulkan solusi yang konkret. Usulan akan tampil publik dan bisa diberi suara warga lain."
      />
      <ProposalForm />
    </div>
  );
}
