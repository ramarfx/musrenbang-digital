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
function DialogCatat({ proposal, onClose }: { proposal: Proposal; onClose: () => void }) {
  const mutation = useCatatPengeluaranMutation();
  const [jumlah, setJumlah] = useState('');
  const [koreksi, setKoreksi] = useState(false);
  const [keterangan, setKeterangan] = useState('');
  const [sumber, setSumber] = useState('');
  const [galat, setGalat] = useState<string | null>(null);

  const angka = angkaDariKetikan(jumlah);

  const simpan = (event: React.FormEvent) => {
    event.preventDefault();
    const periksa = spendingInputSchema.safeParse({
      proposalId: proposal.id,
      jumlah: angka,
      koreksi,
      keterangan,
      sumber,
    });
    if (!periksa.success) {
      setGalat(periksa.error.issues[0]?.message ?? 'Isian belum benar.');
      return;
    }
    setGalat(null);
    mutation.mutate(periksa.data, {
      onSuccess: () => {
        toast.success(koreksi ? 'Koreksi dicatat.' : 'Pengeluaran dicatat.');
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
            Catatan ini tampil ke warga dan tidak bisa diubah atau dihapus. Salah catat? Centang
            koreksi dan masukkan jumlah yang mau dikurangi.
          </p>
        </div>

        <Field label="Jumlah (Rupiah)" htmlFor="jumlah-pengeluaran" required>
          <Input
            id="jumlah-pengeluaran"
            inputMode="numeric"
            autoComplete="off"
            placeholder="mis. 50000000"
            value={jumlah}
            onChange={(event) => setJumlah(event.target.value)}
          />
          {angka > 0 && (
            <p className="mt-1 text-[13px] font-semibold text-ink tabular-nums" aria-live="polite">
              {koreksi ? '−' : ''}
              {formatRupiah(angka)}
            </p>
          )}
        </Field>

        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={koreksi}
            onChange={(event) => setKoreksi(event.target.checked)}
            className="mt-0.5 size-4 accent-[#b42318]"
          />
          <span>
            <span className="font-semibold">Ini koreksi</span>
            <span className="block text-[13px] text-muted">
              Jumlahnya dikurangkan dari total, bukan ditambahkan.
            </span>
          </span>
        </label>

        <Field label="Untuk apa" htmlFor="keterangan-pengeluaran" required>
          <Input
            id="keterangan-pengeluaran"
            placeholder="mis. Termin 2 pembelian pompa"
            maxLength={300}
            value={keterangan}
            onChange={(event) => setKeterangan(event.target.value)}
          />
        </Field>

        <Field
          label="Sumber (boleh kosong)"
          htmlFor="sumber-pengeluaran"
          hint="Nomor kontrak, nomor SP2D, atau tautan dokumen, supaya angkanya bisa diperiksa."
        >
          <Input
            id="sumber-pengeluaran"
            maxLength={300}
            value={sumber}
            onChange={(event) => setSumber(event.target.value)}
          />
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
            Simpan catatan
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
          Catat pengeluaran
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

      {buka && <DialogCatat proposal={proposal} onClose={() => setBuka(false)} />}
    </section>
  );
}
