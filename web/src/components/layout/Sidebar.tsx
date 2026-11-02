import logoPutih from '@/assets/logo/mb-lockup-horizontal-putih.svg';
import { Link } from 'react-router-dom';
import { DecorRings } from '@/components/ui/DecorRings';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/features/auth';
import { buildNav, NavList, RegionBox, UserRow } from './nav';

/**
 * Sidebar hijau zamrud (warna batang logo) yang menempel penuh ke atas, bawah, dan kiri layar,
 * untuk layar lebar (1024px ke atas). Garis fokus di dalamnya putih, karena garis fokus hijau
 * bawaan tidak terlihat di atas hijau.
 */
export function Sidebar() {
  const { isAdmin, user } = useAuth();
  return (
    <aside className="masuk-sidebar sticky top-0 z-30 hidden h-dvh w-[272px] flex-none flex-col bg-zamrud px-4 pt-5 pb-4 text-white lg:flex [&_*:focus-visible]:outline-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <DecorRings className="-right-[70px] bottom-[120px] size-[200px] shadow-[0_0_0_38px_rgb(255_255_255/0.05),0_0_0_78px_rgb(255_255_255/0.03)]" />
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Panduan logo: di latar hijau pakai versi satu warna putih, bukan versi berwarna. */}
        <div className="mb-5 flex items-center justify-between gap-2">
          <Link to="/" className="flex min-h-11 items-center rounded-xl px-1.5 select-none">
            <img
              src={logoPutih}
              alt="Musrenbang Digital"
              draggable={false}
              className="h-[34px] w-auto"
            />
          </Link>
          <ThemeToggle dark />
        </div>
        <RegionBox dark />
        <div className="trek-tipis mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
          <NavList groups={buildNav(isAdmin, user !== null)} dark />
        </div>
        <div className="mt-3">
          <UserRow dark />
        </div>
      </div>
    </aside>
  );
}
