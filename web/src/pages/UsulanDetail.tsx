import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../App';
import { formatRupiah, formatTanggal } from '../lib/format';
import type { Proposal } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { StatusBadge } from './Beranda';

type Komentar = {
  id: number;
  isi: string;
  dibuat_pada: string;
  profiles: { nama: string } | null;
};

export default function UsulanDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [usulan, setUsulan] = useState<Proposal | null>(null);
  const [jumlahSuara, setJumlahSuara] = useState(0);
  const [sudahMemilih, setSudahMemilih] = useState(false);
  const [komentar, setKomentar] = useState<Komentar[]>([]);
  const [isiKomentar, setIsiKomentar] = useState('');
  const [tidakDitemukan, setTidakDitemukan] = useState(false);

  const muatSuara = async (proposalId: number) => {
    const { count } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('proposal_id', proposalId);
    setJumlahSuara(count ?? 0);
    if (user) {
      const { data } = await supabase
        .from('votes')
        .select('id')
        .eq('proposal_id', proposalId)
        .eq('user_id', user.id)
        .maybeSingle();
      setSudahMemilih(Boolean(data));
    }
  };

  const muatKomentar = async (proposalId: number) => {
    const { data } = await supabase
      .from('comments')
      .select('id, isi, dibuat_pada, profiles(nama)')
      .eq('proposal_id', proposalId)
      .order('dibuat_pada', { ascending: true });
    type BarisKomentar = {
      id: number;
      isi: string;
      dibuat_pada: string;
      profiles: { nama: string }[] | { nama: string } | null;
    };
    const rows = (data as BarisKomentar[]) ?? [];
    setKomentar(
      rows.map((r) => ({
        ...r,
        profiles: Array.isArray(r.profiles) ? (r.profiles[0] ?? null) : r.profiles,
      })),
    );
  };

  useEffect(() => {
    if (!id) return;
    const proposalId = Number(id);
    supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setTidakDitemukan(true);
          return;
        }
        setUsulan(data as Proposal);
        muatSuara(proposalId);
        muatKomentar(proposalId);
      });
  }, [id, user]);

  const toggleSuara = async () => {
    if (!user || !usulan) return;
    if (sudahMemilih) {
      await supabase.from('votes').delete().eq('proposal_id', usulan.id).eq('user_id', user.id);
    } else {
      await supabase.from('votes').insert({ user_id: user.id, proposal_id: usulan.id });
    }
    muatSuara(usulan.id);
  };

  const kirimKomentar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !usulan || !isiKomentar.trim()) return;
    const { error } = await supabase.from('comments').insert({
      user_id: user.id,
      proposal_id: usulan.id,
      isi: isiKomentar.trim(),
    });
    if (!error) {
      setIsiKomentar('');
      muatKomentar(usulan.id);
    }
  };

  if (tidakDitemukan) {
    return <p className="text-stone-600">Usulan tidak ditemukan.</p>;
  }
  if (!usulan) {
    return <p className="text-stone-500">Memuat usulan...</p>;
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-3xl font-bold">{usulan.judul}</h1>
          <StatusBadge status={usulan.status} />
        </div>
        <p className="mt-3 text-stone-700">{usulan.deskripsi}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-stone-600">
          <span>Kategori: {usulan.kategori}</span>
          <span>Estimasi: {formatRupiah(usulan.estimasi_biaya)}</span>
          {usulan.lokasi && <span>Lokasi: {usulan.lokasi}</span>}
          <span>Diajukan {formatTanggal(usulan.dibuat_pada)}</span>
        </div>
      </section>

      <section className="flex items-center gap-4">
        <span className="text-lg font-bold">{jumlahSuara} suara</span>
        {user ? (
          <button
            type="button"
            onClick={toggleSuara}
            className={`rounded px-4 py-2 text-sm font-medium ${
              sudahMemilih
                ? 'bg-stone-200 text-stone-800 hover:bg-stone-300'
                : 'bg-emerald-800 text-white hover:bg-emerald-700'
            }`}
          >
            {sudahMemilih ? 'Batalkan Suara' : 'Beri Suara'}
          </button>
        ) : (
          <Link to="/login" className="text-sm font-medium underline">
            Masuk untuk memberi suara
          </Link>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Komentar</h2>
        {komentar.length === 0 ? (
          <p className="text-stone-500">Belum ada komentar.</p>
        ) : (
          <div className="space-y-3">
            {komentar.map((k) => (
              <div key={k.id} className="rounded border border-stone-200 bg-white p-3">
                <div className="flex justify-between text-sm text-stone-500">
                  <span>{k.profiles?.nama ?? 'Warga'}</span>
                  <span>{formatTanggal(k.dibuat_pada)}</span>
                </div>
                <p className="mt-1">{k.isi}</p>
              </div>
            ))}
          </div>
        )}
        {user ? (
          <form onSubmit={kirimKomentar} className="mt-4 space-y-2">
            <textarea
              value={isiKomentar}
              onChange={(e) => setIsiKomentar(e.target.value)}
              placeholder="Tulis komentar..."
              rows={3}
              className="w-full rounded border border-stone-300 px-3 py-2"
            />
            <button
              type="submit"
              className="rounded bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Kirim Komentar
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm">
            <Link to="/login" className="font-medium underline">
              Masuk
            </Link>{' '}
            untuk berkomentar.
          </p>
        )}
      </section>
    </div>
  );
}
