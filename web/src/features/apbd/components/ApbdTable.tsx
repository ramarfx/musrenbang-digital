import type { ApbdItem } from '@musrenbang/shared';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { formatRupiah } from '@/lib/format';
import { LABEL_STATUS_DATA, rapikanSumber, statusData, type StatusData } from '../lib';

const WARNA_STATUS: Record<StatusData, string> = {
  terverifikasi: 'bg-mint-pucat text-mint-tua',
  belum_terverifikasi: 'bg-mustard-pucat text-mustard-tua',
  kosong: 'bg-pasir text-ink',
};

/**
 * Tabel APBD per kategori. Angka yang belum terverifikasi tetap ditampilkan (muted, dengan
 * keterangan) supaya jelas apa yang ada di data, tetapi tidak pernah tampil seperti angka resmi.
 */
export function ApbdTable({ items }: { items: ApbdItem[] }) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          Rincian APBD per kategori beserta sumber dan status verifikasi
        </caption>
        <thead className="bg-ground text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Kategori</th>
            <th className="px-4 py-3 text-right font-semibold">Nominal</th>
            <th className="px-4 py-3 font-semibold">Sumber</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const status = statusData(item);
            const sumber = rapikanSumber(item.sumber);
            const catatan = rapikanSumber(item.catatan_pemetaan);
            return (
              <tr key={item.id} className="border-t border-rule align-top">
                <td className="px-4 py-3 font-medium">{item.kategori}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {status === 'kosong' ? (
                    <span className="text-muted">Belum ada</span>
                  ) : (
                    <>
                      <span className={status === 'terverifikasi' ? 'font-semibold' : 'text-muted'}>
                        {formatRupiah(item.nominal_rp)}
                      </span>
                      {status === 'belum_terverifikasi' && (
                        <span className="block text-[12px] text-muted">bukan angka resmi</span>
                      )}
                    </>
                  )}
                </td>
                <td className="max-w-md px-4 py-3 text-muted">
                  <span className="block">{sumber ?? 'Belum dicantumkan'}</span>
                  {item.sumber_url && (
                    <a
                      href={item.sumber_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-[13px] font-semibold text-warga underline"
                    >
                      Buka sumber
                    </a>
                  )}
                  {catatan && <span className="mt-1 block text-[12.5px]">{catatan}</span>}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex h-6 items-center rounded-lg px-2.5 text-xs font-semibold whitespace-nowrap',
                      WARNA_STATUS[status],
                    )}
                  >
                    {LABEL_STATUS_DATA[status]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
