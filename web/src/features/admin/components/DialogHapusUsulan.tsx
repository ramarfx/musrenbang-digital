import type { Proposal } from '@musrenbang/shared';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { useDeleteProposalMutation } from '@/features/proposals/queries';
import { formatAngka } from '@/lib/format';

type DialogHapusUsulanProps = {
  proposal: Proposal;
  onClose: () => void;
  /** Dijalankan setelah usulan benar-benar terhapus, mis. untuk pindah halaman. */
  onDeleted?: () => void;
};

/**
 * Konfirmasi hapus permanen. Ditaruh di komponen sendiri karena dipakai halaman rincian dan
 * tabel semua usulan, termasuk kalimat akibat hapus yang menyebut jumlah dukungan.
 */
export function DialogHapusUsulan({ proposal, onClose, onDeleted }: DialogHapusUsulanProps) {
  const mutation = useDeleteProposalMutation();

  return (
    <Modal
      open
      onClose={onClose}
      labelledBy="judul-hapus-usulan"
      className="w-[min(480px,calc(100vw-24px))]"
    >
      <div className="p-5 sm:p-6">
        <h2 id="judul-hapus-usulan" className="text-xl font-bold">
          Hapus usulan ini?
        </h2>
        <p className="mt-2 text-sm font-semibold [overflow-wrap:anywhere]">{proposal.judul}</p>
        <p className="mt-2 text-sm text-muted">
          Usulan beserta {formatAngka(proposal.jumlah_suara)} dukungan, komentar, dan riwayat
          tahapnya hilang permanen dan tidak bisa dikembalikan.
        </p>
        {mutation.isError && (
          <div className="mt-3">
            <ErrorState title="Gagal menghapus" message={mutation.error.message} />
          </div>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Batal
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={mutation.isPending}
            onClick={() =>
              mutation.mutate(proposal.id, {
                onSuccess: () => {
                  onClose();
                  onDeleted?.();
                },
              })
            }
          >
            Hapus usulan
          </Button>
        </div>
      </div>
    </Modal>
  );
}
