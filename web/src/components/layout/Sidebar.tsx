import logoPutih from '@/assets/logo/mb-lockup-horizontal-putih.svg';
import { Link } from 'react-router-dom';
import { LogoMark } from '@/components/brand/LogoMark';
import { DecorRings } from '@/components/ui/DecorRings';
import { Icon } from '@/components/ui/Icon';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/cn';
import { useSidebarRingkas } from '@/lib/sidebar';
import { buildNav, NavList, RegionBox, UserRow } from './nav';

/**
 * Sidebar hijau zamrud (warna batang logo) yang menempel penuh ke atas, bawah, dan kiri layar,
 * untuk layar lebar (1024px ke atas). Garis fokus di dalamnya putih, karena garis fokus hijau
 * bawaan tidak terlihat di atas hijau.
 *
 * Bisa dikecilkan jadi deretan ikon lewat gagang di tepi kanannya; pilihannya diingat di browser.
 * Yang berubah hanya lebarnya (satu transisi 220ms): isi halaman mengikuti karena sebaris dengannya.
 */
export function Sidebar() {
  const { isAdmin, user } = useAuth();
  const [ringkas, setRingkas] = useSidebarRingkas();
  return (
    <aside
      id="sidebar-utama"
      className={cn(
        'masuk-sidebar sticky top-0 z-30 hidden h-dvh flex-none flex-col bg-zamrud px-4 pt-5 pb-4 text-white transition-[width] duration-[220ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none lg:flex [&_*:focus-visible]:outline-white',
        ringkas ? 'w-[76px]' : 'w-[272px]',
      )}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <DecorRings className="-right-[70px] bottom-[120px] size-[200px] shadow-[0_0_0_38px_rgb(255_255_255/0.05),0_0_0_78px_rgb(255_255_255/0.03)]" />
      </div>

      <button
        type="button"
        onClick={() => setRingkas(!ringkas)}
        aria-expanded={!ringkas}
        aria-controls="sidebar-utama"
        aria-label={ringkas ? 'Lebarkan menu samping' : 'Kecilkan menu samping'}
        title={ringkas ? 'Lebarkan menu' : 'Kecilkan menu'}
        className="absolute top-[26px] -right-[18px] z-10 grid size-8 place-items-center rounded-full border-[1.5px] border-ink bg-surface text-ink shadow-[0_3px_0_var(--ink)] transition-[translate,background-color] duration-150 ease-out hover:translate-x-0.5 hover:bg-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink! motion-reduce:transition-none"
      >
        <span
          className={cn(
            'grid transition-transform duration-[220ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
            ringkas && 'rotate-180',
          )}
        >
          <Icon name="panahKiri" size={16} />
        </span>
      </button>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Panduan logo: di latar hijau pakai versi satu warna putih, bukan versi berwarna. */}
        {ringkas ? (
          <div className="mb-5 flex flex-col items-center gap-2">
            <Link
              to="/"
              aria-label="Musrenbang Digital"
              className="grid h-11 w-11 place-items-center rounded-xl select-none"
            >
              <LogoMark tone="current" className="h-7 w-auto text-white" />
            </Link>
            <ThemeToggle dark />
          </div>
        ) : (
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
        )}
        <RegionBox dark ringkas={ringkas} />
        <div
          className={cn(
            'mt-5 min-h-0 flex-1 overflow-x-hidden overflow-y-auto',
            // Tertutup: tanpa batang gulir (panahnya merusak deretan ikon); layar pendek tetap bisa
            // digulir dengan roda mouse atau jari. Kelasnya terpisah dari .trek-tipis karena
            // gaya tanpa lapisan itu mengalahkan utilitas Tailwind.
            ringkas ? 'trek-sembunyi' : 'trek-tipis pr-1',
          )}
        >
          <NavList groups={buildNav(isAdmin, user !== null)} dark ringkas={ringkas} />
        </div>
        <div className="mt-3">
          <UserRow dark ringkas={ringkas} />
        </div>
      </div>
    </aside>
  );
}
