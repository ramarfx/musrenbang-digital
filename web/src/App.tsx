import type { User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import Kerangka from './components/Kerangka';
import { ambilProfil, ambilSesi, dengarkanAuth } from './lib/data';
import type { Profile } from './lib/supabase';
import Admin from './pages/Admin';
import Apbd from './pages/Apbd';
import Auth from './pages/Auth';
import Bandingkan from './pages/Bandingkan';
import Beranda from './pages/Beranda';
import BuatUsulan from './pages/BuatUsulan';
import Simulator from './pages/Simulator';
import TidakDitemukan from './pages/TidakDitemukan';
import Usulan from './pages/Usulan';
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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const sesi = await ambilSesi();
    setUser(sesi?.user ?? null);
    setProfile(sesi ? await ambilProfil(sesi.user.id) : null);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    return dengarkanAuth((sesi) => {
      setUser(sesi?.user ?? null);
      if (sesi) {
        ambilProfil(sesi.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refresh }}>
      <Kerangka>
        <Routes>
          <Route path="/" element={<Beranda />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/usulan" element={<Usulan />} />
          <Route path="/usulan/baru" element={<BuatUsulan />} />
          <Route path="/usulan/:id" element={<UsulanDetail />} />
          <Route path="/bandingkan" element={<Bandingkan />} />
          <Route path="/apbd" element={<Apbd />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<TidakDitemukan />} />
        </Routes>
      </Kerangka>
    </AuthContext.Provider>
  );
}
