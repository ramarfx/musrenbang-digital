import type { Proposal } from '@musrenbang/shared';
import { useMemo } from 'react';
import { siapkanGap } from '@/features/gap/lib';
import { useGapQuery } from '@/features/gap/queries';
import { cn } from '@/lib/cn';
import { formatPersen, formatRupiah, formatTanggal } from '@/lib/format';
import { persenDari, totalPengeluaran } from '../lib';
import { useSpendingQuery } from '../queries';
import { DaftarPengeluaran } from './DaftarPengeluaran';

const sel = 'py-3 sm:px-5 sm:first:pl-0 sm:last:pr-0';

/**
 * Bagian "Dana pengerjaan" di dalam kartu Perjalanan usulan, untuk warga. Tiga angka sejajar:
 * dana terpakai, persennya terhadap estimasi, dan persennya terhadap APBD bidang usulan itu.
 * Persen APBD sengaja per bidang, bukan seluruh APBD kota, karena satu usulan terhadap seluruh
 * APBD hanya sepersekian persen dan tidak terbaca. Angka ketiga hilang bila APBD bidangnya belum
 * terverifikasi. Tidak tampil sama sekali sebelum ada catatan, supaya tidak ada angka kosong.
 */
export function DanaPengerjaan({ proposal }: { proposal: Proposal }) {
  const spending = useSpendingQuery(proposal.id);
  const gap = useGapQuery();
  const ringkasan = useMemo(() => siapkanGap(gap.data ?? []), [gap.data]);

  const catatan = spending.data ?? [];
  if (catatan.length === 0) return null;

  const total = totalPengeluaran(catatan);
  const persenEstimasi = persenDari(total, proposal.estimasi_biaya);
  const barisApbd = ringkasan.rows.find((row) => row.kategori === proposal.kategori && row.adaApbd);
  const persenApbd = persenDari(total, barisApbd?.nominal_apbd);
  const terakhir = catatan[catatan.length - 1]?.dicatat_pada;
  const melebihi = persenEstimasi !== null && persenEstimasi > 100;

  return (
    <section aria-labelledby="judul-dana-pengerjaan" className="mt-6 border-t border-rule pt-5">
      <h3 id="judul-dana-pengerjaan" className="text-base font-bold text-ink">
        Dana pengerjaan
      </h3>

      <dl className="mt-3 grid divide-y divide-border sm:grid-flow-col sm:auto-cols-fr sm:divide-x-[1.5px] sm:divide-y-0 sm:divide-edge">
        <div className={cn('flex flex-col-reverse', sel)}>
          <dt className="text-[13px] text-muted">terpakai</dt>
          <dd className="text-[26px] leading-tight font-extrabold tracking-[-0.03em] tabular-nums">
            {formatRupiah(total)}
          </dd>
        </div>
        {persenEstimasi !== null && (
          <div className={cn('flex flex-col-reverse', sel)}>
            <dt className="text-[13px] text-muted">
              dari estimasi {formatRupiah(proposal.estimasi_biaya)}
              {melebihi && (
                <span className="font-semibold text-[#b42318]"> (melebihi estimasi)</span>
              )}
            </dt>
            <dd className="text-[26px] leading-tight font-extrabold tracking-[-0.03em] tabular-nums">
              {formatPersen(persenEstimasi)}
            </dd>
          </div>
        )}
        {persenApbd !== null && (
          <div className={cn('flex flex-col-reverse', sel)}>
            <dt className="text-[13px] text-muted">dari APBD {proposal.kategori}</dt>
            <dd className="text-[26px] leading-tight font-extrabold tracking-[-0.03em] text-warga tabular-nums">
              {formatPersen(persenApbd)}
            </dd>
          </div>
        )}
      </dl>

      <p className="mt-2 text-[13px] text-muted">
        Dicatat admin, {catatan.length} entri
        {terakhir ? `, terakhir ${formatTanggal(terakhir)}` : ''}.
      </p>

      <details className="group mt-2">
        <summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-semibold text-warga underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga">
          Lihat rinciannya
        </summary>
        <div className="mt-2">
          <DaftarPengeluaran catatan={catatan} />
        </div>
      </details>
    </section>
  );
}
