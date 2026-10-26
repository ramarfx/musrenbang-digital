import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPersen, formatRupiah } from '../lib/format';
import type { GapItem } from '../lib/supabase';
import { supabase } from '../lib/supabase';

export default function Bandingkan() {
  const [items, setItems] = useState<GapItem[]>([]);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    supabase
      .from('v_gap')
      .select('*')
      .then(({ data }) => {
        const rows = ((data as GapItem[]) ?? []).sort(
          (a, b) => Math.abs(b.gap_poin_persen) - Math.abs(a.gap_poin_persen),
        );
        setItems(rows);
        setMemuat(false);
      });
  }, []);

  const sorotan = items[0];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold">Bandingkan: Warga vs APBD</h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Persentase alokasi warga dibandingkan dengan persentase APBD per kategori. Selisihnya
          adalah gap: positif berarti warga memprioritaskan kategori itu lebih tinggi daripada APBD,
          negatif berarti sebaliknya.
        </p>
      </section>

      {memuat ? (
        <p className="text-stone-500">Memuat perbandingan...</p>
      ) : items.length === 0 ? (
        <p className="rounded border border-dashed border-stone-300 p-6 text-center text-stone-500">
          Belum ada data gap. Pastikan seed APBD sudah dimuat.
        </p>
      ) : (
        <>
          {sorotan && (
            <section className="rounded border border-amber-300 bg-amber-50 p-4">
              <h2 className="font-bold">Gap terbesar: {sorotan.kategori}</h2>
              <p className="mt-1 text-sm text-stone-700">
                Warga mengalokasikan {formatPersen(sorotan.persen_warga)} untuk {sorotan.kategori},
                sementara APBD mengalokasikan {formatPersen(sorotan.persen_apbd)}. Selisihnya{' '}
                {sorotan.gap_poin_persen.toLocaleString('id-ID')} poin persen.
              </p>
            </section>
          )}

          <section className="rounded border border-stone-200 bg-white p-4">
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={items} layout="vertical" margin={{ right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" unit="%" />
                  <YAxis type="category" dataKey="kategori" width={160} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Legend />
                  <Bar dataKey="persen_warga" name="Warga" fill="#065f46" />
                  <Bar dataKey="persen_apbd" name="APBD" fill="#d97706" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="overflow-x-auto rounded border border-stone-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-100">
                <tr>
                  <th className="px-4 py-2">Kategori</th>
                  <th className="px-4 py-2">Warga</th>
                  <th className="px-4 py-2">APBD</th>
                  <th className="px-4 py-2">Gap</th>
                  <th className="px-4 py-2">Nominal APBD</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.kategori} className="border-t border-stone-100">
                    <td className="px-4 py-2 font-medium">{item.kategori}</td>
                    <td className="px-4 py-2">{formatPersen(item.persen_warga)}</td>
                    <td className="px-4 py-2">{formatPersen(item.persen_apbd)}</td>
                    <td className="px-4 py-2">
                      {item.gap_poin_persen > 0 ? '+' : ''}
                      {item.gap_poin_persen.toLocaleString('id-ID')} poin
                    </td>
                    <td className="px-4 py-2">{formatRupiah(item.nominal_apbd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
