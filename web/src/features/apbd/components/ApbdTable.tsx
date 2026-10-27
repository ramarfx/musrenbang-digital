import type { ApbdItem } from '@musrenbang/shared';
import { Card } from '@/components/ui/Card';
import { formatRupiah } from '@/lib/format';
import { labelVerifikasi } from '../lib';

export function ApbdTable({ items }: { items: ApbdItem[] }) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          Rincian APBD per kategori beserta sumber dan status verifikasi
        </caption>
        <thead className="bg-stone-100 text-stone-700">
          <tr>
            <th className="px-4 py-3 font-semibold">Kategori</th>
            <th className="px-4 py-3 text-right font-semibold">Nominal</th>
            <th className="px-4 py-3 font-semibold">Sumber</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-stone-100 align-top">
              <td className="px-4 py-3 font-medium text-stone-800">{item.kategori}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {item.nominal_rp > 0 ? (
                  formatRupiah(item.nominal_rp)
                ) : (
                  <span className="text-stone-400">Data menyusul</span>
                )}
              </td>
              <td className="max-w-md px-4 py-3 text-stone-600">{item.sumber || '-'}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    item.status_verifikasi === 'verified_program'
                      ? 'text-emerald-800'
                      : 'text-mustard-tua'
                  }
                >
                  {labelVerifikasi(item.status_verifikasi)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
