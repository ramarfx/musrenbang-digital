import type { Profile } from '@musrenbang/shared';
import { useQueryClient } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import { signOut as signOutRequest } from './api';
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

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      queryClient.setQueryData(queryKeys.session, nextSession);
      if (!nextSession) {
        queryClient.removeQueries({ queryKey: ['profile'] });
      }
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
