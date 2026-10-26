import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { formatRupiah } from '../lib/format';
import { supabase } from '../lib/supabase';

const ANGGARAN_VIRTUAL = 10_000_000;

export default function Simulator() {
  const { user } = useAuth();
  const [kategori, setKategori] = useState<string[]>([]);
  const [alokasi, setAlokasi] = useState<Record<string, number>>({});
  const [pesan, setPesan] = useState('');

  useEffect(() => {
    supabase
      .from('categories')
      .select('nama')
      .order('nama')
      .then(({ data }) => {
        const names = ((data as { nama: string }[]) ?? []).map((r) => r.nama);
        setKategori(names);
        setAlokasi(Object.fromEntries(names.map((n) => [n, 0])));
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('allocations')
      .select('kategori, jumlah')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const rows = (data as { kategori: string; jumlah: number }[]) ?? [];
        if (rows.length > 0) {
          setAlokasi((prev) => {
            const next = { ...prev };
            for (const r of rows) next[r.kategori] = r.jumlah;
            return next;
          });
        }
      });
  }, [user]);

  const total = Object.values(alokasi).reduce((sum, v) => sum + v, 0);
  const sisa = ANGGARAN_VIRTUAL - total;

  const simpan = async () => {
    if (!user) return;
    const rows = Object.entries(alokasi).map(([kat, jumlah]) => ({
      user_id: user.id,
      kategori: kat,
      jumlah,
    }));
    const { error } = await supabase
      .from('allocations')
      .upsert(rows, { onConflict: 'user_id,kategori' });
    setPesan(error ? `Gagal menyimpan: ${error.message}` : 'Alokasi tersimpan.');
  };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold">Simulator Anggaran Virtual</h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Setiap warga mendapat anggaran virtual {formatRupiah(ANGGARAN_VIRTUAL)} untuk dibagikan ke
          10 kategori. Geser slider-nya, lalu simpan. Agregat semua warga tampil di halaman
          Bandingkan.
        </p>
      </section>

      <section className="rounded border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap gap-6 text-lg">
          <span>
            Total dialokasikan: <strong>{formatRupiah(total)}</strong>
          </span>
          <span className={sisa < 0 ? 'font-bold text-red-700' : 'font-bold text-emerald-800'}>
            Sisa: {formatRupiah(sisa)}
          </span>
        </div>
        {sisa < 0 && (
          <p className="mt-2 text-sm text-red-700">
            Total melebihi anggaran virtual. Kurangi alokasi sebelum menyimpan.
          </p>
        )}
      </section>

      <section className="space-y-4">
        {kategori.map((kat) => (
          <div key={kat} className="rounded border border-stone-200 bg-white p-4">
            <div className="flex justify-between gap-2">
              <label htmlFor={`slider-${kat}`} className="font-medium">
                {kat}
              </label>
              <span className="text-sm text-stone-600">{formatRupiah(alokasi[kat] ?? 0)}</span>
            </div>
            <input
              id={`slider-${kat}`}
              type="range"
              min={0}
              max={ANGGARAN_VIRTUAL}
              step={100_000}
              value={alokasi[kat] ?? 0}
              onChange={(e) => setAlokasi((prev) => ({ ...prev, [kat]: Number(e.target.value) }))}
              className="mt-2 w-full accent-emerald-800"
            />
          </div>
        ))}
      </section>

      {user ? (
        <button
          type="button"
          onClick={simpan}
          disabled={sisa < 0}
          className="rounded bg-emerald-800 px-5 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Simpan Alokasi
        </button>
      ) : (
        <p className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">
          Simulasi bisa digeser tanpa login, tetapi menyimpan butuh akun.{' '}
          <Link to="/login" className="font-medium underline">
            Masuk dulu
          </Link>
          .
        </p>
      )}
      {pesan && <p className="text-sm text-stone-700">{pesan}</p>}
    </div>
  );
}
