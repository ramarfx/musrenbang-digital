import { PROPOSAL_STATUSES, type Proposal, type ProposalStatus } from '@musrenbang/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';
import { useUpdateProposalStatusMutation } from '../queries';
import { CatatanDialog } from './CatatanDialog';

/** Tahap berikutnya dalam urutan kerja, atau tahap lain bila usulan sudah di ujung. */
function tahapBerikutnya(proposal: Proposal): ProposalStatus {
  const indeks = PROPOSAL_STATUSES.indexOf(proposal.status);
  return (
    PROPOSAL_STATUSES[indeks + 1] ??
    PROPOSAL_STATUSES.find((status) => status !== proposal.status) ??
    proposal.status
  );
}

type DialogUbahStatusUsulanProps = {
  proposal: Proposal;
  onClose: () => void;
};

/**
 * Pop-up ubah tahap dengan catatan wajib. Dipakai halaman rincian dan tabel semua usulan,
 * supaya aturan catatan dan riwayatnya sama di kedua tempat.
 */
export function DialogUbahStatusUsulan({ proposal, onClose }: DialogUbahStatusUsulanProps) {
  const mutation = useUpdateProposalStatusMutation();
  const [statusBaru, setStatusBaru] = useState<ProposalStatus>(() => tahapBerikutnya(proposal));

  const kirim = (catatan: string) => {
    mutation.mutate(
      { proposalId: proposal.id, status: statusBaru, catatan },
      {
        onSuccess: () => {
          toast.success(`Tahap usulan diubah menjadi ${statusBaru}.`);
          onClose();
        },
      },
    );
  };

  return (
    <CatatanDialog
      open
      onClose={onClose}
      judul="Ubah tahap usulan"
      keterangan={
        <>
          Usulan ini sekarang berstatus <StatusBadge status={proposal.status} />. Catatan wajib
          diisi karena masuk ke riwayat publik.
        </>
      }
      labelCatatan="Catatan perubahan tahap"
      kirim="Simpan tahap baru"
      bisaKirim={statusBaru !== proposal.status}
      isPending={mutation.isPending}
      errorMessage={mutation.error?.message}
      onSubmit={kirim}
      tambahan={
        <div className="space-y-1.5">
          <label htmlFor="status-baru-admin" className="block text-sm font-medium">
            Tahap baru
          </label>
          <Select
            id="status-baru-admin"
            value={statusBaru}
            onChange={(event) => setStatusBaru(event.target.value as ProposalStatus)}
          >
            {PROPOSAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </div>
      }
    />
  );
}
