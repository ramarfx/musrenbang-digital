import {
  MAKS_FOTO_PER_USULAN,
  STATUS_BERFOTO,
  type Proposal,
  type ProposalPhoto,
} from '@musrenbang/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';

import { Icon } from '@/components/ui/Icon';
import { formatTanggal } from '@/lib/format';
import { urlFoto } from '../api';
import { useHapusFotoMutation, usePhotosQuery, useUnggahFotoMutation } from '../queries';
import { PilihFoto } from './PilihFoto';

/**
 * Kartu admin di halaman rincian usulan untuk menambah dan menghapus foto pengerjaan setelah
 * tahap tersimpan. Hanya tampil saat usulan berstatus Dikerjakan atau Selesai, sama dengan aturan
 * di database. Menghapus memakai dua ketukan (ketuk, lalu ketuk lagi untuk memastikan), tanpa
 * dialog tambahan, karena foto bisa diunggah ulang.
 */
export function KelolaFotoAdmin({ proposal }: { proposal: Proposal }) {
  const query = usePhotosQuery(proposal.id);
  const unggah = useUnggahFotoMutation();
  const hapus = useHapusFotoMutation();
  const [baru, setBaru] = useState<File[]>([]);
  const [siapHapus, setSiapHapus] = useState<number | null>(null);

  if (!(STATUS_BERFOTO as readonly string[]).includes(proposal.status)) return null;

  const tersimpan: ProposalPhoto[] = query.data ?? [];
  const sisa = Math.max(0, MAKS_FOTO_PER_USULAN - tersimpan.length);

  const kirim = async () => {
    const hasil = await unggah.mutateAsync({ proposalId: proposal.id, files: baru });
    if (hasil.gagal > 0) {
      toast.error(
        `${hasil.berhasil} foto terunggah, ${hasil.gagal} gagal. ${hasil.pesanGalat ?? ''}`.trim(),
      );
      return;
    }
    toast.success(`${hasil.berhasil} foto pengerjaan ditambahkan.`);
    setBaru([]);
  };

  const hapusFoto = (foto: ProposalPhoto) => {
    if (siapHapus !== foto.id) {
      setSiapHapus(foto.id);
      return;
    }
    hapus.mutate(foto, {
      onSuccess: () => {
        setSiapHapus(null);
        toast.success('Foto dihapus.');
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <section aria-labelledby="judul-foto-admin" className="mt-5 border-t border-rule pt-5">
      <h3 id="judul-foto-admin" className="text-base font-bold">
        Foto pengerjaan
      </h3>
      <p className="mt-1 text-sm text-muted">
        Warga melihat foto ini di halaman usulan. {tersimpan.length} dari {MAKS_FOTO_PER_USULAN}{' '}
        foto terpakai.
      </p>

      {query.isPending ? (
        <p className="mt-3 text-sm text-muted">Memuat foto...</p>
      ) : query.isError ? (
        <div className="mt-3">
          <p role="alert" className="text-sm text-red-700">
            Foto belum bisa dimuat: {query.error.message}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void query.refetch()}
          >
            Coba lagi
          </Button>
        </div>
      ) : tersimpan.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Belum ada foto. Tambahkan foto lapangan di bawah.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {tersimpan.map((foto, indeks) => {
            const yakin = siapHapus === foto.id;
            return (
              <li key={foto.id} className="relative">
                <img
                  src={urlFoto(foto.path)}
                  alt={`Foto ${indeks + 1}, ${foto.status}, ${formatTanggal(foto.dibuat_pada)}`}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-[10px] border border-border object-cover"
                />
                <button
                  type="button"
                  disabled={hapus.isPending}
                  onClick={() => hapusFoto(foto)}
                  onBlur={() => setSiapHapus((id) => (id === foto.id ? null : id))}
                  aria-label={
                    yakin
                      ? `Ketuk lagi untuk menghapus foto ${indeks + 1}`
                      : `Hapus foto ${indeks + 1}`
                  }
                  className={
                    yakin
                      ? 'absolute inset-x-1 bottom-1 inline-flex min-h-8 items-center justify-center gap-1 rounded-lg bg-[#b42318] px-2 text-[12px] font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b42318]'
                      : 'absolute top-1 right-1 grid size-7 place-items-center rounded-full border-[1.5px] border-edge bg-surface text-[#b42318] transition-[scale] duration-150 ease-out hover:bg-[#fbeae8] active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga'
                  }
                >
                  {yakin ? 'Yakin hapus?' : <Icon name="sampah" size={15} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {sisa > 0 && (
        <div className="mt-4 border-t border-rule pt-4">
          <PilihFoto files={baru} onChange={setBaru} sisa={sisa} disabled={unggah.isPending} />
          {baru.length > 0 && (
            <Button
              type="button"
              size="sm"
              className="mt-3"
              isLoading={unggah.isPending}
              disabled={unggah.isPending}
              onClick={() => void kirim()}
            >
              Kirim {baru.length} foto
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
