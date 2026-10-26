import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { supabase } from '../lib/supabase';

const linkClass = 'rounded px-3 py-2 text-sm font-medium hover:bg-emerald-800';

export default function Navbar() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header className="bg-emerald-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-4">
        <Link to="/" className="mr-4 text-lg font-bold">
          Musrenbang Digital
        </Link>
        <nav className="flex flex-wrap gap-1">
          <Link className={linkClass} to="/">
            Beranda
          </Link>
          <Link className={linkClass} to="/bandingkan">
            Bandingkan
          </Link>
          <Link className={linkClass} to="/apbd">
            APBD
          </Link>
          <Link className={linkClass} to="/simulator">
            Simulator Anggaran
          </Link>
          <Link className={linkClass} to="/usulan/baru">
            Buat Usulan
          </Link>
          {profile?.peran === 'admin' && (
            <Link className={linkClass} to="/admin">
              Admin
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm">{profile?.nama ?? user.email}</span>
              <button
                type="button"
                onClick={logout}
                className="rounded bg-amber-500 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-amber-400"
              >
                Keluar
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded bg-amber-500 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-amber-400"
            >
              Masuk
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
