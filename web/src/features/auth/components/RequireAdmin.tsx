import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthProvider';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Memeriksa hak akses..." />;
  if (!user) {
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  }
  if (!isAdmin) {
    return (
      <EmptyState
        title="Halaman ini khusus admin"
        description="Akunmu tidak memiliki peran admin. Hubungi pengelola platform bila kamu perlu akses."
      />
    );
  }
  return <>{children}</>;
}
