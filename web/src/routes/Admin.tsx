import { PROPOSAL_STATUSES, type Proposal, type ProposalStatus } from '@musrenbang/shared';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { AdminProposalTable } from '@/features/admin/components/AdminProposalTable';
import { useUpdateProposalStatusMutation } from '@/features/admin/queries';
import { useProposalsQuery } from '@/features/proposals/queries';
import { formatAngka } from '@/lib/format';

export default function Admin() {
  const proposalsQuery = useProposalsQuery();
  const mutation = useUpdateProposalStatusMutation();
  const proposals = proposalsQuery.data ?? [];

  const handleStatusChange = (proposal: Proposal, status: ProposalStatus) => {
    if (proposal.status === status) return;
    mutation.mutate(
      { proposalId: proposal.id, status },
      {
        onSuccess: () => {
          toast.success(`Status "${proposal.judul}" diubah menjadi ${status}.`);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  const hitungStatus = (status: ProposalStatus) =>
    proposals.filter((proposal) => proposal.status === status).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin: kelola usulan"
        description="Ubah status usulan di sini. Setiap perubahan dicatat otomatis ke riwayat status lewat RPC change_proposal_status."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Ringkasan status">
        {PROPOSAL_STATUSES.map((status) => (
          <Card key={status}>
            <p className="text-sm text-stone-500">{status}</p>
            <p className="text-xl font-bold tabular-nums">{formatAngka(hitungStatus(status))}</p>
          </Card>
        ))}
      </section>

      {proposalsQuery.isPending && <PageLoader label="Memuat usulan..." />}

      {proposalsQuery.isError && (
        <ErrorState
          message={proposalsQuery.error.message}
          onRetry={() => {
            void proposalsQuery.refetch();
          }}
        />
      )}

      {mutation.error && (
        <ErrorState title="Gagal mengubah status" message={mutation.error.message} />
      )}

      {proposalsQuery.isSuccess && proposals.length === 0 && (
        <Card>
          <p className="text-stone-600">Belum ada usulan untuk dikelola.</p>
        </Card>
      )}

      {proposals.length > 0 && (
        <AdminProposalTable
          proposals={proposals}
          onStatusChange={handleStatusChange}
          isUpdating={mutation.isPending}
        />
      )}
    </div>
  );
}
