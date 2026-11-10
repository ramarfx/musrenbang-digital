import {
  MAKS_FOTO_PER_USULAN,
  PROPOSAL_STATUSES,
  STATUS_BERFOTO,
  type Proposal,
  type ProposalStatus,
} from '@musrenbang/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { Select } from '@/components/ui/Select';
import { PilihFoto } from '@/features/photos/components/PilihFoto';
import { usePhotosQuery, useUnggahFotoMutation } from '@/features/photos/queries';
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

const bisaBerfoto = (status: ProposalStatus) =>
  (STATUS_BERFOTO as readonly string[]).includes(status);

type DialogUbahStatusUsulanProps = {
  proposal: Proposal;
  onClose: () => void;
};

/**
 * Pop-up ubah tahap dengan catatan wajib. Dipakai halaman rincian dan tabel semua usulan,
 * supaya aturan catatan dan riwayatnya sama di kedua tempat. Untuk tahap Dikerjakan dan
 * Selesai, admin boleh melampirkan foto pengerjaan. Foto diunggah SETELAH tahap tersimpan,
 * karena database hanya menerima foto bila usulan sudah berstatus Dikerjakan atau Selesai.
 */
export function DialogUbahStatusUsulan({ proposal, onClose }: DialogUbahStatusUsulanProps) {
  const mutation = useUpdateProposalStatusMutation();
  const unggah = useUnggahFotoMutation();
  const fotoTersimpan = usePhotosQuery(proposal.id).data?.length ?? 0;
  const [statusBaru, setStatusBaru] = useState<ProposalStatus>(() => tahapBerikutnya(proposal));
  const [foto, setFoto] = useState<File[]>([]);

  const sisaFoto = Math.max(0, MAKS_FOTO_PER_USULAN - fotoTersimpan);
  const adaFoto = bisaBerfoto(statusBaru) && foto.length > 0;

  const kirim = (catatan: string) => {
    mutation.mutate(
      { proposalId: proposal.id, status: statusBaru, catatan },
      {
        onSuccess: async () => {
          toast.success(`Tahap usulan diubah menjadi ${statusBaru}.`);
          if (adaFoto) {
            const hasil = await unggah.mutateAsync({ proposalId: proposal.id, files: foto });
            if (hasil.gagal > 0) {
              toast.error(
                `${hasil.berhasil} foto terunggah, ${hasil.gagal} gagal. ${hasil.pesanGalat ?? ''}`.trim(),
              );
            } else {
              toast.success(`${hasil.berhasil} foto pengerjaan ditambahkan.`);
            }
          }
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
      kirim={adaFoto ? 'Simpan tahap dan kirim foto' : 'Simpan tahap baru'}
      bisaKirim={statusBaru !== proposal.status}
      isPending={mutation.isPending || unggah.isPending}
      errorMessage={mutation.error?.message}
      onSubmit={kirim}
      tambahan={
        <>
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

          {bisaBerfoto(statusBaru) && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">
                Foto pengerjaan <span className="font-normal text-muted">(boleh dikosongkan)</span>
              </p>
              {sisaFoto === 0 ? (
                <p className="text-sm text-muted">
                  Usulan ini sudah memuat {MAKS_FOTO_PER_USULAN} foto, batas maksimalnya.
                </p>
              ) : (
                <PilihFoto
                  files={foto}
                  onChange={setFoto}
                  sisa={sisaFoto}
                  disabled={mutation.isPending || unggah.isPending}
                />
              )}
            </div>
          )}
        </>
      }
    />
  );
}
