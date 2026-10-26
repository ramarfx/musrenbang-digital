import { useAuth } from '@/features/auth';
import { cn } from '@/lib/cn';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';

const navItems = [
  { to: '/', label: 'Beranda', end: true },
  { to: '/bandingkan', label: 'Bandingkan' },
  { to: '/apbd', label: 'APBD' },
  { to: '/simulator', label: 'Simulator Anggaran' },
  { to: '/usulan/baru', label: 'Buat Usulan' },
] as const;

export function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      toast.success('Kamu sudah keluar.');
      navigate('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal keluar.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="bg-emerald-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-4">
        <NavLink to="/" className="mr-4 text-lg font-bold tracking-tight">
          Musrenbang Digital
        </NavLink>

        <nav className="flex flex-wrap gap-1" aria-label="Navigasi utama">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-emerald-800 text-white'
                    : 'text-emerald-50 hover:bg-emerald-800/60',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-emerald-800 text-white'
                    : 'text-emerald-50 hover:bg-emerald-800/60',
                )
              }
            >
              Admin
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span className="max-w-40 truncate text-sm text-emerald-50">
                {profile?.nama ?? user.email}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                isLoading={isSigningOut}
                onClick={handleSignOut}
              >
                Keluar
              </Button>
            </>
          ) : (
            <NavLink
              to="/login"
              className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-stone-900 transition hover:bg-amber-400"
            >
              Masuk
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
