import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { ambilKembaliGoogle, simpanHalamanAsal, tandaiPernahMasuk } from '@/lib/halamanAsal';

/**
 * Mengingat halaman terakhir yang dibuka selain halaman login, supaya setelah masuk warga
 * kembali ke sana (termasuk landing) dan tidak selalu dibawa ke beranda. Login Google mendarat
 * di landing; di sini warga yang sudah pernah masuk dikembalikan ke halaman asalnya.
 */
export function LacakHalaman() {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (pathname !== '/login') simpanHalamanAsal(`${pathname}${search}${hash}`);
  }, [pathname, search, hash]);

  useEffect(() => {
    if (!user) return;
    const asal = ambilKembaliGoogle();
    if (asal === null) return;
    tandaiPernahMasuk();
    const target = asal && asal !== '/' && asal !== '/login' ? asal : '/beranda';
    if (pathname === '/' || pathname === '/login') navigate(target, { replace: true });
  }, [user, pathname, navigate]);

  return <Outlet />;
}
