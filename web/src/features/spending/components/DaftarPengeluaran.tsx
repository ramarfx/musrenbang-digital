import type { ProposalSpending } from '@musrenbang/shared';
import { cn } from '@/lib/cn';
import { formatRupiah, formatTanggal } from '@/lib/format';
import { sumberBerupaTautan } from '../lib';

/**
 * Riwayat catatan pengeluaran, yang paling baru di atas. Koreksi ditandai minus dan tulisan
 * merah tua; sumbernya berupa tautan bila alamat web, selain itu teks biasa (mis. nomor kontrak).
 * Dipakai di kartu admin dan di rincian untuk warga, jadi isinya persis sama di kedua tempat.
 */
export function DaftarPengeluaran({ catatan }: { catatan: ProposalSpending[] }) {
  const urut = [...catatan].reverse();
  return (
    <ul className="divide-y divide-border">
      {urut.map((item) => {
        const koreksi = item.jumlah < 0;
        return (
          <li key={item.id} className="flex items-start justify-between gap-4 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="font-semibold text-ink [overflow-wrap:anywhere]">{item.keterangan}</p>
              <p className="text-[12.5px] text-muted [overflow-wrap:anywhere]">
                {formatTanggal(item.dicatat_pada)}
                {item.sumber && (
                  <>
                    {' · '}
                    {sumberBerupaTautan(item.sumber) ? (
                      <a
                        href={item.sumber}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-warga underline"
                      >
                        Lihat dokumen
                      </a>
                    ) : (
                      item.sumber
                    )}
                  </>
                )}
              </p>
            </div>
            <span
              className={cn(
                'flex-none font-bold whitespace-nowrap tabular-nums',
                koreksi && 'text-[#b42318]',
              )}
            >
              {koreksi ? '−' : ''}
              {formatRupiah(Math.abs(item.jumlah))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
