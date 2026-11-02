import type { Proposal } from '@musrenbang/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { useDeleteProposalMutation } from '../queries';
import { ProposalForm } from './ProposalForm';

const tombolIkon =
  'group/aksi inline-flex size-9 items-center justify-center rounded-xl border border-edge bg-surface text-ink transition-[scale,background-color,color,border-color] duration-150 ease-out active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga';

/** Ubah hanya selama usulan Menunggu; hapus juga untuk yang ditolak. Sesuai izin database. */
export function bisaDiubah(proposal: Proposal) {
  return proposal.moderasi === 'Menunggu';
}
export function bisaDihapus(proposal: Proposal) {
  return proposal.moderasi === 'Menunggu' || proposal.moderasi === 'Ditolak';
}

/**
 * Tombol ikon ubah dan hapus untuk pemilik usulan. Ubah membuka formulir di pop-up; hapus
 * minta konfirmasi dulu. `onKeluar(true)` dipanggil begitu hapus dikonfirmasi supaya kartu
 * bisa memudar, dan `onKeluar(false)` bila gagal sehingga kartu kembali.
 */
export function AksiPemilik({
  proposal,
  onKeluar,
}: {
  proposal: Proposal;
  onKeluar?: (keluar: boolean) => void;
}) {
  const [dialog, setDialog] = useState<'ubah' | 'hapus' | null>(null);
  const hapus = useDeleteProposalMutation();
  const tutup = () => setDialog(null);

  const konfirmasiHapus = () => {
    tutup();
    onKeluar?.(true);
    hapus.mutate(proposal.id, {
      onError: (error) => {
        onKeluar?.(false);
        toast.error(error.message);
      },
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {bisaDiubah(proposal) && (
          <button
            type="button"
            aria-label="Ubah usulan"
            title="Ubah usulan"
            onClick={() => setDialog('ubah')}
            className={cn(tombolIkon, 'hover:bg-active')}
          >
            <span className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/aksi:-rotate-12 group-hover/aksi:-translate-y-px motion-reduce:transition-none">
              <Icon name="pensil" size={17} />
            </span>
          </button>
        )}
        {bisaDihapus(proposal) && (
          <button
            type="button"
            aria-label="Hapus usulan"
            title="Hapus usulan"
            onClick={() => setDialog('hapus')}
            className={cn(
              tombolIkon,
              'hover:border-red-200 hover:bg-red-50 hover:text-red-700',
            )}
          >
            <span className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/aksi:scale-110 motion-reduce:transition-none">
              <Icon name="sampah" size={17} />
            </span>
          </button>
        )}
      </div>

      <Modal
        open={dialog === 'ubah'}
        onClose={tutup}
        labelledBy={`ubah-usulan-${proposal.id}`}
        className="w-[min(720px,calc(100vw-24px))]"
      >
        {dialog === 'ubah' && (
          <div className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id={`ubah-usulan-${proposal.id}`} className="text-lg font-bold">
                Ubah usulan
              </h2>
              <button
                type="button"
                aria-label="Tutup"
                onClick={tutup}
                className={cn(tombolIkon, 'hover:bg-active')}
              >
                <Icon name="tutup" size={17} />
              </button>
            </div>
            <ProposalForm proposal={proposal} onSaved={tutup} onCancel={tutup} />
          </div>
        )}
      </Modal>

      <Modal
        open={dialog === 'hapus'}
        onClose={tutup}
        labelledBy={`hapus-usulan-${proposal.id}`}
        className="w-[min(420px,calc(100vw-24px))]"
      >
        <div className="p-6">
          <span className="grid size-11 place-items-center rounded-full bg-red-50 text-red-700">
            <Icon name="sampah" size={20} />
          </span>
          <h2 id={`hapus-usulan-${proposal.id}`} className="mt-4 text-lg font-bold">
            Hapus usulan ini?
          </h2>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink [overflow-wrap:anywhere]">
            {proposal.judul}
          </p>
          <p className="mt-2 text-sm text-muted">
            Usulan ini hilang dari daftar dan tidak bisa dikembalikan.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={tutup}>
              Batal
            </Button>
            <Button type="button" variant="danger" onClick={konfirmasiHapus}>
              <Icon name="sampah" size={16} />
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
