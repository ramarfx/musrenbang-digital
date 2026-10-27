import { useNavigate, Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuth } from '@/features/auth';
import { useAppConfigQuery } from '@/features/config/queries';
import { cn } from '@/lib/cn';

type NavItem = { to: string; label: string; icon: IconName; end?: boolean };
type NavGroup = { title?: string; items: NavItem[] };

export function buildNav(isAdmin: boolean): NavGroup[] {
  const groups: NavGroup[] = [
    { items: [{ to: '/', label: 'Beranda', icon: 'beranda', end: true }] },
    {
      title: 'Ikut serta',
      items: [
        { to: '/simulator', label: 'Simulator', icon: 'simulator' },
        { to: '/usulan/baru', label: 'Buat usulan', icon: 'usulan' },
      ],
    },
    {
      title: 'Pantau',
      items: [
        { to: '/bandingkan', label: 'Bandingkan', icon: 'bandingkan' },
        { to: '/apbd', label: 'APBD', icon: 'apbd' },
      ],
    },
  ];
  groups.push({
    title: 'Tentang',
    items: [{ to: '/metodologi', label: 'Metodologi', icon: 'buku' }],
  });
  if (isAdmin) {
    groups.push({
      title: 'Admin',
      items: [{ to: '/admin', label: 'Kelola usulan', icon: 'admin' }],
    });
  }
  return groups;
}

/** `dark` = di atas sidebar hijau; tanpa dark = menu HP di atas kertas. */
export function NavList({ groups, dark }: { groups: NavGroup[]; dark: boolean }) {
  return (
    <nav aria-label="Navigasi utama" className="flex flex-col">
      {groups.map((group, index) => (
        <div key={group.title ?? index} className={group.title ? 'mt-5' : undefined}>
          {group.title && (
            <p className={cn('px-3 pb-2 text-[13px]', dark ? 'text-white/70' : 'text-muted')}>
              {group.title}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'relative flex h-11 items-center gap-3 rounded-[14px] px-3 text-[15px] font-medium transition-colors duration-150 ease-out',
                      dark ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-active',
                      isActive &&
                        dark &&
                        'bg-ink/40 font-bold hover:bg-ink/40 before:absolute before:top-2.5 before:bottom-2.5 before:-left-3.5 before:w-1 before:rounded-r before:bg-hijau-terang before:animate-[anim-bar_240ms_cubic-bezier(0.23,1,0.32,1)_backwards]',
                      isActive && !dark && 'bg-active font-bold',
                    )
                  }
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Wilayah dan tahun dibaca dari tabel config, dengan kotak tinta seperti ikon logo. */
export function RegionBox({ dark }: { dark: boolean }) {
  const { data } = useAppConfigQuery();
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border px-3.5 py-3',
        dark ? 'border-white/25 bg-white/15 text-white' : 'border-border bg-surface',
      )}
    >
      <span className="grid size-9 flex-none place-items-center rounded-[11px] bg-ink text-hijau-terang">
        <Icon name="lokasi" />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={cn('text-xs', dark ? 'text-white/75' : 'text-muted')}>Wilayah</span>
        <span className="text-[15px] font-bold">{data?.kota ?? 'DKI Jakarta'}</span>
        <span className={cn('text-xs', dark ? 'text-white/75' : 'text-muted')}>
          APBD {data?.tahunAnggaran ?? 2026}
        </span>
      </span>
    </div>
  );
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || 'W';
}

export function UserRow({ dark }: { dark: boolean }) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const name = profile?.nama ?? user?.email ?? 'Warga';

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

  const actionClass = cn(
    'inline-flex h-9 flex-none items-center rounded-xl px-4 text-[13px] font-bold transition-[scale,background-color] duration-150 ease-out active:scale-[0.96] disabled:opacity-60',
    dark ? 'bg-white text-ink hover:bg-ground' : 'bg-ink text-white hover:bg-ink-tekan',
  );

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-[18px] px-2 py-2.5',
        dark ? 'bg-ink/40' : 'border border-border bg-surface',
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-8 flex-none place-items-center rounded-full bg-ink text-xs font-bold text-hijau-terang"
      >
        {user ? initials(name) : 'W'}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[14px] font-bold">{user ? name : 'Warga'}</span>
        <span className={cn('block text-xs', dark ? 'text-white/75' : 'text-muted')}>
          {user ? (isAdmin ? 'Admin' : 'Warga') : 'Belum masuk'}
        </span>
      </span>
      {user ? (
        <button
          type="button"
          className={actionClass}
          disabled={isSigningOut}
          onClick={handleSignOut}
        >
          {isSigningOut ? 'Keluar...' : 'Keluar'}
        </button>
      ) : (
        <Link to="/login" className={actionClass}>
          Masuk
        </Link>
      )}
    </div>
  );
}
