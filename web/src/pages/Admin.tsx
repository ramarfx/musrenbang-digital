import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import type { Proposal } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { StatusBadge } from './Beranda';

const TAHAP = ['Diajukan', 'Diverifikasi', 'Masuk APBD', 'Dikerjakan', 'Selesai'];

export default function Admin() {
  const { user, profile } = useAuth();
  const [usulan, setUsulan] = useState<Proposal[]>([]);
  const [pesan, setPesan] = useState('');

  const muat = async () => {
    const { data } = await supabase
      .from('proposals')
      .select('*')
      .order('dibuat_pada', { ascending: false });
    setUsulan((data as Proposal[]) ?? []);
  };

  useEffect(() => {
    muat();
  }, []);

  if (!user) {
    return (
      <p className="text-stone-700">
        Halaman admin butuh akun.{' '}
        <Link to="/login" className="font-medium underline">
          Masuk dulu
        </Link>
        .
      </p>
    );
  }
  if (profile?.peran !== 'admin') {
    return <p className="text-stone-700">Halaman ini hanya untuk admin.</p>;
  }

  const ubahStatus = async (proposal: Proposal, statusBaru: string) => {
    if (statusBaru === proposal.status) return;
    const { error } = await supabase
      .from('proposals')
      .update({ status: statusBaru })
      .eq('id', proposal.id);
    if (error) {
      setPesan(`Gagal mengubah status: ${error.message}`);
      return;
    }
    await supabase.from('proposal_status_history').insert({
      proposal_id: proposal.id,
      status_lama: proposal.status,
      status_baru: statusBaru,
      diubah_oleh: user.id,
    });
    setPesan(`Status "${proposal.judul}" diubah menjadi ${statusBaru}.`);
    muat();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin: Kelola Usulan</h1>
      <p className="text-stone-600">
        Mengubah status otomatis mencatat riwayat di tabel status history.
      </p>
      {pesan && <p className="text-sm text-stone-700">{pesan}</p>}
      <div className="space-y-3">
        {usulan.map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded border border-stone-200 bg-white p-4"
          >
            <div>
              <Link to={`/usulan/${u.id}`} className="font-medium">
                {u.judul}
              </Link>
              <div className="mt-1">
                <StatusBadge status={u.status} />
              </div>
            </div>
            <select
              aria-label={`Ubah status ${u.judul}`}
              value={u.status}
              onChange={(e) => ubahStatus(u, e.target.value)}
              className="rounded border border-stone-300 px-3 py-2"
            >
              {TAHAP.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        ))}
        {usulan.length === 0 && <p className="text-stone-500">Belum ada usulan.</p>}
      </div>
    </div>
  );
}
