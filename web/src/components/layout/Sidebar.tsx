import iconInk from '@/assets/logo/mb-ikon-app.svg';
import wordmarkWhite from '@/assets/logo/musrenbang-wordmark-putih.svg';
import { DecorRings } from '@/components/ui/DecorRings';
import { useAuth } from '@/features/auth';
import { buildNav, NavList, RegionBox, UserRow } from './nav';

/** Sidebar hijau melayang untuk layar lebar (1024px ke atas). */
export function Sidebar() {
  const { isAdmin, user } = useAuth();
  return (
    <aside className="sticky top-4 z-30 m-4 mr-0 hidden h-[calc(100dvh-32px)] w-[272px] flex-none flex-col rounded-3xl border border-white/15 bg-hijau px-3.5 pt-5 pb-4 text-white lg:flex">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
      >
        <DecorRings className="-right-[70px] bottom-[120px] size-[200px] shadow-[0_0_0_38px_rgb(255_255_255/0.05),0_0_0_78px_rgb(255_255_255/0.03)]" />
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/*
          Logo berwarna tidak boleh langsung di latar hijau (panduan logo), jadi
          dipakai ikon resmi berlatar tinta ditambah tulisan versi putih.
        */}
        <div className="mb-5 flex items-center gap-2.5 self-start px-1.5 py-1 select-none">
          <img src={iconInk} alt="" draggable={false} className="size-11" />
          <img
            src={wordmarkWhite}
            alt="Musrenbang Digital"
            draggable={false}
            className="h-[29px] w-auto"
          />
        </div>
        <RegionBox dark />
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
          <NavList groups={buildNav(isAdmin, user !== null)} dark />
        </div>
        <div className="mt-3">
          <UserRow dark />
        </div>
      </div>
    </aside>
  );
}
