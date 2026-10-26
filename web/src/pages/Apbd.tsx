import { useEffect, useState } from 'react';
import { formatRupiah } from '../lib/format';
import type { ApbdItem } from '../lib/supabase';
import { supabase } from '../lib/supabase';

export default function Apbd() {
  const [items, setItems] = useState<ApbdItem[]>([]);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    supabase
      .from('apbd_items')
      .select('*')
      .order('kategori')
      .then(({ data }) => {
        setItems((data as ApbdItem[]) ?? []);
        setMemuat(false);
      });
  }, []);

  const total = items.reduce((sum, item) => sum + item.nominal_rp, 0);
  const kota = items[0]?.kota ?? 'DKI Jakarta';
  const tahun = items[0]?.tahun ?? 2026;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold">
          APBD {kota} {tahun}
        </h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Angka kategori adalah hasil pemetaan dari pos APBD resmi. Total di bawah adalah total pos
          yang terisi di seed, bukan total belanja daerah resmi.
        </p>
        <p className="mt-2 text-lg font-bold">Total terisi: {formatRupiah(total)}</p>
      </section>

      {memuat ? (
        <p className="text-stone-500">Memuat data APBD...</p>
      ) : items.length === 0 ? (
        <p className="rounded border border-dashed border-stone-300 p-6 text-center text-stone-500">
          Belum ada data APBD. Jalankan seed dari folder project.
        </p>
      ) : (
        <section className="overflow-x-auto rounded border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-100">
              <tr>
                <th className="px-4 py-2">Kategori</th>
                <th className="px-4 py-2">Nominal</th>
                <th className="px-4 py-2">Sumber</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-stone-100">
                  <td className="px-4 py-2 font-medium">{item.kategori}</td>
                  <td className="px-4 py-2">
                    {item.nominal_rp > 0 ? formatRupiah(item.nominal_rp) : 'Data menyusul'}
                  </td>
                  <td className="px-4 py-2 text-stone-600">{item.sumber || '-'}</td>
                  <td className="px-4 py-2">
                    {item.status_verifikasi === 'verified_program'
                      ? 'Terverifikasi'
                      : 'Perlu lampiran'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
