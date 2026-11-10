import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { formatPersen } from '@/lib/format';
import { potretPrioritas, type GapRingkasan, type GapRow } from '../lib';

/** Kalimat hasil tumpang tindih peringkat, ditulis apa adanya tanpa angka karangan. */
function kalimatTumpangTindih(sama: number, jumlah: number): string {
  if (jumlah === 1) {
    return sama === 1
      ? 'Prioritas teratas warga juga menjadi prioritas teratas APBD.'
      : 'Prioritas teratas warga belum masuk prioritas teratas APBD.';
  }
  if (jumlah === 2) {
    if (sama === 2) return 'Kedua prioritas teratas warga juga masuk dua teratas APBD.';
    if (sama === 1) return 'Satu dari dua prioritas teratas warga masuk dua teratas APBD.';
    return 'Tidak ada prioritas teratas warga yang masuk dua teratas APBD.';
  }
  if (sama === 3) return 'Ketiga prioritas teratas warga juga masuk tiga teratas APBD.';
  if (sama === 2) return 'Dua dari tiga prioritas teratas warga juga masuk tiga teratas APBD.';
  if (sama === 1) return 'Satu dari tiga prioritas teratas warga masuk tiga teratas APBD.';
  return 'Tidak ada prioritas teratas warga yang masuk tiga teratas APBD.';
}

function Sisi({
  judul,
  warna,
  rows,
  kunci,
}: {
  judul: string;
  warna: string;
  rows: GapRow[];
  kunci: 'persen_warga' | 'persen_apbd';
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="flex items-center gap-2 text-[13.5px] font-semibold text-muted">
        <span className={cn('size-2.5 flex-none rounded-[3px]', warna)} aria-hidden="true" />
        {judul}
      </p>
      <ol className="mt-3 space-y-2.5">
        {rows.map((row, index) => (
          <li key={row.kategori} className="flex items-baseline gap-2.5 text-[15px]">
            <span className="w-4 flex-none text-[13px] text-muted tabular-nums">{index + 1}</span>
            <span className="min-w-0 flex-1 font-semibold">{row.kategori}</span>
            <b className="flex-none font-semibold tabular-nums">{formatPersen(row[kunci])}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Membandingkan tiga bidang teratas dari kedua sisi. Ini menjawab pertanyaan "secara
 * keseluruhan mirip atau tidak" tanpa menambah skor karangan: hanya urutan dan jumlah
 * bidang yang sama-sama masuk tiga teratas.
 */
export function GapPotret({ ringkasan }: { ringkasan: GapRingkasan }) {
  const potret = potretPrioritas(ringkasan.rows);
  const adaPilihan = potret.warga.some((row) => row.persen_warga > 0);
  if (!ringkasan.adaWarga || !adaPilihan) return null;

  const jumlah = potret.warga.length;

  return (
    <Card>
      <h2 className="text-lg font-bold tracking-[-0.01em]">
        Seberapa mirip prioritas warga dengan APBD?
      </h2>
      <p className="mt-1 max-w-[62ch] text-[14px] text-muted">
        Dari {jumlah} bidang dengan porsi terbesar di tiap sisi.
      </p>
      <p className="mt-4 max-w-[48ch] text-[17px] leading-snug font-semibold sm:text-[18px]">
        {kalimatTumpangTindih(potret.sama, jumlah)}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Sisi judul="Pilihan warga" warna="bg-warga" rows={potret.warga} kunci="persen_warga" />
        <Sisi judul="APBD" warna="bg-apbd" rows={potret.apbd} kunci="persen_apbd" />
      </div>

      <p className="mt-4 text-[13px] text-muted">
        Hanya bidang yang APBD-nya sudah terverifikasi yang ikut dihitung. Pilihan warga berasal
        dari simulator, bukan jumlah usulan.
      </p>
    </Card>
  );
}
