import type { Profile } from '@musrenbang/shared';
import { useQueryClient } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import { toastSelamatDatang } from '@/components/ui/ToastMasuk';
import { ambilBaruMasuk, signOut as signOutRequest } from './api';
import { useProfileQuery, useSessionQuery } from './queries';

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const sessionQuery = useSessionQuery();
  const session = sessionQuery.data ?? null;
  const user = session?.user ?? null;
  const profileQuery = useProfileQuery(user?.id ?? null);
  // Id pengguna terakhir yang sesi-nya dikenali, untuk mendeteksi pergantian akun.
  const idTerakhir = useRef<string | null>(user?.id ?? null);
  const userId = user?.id ?? null;
  useEffect(() => {
    if (userId !== null) idTerakhir.current = userId;
  }, [userId]);

  // Notifikasi sekali setelah proses masuk (email atau Google) selesai dan sesinya terbentuk.
  useEffect(() => {
    if (!user || !ambilBaruMasuk()) return;
    const meta = user.user_metadata as Record<string, unknown>;
    const dariMeta = [meta.nama, meta.full_name, meta.name].find(
      (nilai): nilai is string => typeof nilai === 'string' && nilai.trim() !== '',
    );
    const nama = (dariMeta ?? user.email ?? 'Warga').trim().split(/\s+/)[0];
    toastSelamatDatang(nama);
  }, [user]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const idBaru = nextSession?.user.id ?? null;
      // Data usulan dan statistik bergantung pada siapa yang masuk (usulan milik sendiri, usulan
      // menunggu, data admin). Saat akun berganti atau keluar, buang semuanya kecuali sesi dan
      // data publik yang sama untuk semua orang, supaya tidak ada sisa data akun sebelumnya.
      if (idTerakhir.current !== null && idBaru !== idTerakhir.current) {
        queryClient.removeQueries({
          predicate: (query) => {
            const kunci = query.queryKey[0];
            return kunci !== 'session' && kunci !== 'config' && kunci !== 'categories';
          },
        });
        idTerakhir.current = idBaru;
      }
      queryClient.setQueryData(queryKeys.session, nextSession);
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signOut = useCallback(async () => {
    await signOutRequest();
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user,
      profile: profileQuery.data ?? null,
      loading: sessionQuery.isPending || (user !== null && profileQuery.isPending),
      isAdmin: profileQuery.data?.peran === 'admin',
      signOut,
    }),
    [session, user, profileQuery.data, profileQuery.isPending, sessionQuery.isPending, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus dipakai di dalam AuthProvider.');
  return context;
}
