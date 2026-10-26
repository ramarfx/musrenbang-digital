import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { supabase } from '../lib/supabase';

const inputClass = 'w-full rounded border border-stone-300 px-3 py-2';

export default function Auth() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'daftar'>('login');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pesan, setPesan] = useState('');

  const pastikanProfil = async (userId: string, emailValue: string, namaValue: string) => {
    const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (!data) {
      await supabase.from('profiles').insert({
        id: userId,
        email: emailValue,
        nama: namaValue || emailValue.split('@')[0],
      });
    }
  };

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setPesan('');
    if (mode === 'daftar') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setPesan(`Gagal mendaftar: ${error.message}`);
        return;
      }
      if (data.session) {
        await pastikanProfil(data.session.user.id, email, nama);
        await refresh();
        navigate('/');
      } else {
        setPesan('Akun dibuat. Cek email untuk konfirmasi (bila diaktifkan), lalu masuk.');
        setMode('login');
      }
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setPesan(`Gagal masuk: ${error.message}`);
      return;
    }
    await pastikanProfil(data.user.id, email, nama);
    await refresh();
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-3xl font-bold">{mode === 'login' ? 'Masuk' : 'Daftar'}</h1>
      <form onSubmit={kirim} className="space-y-4">
        {mode === 'daftar' && (
          <div>
            <label htmlFor="nama" className="mb-1 block font-medium">
              Nama
            </label>
            <input
              id="nama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="mb-1 block font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          className="w-full rounded bg-emerald-800 px-4 py-2 font-medium text-white hover:bg-emerald-700"
        >
          {mode === 'login' ? 'Masuk' : 'Daftar'}
        </button>
        {pesan && <p className="text-sm text-stone-700">{pesan}</p>}
      </form>
      <p className="text-center text-sm">
        {mode === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'daftar' : 'login')}
          className="font-medium underline"
        >
          {mode === 'login' ? 'Daftar' : 'Masuk'}
        </button>
      </p>
    </div>
  );
}
