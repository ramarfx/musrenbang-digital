import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';

const CATATAN_MAKS = 2000;

type CatatanDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Judul pop-up. */
  judul: string;
  /** Penjelasan singkat di bawah judul, mis. nama usulan. */
  keterangan: ReactNode;
  /** Label kolom catatan, mis. "Catatan perubahan" atau "Alasan penolakan". */
  labelCatatan: string;
  /** Teks tombol kirim. */
  kirim: string;
  /** Tambahan kolom di atas catatan (mis. pilihan status). */
  tambahan?: ReactNode;
  /** Menonaktifkan kirim di luar aturan catatan, mis. status belum dipilih. */
  bisaKirim?: boolean;
  isPending: boolean;
  errorMessage?: string;
  onSubmit: (catatan: string) => void;
};

/**
 * Pop-up dengan satu kolom catatan wajib (1 sampai 2000 karakter setelah dipangkas). Dipakai
 * untuk perubahan status bercatatan dan penolakan usulan. Catatan tidak pernah diisi otomatis:
 * admin harus menulisnya sendiri, supaya riwayat audit berisi alasan yang sungguhan.
 */
export function CatatanDialog({
  open,
  onClose,
  judul,
  keterangan,
  labelCatatan,
  kirim,
  tambahan,
  bisaKirim = true,
  isPending,
  errorMessage,
  onSubmit,
}: CatatanDialogProps) {
  const [catatan, setCatatan] = useState('');
  const [disentuh, setDisentuh] = useState(false);

  // Kolom dikosongkan setiap kali pop-up dibuka lagi.
  useEffect(() => {
    if (open) {
      setCatatan('');
      setDisentuh(false);
    }
  }, [open]);

  const panjang = catatan.trim().length;
  const kosong = panjang === 0;
  const kelebihan = panjang > CATATAN_MAKS;
  const galat =
    disentuh && kosong
      ? `${labelCatatan} wajib diisi.`
      : kelebihan
        ? `${labelCatatan} maksimal ${CATATAN_MAKS} karakter.`
        : undefined;

  const kirimForm = () => {
    setDisentuh(true);
    if (kosong || kelebihan || !bisaKirim) return;
    onSubmit(catatan.trim());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="catatan-judul"
      className="w-[min(520px,calc(100vw-24px))]"
    >
      <form
        className="space-y-4 p-5 sm:p-7"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          kirimForm();
        }}
      >
        <div>
          <h2 id="catatan-judul" className="text-xl font-bold tracking-[-0.02em]">
            {judul}
          </h2>
          <p className="mt-1 text-sm text-muted">{keterangan}</p>
        </div>

        {tambahan}

        <Field label={labelCatatan} htmlFor="catatan-isi" error={galat} required>
          <Textarea
            id="catatan-isi"
            value={catatan}
            onChange={(event) => setCatatan(event.target.value)}
            onBlur={() => setDisentuh(true)}
            invalid={Boolean(galat)}
            maxLength={CATATAN_MAKS + 200}
            rows={4}
          />
          <p className="text-right text-xs text-muted tabular-nums">
            {panjang} dari {CATATAN_MAKS}
          </p>
        </Field>

        {errorMessage && <ErrorState title="Gagal menyimpan" message={errorMessage} />}

        <div className="flex flex-wrap justify-end gap-2.5 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button type="submit" isLoading={isPending} disabled={!bisaKirim}>
            {kirim}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
