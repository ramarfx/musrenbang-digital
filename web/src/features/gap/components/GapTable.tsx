import type { GapItem } from '@musrenbang/shared';
import { Card } from '@/components/ui/Card';
import { formatPersen, formatRupiah } from '@/lib/format';

export function GapTable({ items }: { items: GapItem[] }) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          Perbandingan persentase alokasi warga dan APBD per kategori
        </caption>
        <thead className="bg-stone-100 text-stone-700">
          <tr>
            <th className="px-4 py-3 font-semibold">Kategori</th>
            <th className="px-4 py-3 text-right font-semibold">Warga</th>
            <th className="px-4 py-3 text-right font-semibold">APBD</th>
            <th className="px-4 py-3 text-right font-semibold">Gap</th>
            <th className="px-4 py-3 text-right font-semibold">Nominal APBD</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const positif = item.gap_poin_persen > 0;
            const nol = item.gap_poin_persen === 0;
            return (
              <tr key={item.kategori} className="border-t border-stone-100">
                <td className="px-4 py-2 font-medium text-stone-800">{item.kategori}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatPersen(item.persen_warga)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatPersen(item.persen_apbd)}
                </td>
                <td
                  className={`px-4 py-2 text-right font-semibold tabular-nums ${
                    nol ? 'text-stone-500' : positif ? 'text-emerald-800' : 'text-amber-700'
                  }`}
                >
                  {positif ? '+' : ''}
                  {item.gap_poin_persen.toLocaleString('id-ID', {
                    maximumFractionDigits: 2,
                  })}{' '}
                  poin
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatRupiah(item.nominal_apbd)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
