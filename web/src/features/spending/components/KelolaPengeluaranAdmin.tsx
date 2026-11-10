import { STATUS_BERANGGARAN, spendingInputSchema, type Proposal } from '@musrenbang/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatRupiah } from '@/lib/format';
import { angkaDariKetikan, totalPengeluaran } from '../lib';
import { useCatatPengeluaranMutation, useSpendingQuery } from '../queries';
import { DaftarPengeluaran } from './DaftarPengeluaran';

const JUDUL_ID = 'judul-catat-pengeluaran';

/**
 * Pop-up catat pengeluaran. Catatan tampil ke warga dan tidak bisa diubah, jadi salah catat
 * dikoreksi dengan entri baru yang mengurangi total (kotak centang "koreksi"), bukan diedit.
 */
function DialogCatat({
  proposal,
  totalSekarang,
  onClose,
}: {
  proposal: Proposal;
  totalSekarang: number;
  onClose: () => void;
}) {
  const mutation = useCatatPengeluaranMutation();
  const [jumlah, setJumlah] = useState('');
  const [galat, setGalat] = useState<string | null>(null);

  const angka = angkaDariKetikan(jumlah);
  // Admin mengisi total keseluruhan; yang disimpan selisihnya dari total tercatat, supaya
  // riwayat tetap tambah-saja dan total di database selalu sama dengan yang diisi admin.
  const selisih = angka - totalSekarang;

  const simpan = (event: React.FormEvent) => {
    event.preventDefault();
    if (jumlah.trim() === '') {
      setGalat('Isi total dana yang terpakai.');
      return;
    }
    if (selisih === 0) {
      setGalat('Totalnya sama dengan yang sudah tercatat.');
      return;
    }
    const koreksi = selisih < 0;
    const periksa = spendingInputSchema.safeParse({
      proposalId: proposal.id,
      jumlah: Math.abs(selisih),
      koreksi,
      keterangan: koreksi
        ? 'Koreksi total dana terpakai'
        : totalSekarang === 0
          ? 'Total dana terpakai'
          : 'Pembaruan total dana terpakai',
    });
    if (!periksa.success) {
      setGalat(periksa.error.issues[0]?.message ?? 'Isian belum benar.');
      return;
    }
    setGalat(null);
    mutation.mutate(periksa.data, {
      onSuccess: () => {
        toast.success('Total dana terpakai disimpan.');
        onClose();
      },
      onError: (error) => setGalat(error.message),
    });
  };

  return (
    <Modal open onClose={onClose} labelledBy={JUDUL_ID} className="w-[min(480px,calc(100vw-24px))]">
      <form onSubmit={simpan} className="space-y-4 p-5 sm:p-6" noValidate>
        <div>
          <h2 id={JUDUL_ID} className="text-xl font-bold">
            Catat pengeluaran
          </h2>
          <p className="mt-1 text-sm text-muted">
            Isi total keseluruhan dana yang sudah terpakai untuk usulan ini. Angka ini tampil ke
            warga. Kalau nanti bertambah, isi lagi dengan total terbarunya.
          </p>
        </div>

        <Field
          label="Total dana terpakai (Rupiah)"
          htmlFor="jumlah-pengeluaran"
          required
          hint={totalSekarang > 0 ? `Saat ini tercatat ${formatRupiah(totalSekarang)}.` : undefined}
        >
          <Input
            id="jumlah-pengeluaran"
            inputMode="numeric"
            autoComplete="off"
            placeholder="mis. 75000000"
            value={jumlah}
            onChange={(event) => setJumlah(event.target.value)}
          />
          {jumlah.trim() !== '' && (
            <p className="mt-1 text-[13px] font-semibold text-ink tabular-nums" aria-live="polite">
              {formatRupiah(angka)}
            </p>
          )}
        </Field>

        {galat && (
          <p role="alert" className="text-sm text-red-700">
            {galat}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" isLoading={mutation.isPending} disabled={mutation.isPending}>
            Simpan total
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Bagian admin di dalam kartu "Isi usulan": total tercatat, riwayat, dan tombol catat. Hanya
 * tampil saat usulan berstatus Masuk APBD, Dikerjakan, atau Selesai, sama dengan aturan di
 * database.
 */
export function KelolaPengeluaranAdmin({ proposal }: { proposal: Proposal }) {
  const query = useSpendingQuery(proposal.id);
  const [buka, setBuka] = useState(false);

  if (!(STATUS_BERANGGARAN as readonly string[]).includes(proposal.status)) return null;

  const catatan = query.data ?? [];
  const total = totalPengeluaran(catatan);

  return (
    <section aria-labelledby="judul-pengeluaran-admin" className="mt-5 border-t border-rule pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="judul-pengeluaran-admin" className="text-base font-bold">
            Pengeluaran pengerjaan
          </h3>
          <p className="mt-0.5 text-sm text-muted">
            Total tercatat {formatRupiah(total)} dari estimasi{' '}
            {formatRupiah(proposal.estimasi_biaya)}.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setBuka(true)}>
          {catatan.length === 0 ? 'Isi total dana' : 'Ubah total'}
        </Button>
      </div>

      {query.isPending ? (
        <p className="mt-3 text-sm text-muted">Memuat catatan...</p>
      ) : query.isError ? (
        <div className="mt-3">
          <p role="alert" className="text-sm text-red-700">
            Catatan belum bisa dimuat: {query.error.message}
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
      ) : catatan.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          Belum ada pengeluaran tercatat. Warga baru melihat bagian dana setelah ada catatan.
        </p>
      ) : (
        <div className="mt-2">
          <DaftarPengeluaran catatan={catatan} />
        </div>
      )}

      {buka && (
        <DialogCatat proposal={proposal} totalSekarang={total} onClose={() => setBuka(false)} />
      )}
    </section>
  );
}
