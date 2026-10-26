import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { JudulHalaman } from '../components/Halaman';
import { Kartu } from '../components/Kartu';
import { Tombol } from '../components/Tombol';
import { daftar, masuk } from '../lib/data';

const kelasInput = 'w-full rounded-2xl border border-border bg-surface px-3.5 py-2.5';
const kelasLabel = 'mb-1.5 block font-medium';

export default function Auth() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'daftar'>('login');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pesan, setPesan] = useState('');

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setPesan('');
    if (mode === 'daftar') {
      const hasil = await daftar(email, password, nama);
      if (hasil.error) {
        setPesan(`Gagal mendaftar: ${hasil.error}`);
        return;
      }
      if (hasil.perluKonfirmasi) {
        setPesan('Akun dibuat. Cek email untuk konfirmasi (bila diaktifkan), lalu masuk.');
        setMode('login');
        return;
      }
    } else {
      const hasil = await masuk(email, password, nama);
      if (hasil.error) {
        setPesan(`Gagal masuk: ${hasil.error}`);
        return;
      }
    }
    await refresh();
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-md">
      <JudulHalaman
        judul={mode === 'login' ? 'Masuk' : 'Daftar akun warga'}
        sub="Akun dipakai untuk mengirim pilihan anggaran, membuat usulan, dan mendukung usulan."
      />
      <Kartu>
        <form onSubmit={kirim} className="flex flex-col gap-4">
          {mode === 'daftar' && (
            <div>
              <label htmlFor="nama" className={kelasLabel}>
                Nama
              </label>
              <input
                id="nama"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
                autoComplete="name"
                className={kelasInput}
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className={kelasLabel}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={kelasInput}
            />
          </div>
          <div>
            <label htmlFor="password" className={kelasLabel}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className={kelasInput}
            />
          </div>
          <Tombol type="submit" varian="utama" className="w-full">
            {mode === 'login' ? 'Masuk' : 'Daftar'}
          </Tombol>
          {pesan && (
            <p role="status" className="text-sm">
              {pesan}
            </p>
          )}
        </form>
      </Kartu>
      <p className="mt-4 text-center text-sm">
        {mode === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'daftar' : 'login');
            setPesan('');
          }}
          className="font-semibold text-warga underline underline-offset-4"
        >
          {mode === 'login' ? 'Daftar' : 'Masuk'}
        </button>
      </p>
    </div>
  );
}
