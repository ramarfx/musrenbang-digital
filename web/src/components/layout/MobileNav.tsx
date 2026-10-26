import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoColor from '@/assets/logo/mb-lockup-horizontal-warna.svg';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/features/auth';
import { buildNav, NavList, RegionBox, UserRow } from './nav';

type MobileNavProps = {
  open: boolean;
  setOpen: (open: boolean | ((open: boolean) => boolean)) => void;
};

/** Bar atas dan menu layar penuh untuk HP dan tablet (di bawah 1024px). */
export function MobileNav({ open, setOpen }: MobileNavProps) {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [location.pathname, setOpen]);

  // Kalau layar dilebarkan saat menu terbuka, tutup menu supaya kunci scroll dan inert lepas.
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)');
    const check = () => {
      if (wide.matches) setOpen(false);
    };
    wide.addEventListener('change', check);
    return () => wide.removeEventListener('change', check);
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);

  return (
    <div className="lg:hidden">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rule bg-ground px-4">
        <Link to="/" className="rounded-lg">
          <img src={logoColor} alt="Musrenbang Digital, ke beranda" className="h-[34px] w-auto" />
        </Link>
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls="menu-hp"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold transition-[scale] duration-150 ease-out active:scale-[0.97]"
        >
          <Icon name={open ? 'tutup' : 'menu'} />
          {open ? 'Tutup' : 'Menu'}
        </button>
      </header>
      {open && (
        <div
          ref={panelRef}
          id="menu-hp"
          className="anim-menu fixed inset-x-0 top-14 bottom-0 z-20 flex flex-col gap-4 overflow-y-auto bg-ground px-4 pt-4 pb-6"
        >
          <RegionBox dark={false} />
          <NavList groups={buildNav(isAdmin)} dark={false} />
          <div className="mt-auto">
            <UserRow dark={false} />
          </div>
        </div>
      )}
    </div>
  );
}
