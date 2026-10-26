import type { User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import type { Profile } from './lib/supabase';
import { supabase } from './lib/supabase';
import Admin from './pages/Admin';
import Apbd from './pages/Apbd';
import Auth from './pages/Auth';
import Bandingkan from './pages/Bandingkan';
import Beranda from './pages/Beranda';
import BuatUsulan from './pages/BuatUsulan';
import Simulator from './pages/Simulator';
import UsulanDetail from './pages/UsulanDetail';

type AuthState = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  refresh: async () => {},
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, nama, peran')
    .eq('id', userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    setProfile(session ? await loadProfile(session.user.id) : null);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) {
        loadProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refresh }}>
      <div className="min-h-screen bg-stone-50 text-stone-900">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Routes>
            <Route path="/" element={<Beranda />} />
            <Route path="/bandingkan" element={<Bandingkan />} />
            <Route path="/apbd" element={<Apbd />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/usulan/baru" element={<BuatUsulan />} />
            <Route path="/usulan/:id" element={<UsulanDetail />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
          Musrenbang Digital — prototipe partisipasi warga, bukan sistem pemerintah.
        </footer>
      </div>
    </AuthContext.Provider>
  );
}
