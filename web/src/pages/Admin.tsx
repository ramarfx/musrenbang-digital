import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Gagal, JudulHalaman, Kosong, Memuat } from '../components/Halaman';
import { Kartu } from '../components/Kartu';
import { StatusPill } from '../components/Label';
import { ambilUsulan, ubahStatusUsulan } from '../lib/data';
import type { Proposal } from '../lib/supabase';
import { TAHAP } from '../lib/status';
import { useMuat } from '../lib/useMuat';

export default function Admin() {
  const { user, profile } = useAuth();
  const { data, memuat, galat, ulangi } = useMuat(ambilUsulan);
  const [pesan, setPesan] = useState('');

  if (!user) {
    return (
      <>
        <JudulHalaman judul="Kelola usulan" />
        <p>
          Halaman admin butuh akun.{' '}
          <Link to="/login" className="font-semibold text-warga underline">
            Masuk dulu
          </Link>
          .
        </p>
      </>
    );
  }
  if (profile?.peran !== 'admin') {
    return <JudulHalaman judul="Kelola usulan" sub="Halaman ini hanya untuk admin." />;
  }

  const ubahStatus = async (usulan: Proposal, statusBaru: string) => {
    if (statusBaru === usulan.status) return;
    const { error } = await ubahStatusUsulan(usulan, statusBaru, user.id);
    setPesan(
      error
        ? `Gagal mengubah status: ${error}`
        : `Status "${usulan.judul}" diubah menjadi ${statusBaru}.`,
    );
    if (!error) ulangi();
  };

  return (
    <>
      <JudulHalaman
        judul="Kelola usulan"
        sub="Ubah status usulan. Setiap perubahan dicatat di riwayat status."
      />
      {pesan && (
        <p role="status" className="mb-4 text-sm">
          {pesan}
        </p>
      )}
      {memuat ? (
        <Memuat apa="usulan" />
      ) : galat ? (
        <Gagal apa="usulan" pesan={galat} ulangi={ulangi} />
      ) : (data ?? []).length === 0 ? (
        <Kosong>Belum ada usulan untuk dikelola.</Kosong>
      ) : (
        <Kartu className="py-2! sm:py-2!">
          <ul>
            {(data ?? []).map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-rule py-3.5 first:border-t-0"
              >
                <div className="min-w-0">
                  <Link to={`/usulan/${u.id}`} className="font-semibold">
                    {u.judul}
                  </Link>
                  <div className="mt-1">
                    <StatusPill status={u.status} />
                  </div>
                </div>
                <select
                  aria-label={`Ubah status ${u.judul}`}
                  value={u.status}
                  onChange={(e) => ubahStatus(u, e.target.value)}
                  className="h-11 rounded-full border border-border bg-surface px-4"
                >
                  {TAHAP.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </Kartu>
      )}
    </>
  );
}
