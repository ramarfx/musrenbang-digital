import { Link } from 'react-router-dom';
import iconInk from '@/assets/logo/mb-ikon-app.svg';
import wordmarkWhite from '@/assets/logo/musrenbang-wordmark-putih.svg';
import { useAuth } from '@/features/auth';
import { buildNav, NavList, RegionBox, UserRow } from './nav';

/** Tiga cincin konsentris tipis putih transparan, motif Desain 1. Murni hiasan. */
export function DecorRings({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full border border-white/15 ${className}`}
    />
  );
}

/** Sidebar hijau melayang untuk layar lebar (1024px ke atas). */
export function Sidebar() {
  const { isAdmin } = useAuth();
  return (
    <aside className="sticky top-4 m-4 mr-0 hidden h-[calc(100dvh-32px)] w-[272px] flex-none flex-col overflow-hidden rounded-[30px] border border-white/15 bg-hijau px-3.5 pt-5 pb-4 text-white lg:flex">
      <DecorRings className="-right-[70px] bottom-[120px] size-[200px] shadow-[0_0_0_38px_rgb(255_255_255/0.05),0_0_0_78px_rgb(255_255_255/0.03)]" />
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/*
          Logo berwarna tidak boleh langsung di latar hijau (panduan logo), jadi
          dipakai ikon resmi berlatar tinta ditambah tulisan versi putih.
        */}
        <Link
          to="/"
          aria-label="Musrenbang Digital, ke beranda"
          className="mb-5 flex items-center gap-2.5 self-start rounded-xl px-1.5 py-1"
        >
          <img src={iconInk} alt="" className="size-10" />
          <img src={wordmarkWhite} alt="" className="h-[21px] w-auto" />
        </Link>
        <RegionBox dark />
        <div className="mt-1 min-h-0 flex-1 overflow-y-auto">
          <NavList groups={buildNav(isAdmin)} dark />
        </div>
        <div className="mt-3">
          <UserRow dark />
        </div>
      </div>
    </aside>
  );
}
