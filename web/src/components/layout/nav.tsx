import { useNavigate, Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuth } from '@/features/auth';
import { useAppConfigQuery } from '@/features/config/queries';
import { NotificationBell } from './NotificationBell';
import { cn } from '@/lib/cn';

type NavItem = { to: string; label: string; icon: IconName; end?: boolean };
type NavGroup = { title?: string; items: NavItem[] };

/**
 * Menu mengikuti urutan langkah warga di Beranda. APBD dan Metodologi tidak di menu karena
 * sudah ditautkan dari halaman Warga vs APBD dan dari footer; Buat usulan ada di Usulan warga.
 */
export function buildNav(isAdmin: boolean, sudahMasuk = false): NavGroup[] {
  const groups: NavGroup[] = [
    { items: [{ to: '/beranda', label: 'Beranda', icon: 'beranda' }] },
    {
      title: 'Langkahmu',
      items: [
        { to: '/simulator', label: 'Prioritasku', icon: 'simulator' },
        { to: '/usulan', label: 'Usulan warga', icon: 'usulan' },
        ...(sudahMasuk
          ? [{ to: '/usulan-saya', label: 'Usulanku', icon: 'daftar' } satisfies NavItem]
          : []),
      ],
    },
    {
      title: 'Hasil',
      items: [{ to: '/bandingkan', label: 'Warga vs APBD', icon: 'bandingkan' }],
    },
  ];
  if (sudahMasuk) {
    groups.push({ title: 'Akun', items: [{ to: '/profil', label: 'Profil', icon: 'profil' }] });
  }
  if (isAdmin) {
    groups.push({
      title: 'Admin',
      items: [{ to: '/admin', label: 'Kelola usulan', icon: 'admin' }],
    });
  }
  return groups;
}

// Alas tuts hijau tua: lebih lembut dari tinta supaya tuts aktif menyatu dengan sidebar hijau.
const ALAS = '#035C42';

/**
 * Satu menu sidebar. Tuts aktifnya bukan milik menu ini, melainkan satu tuts bersama yang
 * meluncur di belakang semua menu (lihat NavList). Menu aktif hanya mengganti warna teks dan
 * bulatan ikonnya, lalu ikut turun 4px saat ditekan seperti tombol.
 */
function TutsMenu({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'group relative isolate flex h-[46px] items-center rounded-[14px] pr-3 pb-1 pl-[9px] text-[15px] font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2',
          isActive
            ? 'text-ink'
            : // Latar hover hanya seluas muka tuts, tidak menutupi bagian alas 4px di bawahnya.
              'text-white after:absolute after:inset-x-0 after:top-0 after:bottom-1 after:-z-10 after:rounded-[14px] after:bg-white/15 after:opacity-0 after:transition-opacity after:duration-150 hover:after:opacity-100',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'flex items-center gap-2.5 transition-transform duration-[80ms] motion-reduce:transition-none',
              isActive && 'group-active:translate-y-1',
            )}
          >
            <span
              className={cn(
                'grid size-[30px] flex-none place-items-center rounded-full transition-colors duration-200',
                isActive && 'bg-zamrud text-white',
              )}
            >
              <Icon name={item.icon} />
            </span>
            <span>{item.label}</span>
          </span>
        </>
      )}
    </NavLink>
  );
}

/**
 * Tuts aktif bersama di sidebar: meluncur naik atau turun ke menu yang sedang dibuka, lalu ikut
 * turun ke alasnya saat menu aktif ditekan. Posisinya diukur dari menu aktif di DOM, jadi tetap
 * tepat walau ada judul grup di antara menu. Pada muatan pertama tuts langsung di tempat tanpa
 * meluncur dari atas.
 */
function TutsMeluncur({
  kunciMenu,
}: {
  /** Berubah saat daftar menu berubah (mis. sesudah masuk), supaya posisi diukur ulang. */
  kunciMenu: string;
}) {
  const { pathname } = useLocation();
  const tutsRef = useRef<HTMLSpanElement>(null);
  const [posisi, setPosisi] = useState<number | null>(null);
  const [siap, setSiap] = useState(false);

  // Menu aktif dicari lewat induk tuts (elemen nav), karena ref milik nav belum terpasang saat
  // efek anak ini pertama kali jalan.
  useLayoutEffect(() => {
    const aktif =
      tutsRef.current?.parentElement?.querySelector<HTMLElement>('a[aria-current="page"]');
    setPosisi(aktif ? aktif.offsetTop : null);
  }, [pathname, kunciMenu]);

  // Transisi baru dinyalakan sesudah posisi pertama tergambar, supaya tuts tidak meluncur dari
  // atas saat halaman dibuka.
  useEffect(() => {
    if (posisi !== null) setSiap(true);
  }, [posisi]);

  return (
    <span
      ref={tutsRef}
      aria-hidden="true"
      style={{
        backgroundColor: ALAS,
        transform: `translateY(${posisi ?? 0}px)`,
      }}
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 h-[46px] rounded-[14px] motion-reduce:transition-none',
        siap &&
          'transition-[transform,opacity] duration-[320ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
        posisi === null ? 'opacity-0' : 'opacity-100',
        'before:absolute before:inset-x-0 before:top-0 before:bottom-1 before:rounded-[14px] before:border-[1.5px] before:border-[#035C42] before:bg-mint-pucat before:transition-[translate] before:duration-[80ms]',
        // Ditekan: muka tuts turun ke alas bersama isi menu aktifnya.
        '[nav:has(a[aria-current=page]:active)_&]:before:translate-y-1',
      )}
    />
  );
}

/** `dark` = di atas sidebar hijau; tanpa dark = menu HP di atas kertas. */
export function NavList({ groups, dark }: { groups: NavGroup[]; dark: boolean }) {
  return (
    <nav aria-label="Navigasi utama" className="relative isolate flex flex-col">
      {dark && (
        <TutsMeluncur
          kunciMenu={groups.flatMap((group) => group.items.map((item) => item.to)).join('|')}
        />
      )}
      {groups.map((group, index) => (
        <div key={group.title ?? index} className={group.title ? 'mt-5' : undefined}>
          {group.title && (
            <p className={cn('px-3 pb-2 text-[13px]', dark ? 'text-white/90' : 'text-muted')}>
              {group.title}
            </p>
          )}
          <ul className={cn('flex flex-col', dark ? 'gap-2' : 'gap-0.5')}>
            {group.items.map((item) => (
              <li key={item.to}>
                {dark ? (
                  <TutsMenu item={item} />
                ) : (
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'relative flex h-11 items-center gap-3 rounded-[14px] px-3 text-[15px] font-medium text-ink transition-colors duration-150 ease-out hover:bg-active',
                        isActive && 'bg-active font-bold',
                      )
                    }
                  >
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                  </NavLink>
                )}
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
        dark ? 'border-white/25 bg-black/15 text-white' : 'border-border bg-surface',
      )}
    >
      <span className="grid size-9 flex-none place-items-center rounded-[11px] bg-hijau text-hijau-terang">
        <Icon name="lokasi" />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={cn('text-xs', dark ? 'text-white/90' : 'text-muted')}>Wilayah</span>
        <span className="text-[15px] font-bold">{data?.kota ?? 'DKI Jakarta'}</span>
        <span className={cn('text-xs', dark ? 'text-white/90' : 'text-muted')}>
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
    dark ? 'bg-white text-hitam hover:bg-white/85' : 'bg-ink text-on-ink hover:bg-ink-tekan',
  );

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-[18px] px-2 py-2.5',
        dark ? 'bg-black/15' : 'border border-border bg-surface',
      )}
    >
      {user ? (
        <Link
          to="/profil"
          aria-label="Buka profil"
          className={cn(
            '-m-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-[14px] p-1 transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2',
            dark ? 'hover:bg-black/10' : 'hover:bg-active',
          )}
        >
          <span
            aria-hidden="true"
            className="grid size-8 flex-none place-items-center rounded-full bg-hijau-terang text-xs font-bold text-hitam"
          >
            {user ? initials(name) : 'W'}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[14px] font-bold">{user ? name : 'Warga'}</span>
            <span className={cn('block text-xs', dark ? 'text-white/90' : 'text-muted')}>
              {user ? (isAdmin ? 'Admin' : 'Warga') : 'Belum masuk'}
            </span>
          </span>
        </Link>
      ) : (
        <>
          <span
            aria-hidden="true"
            className="grid size-8 flex-none place-items-center rounded-full bg-hijau-terang text-xs font-bold text-hitam"
          >
            {user ? initials(name) : 'W'}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[14px] font-bold">{user ? name : 'Warga'}</span>
            <span className={cn('block text-xs', dark ? 'text-white/90' : 'text-muted')}>
              {user ? (isAdmin ? 'Admin' : 'Warga') : 'Belum masuk'}
            </span>
          </span>
        </>
      )}
      {user && <NotificationBell dark={dark} tempat={dark ? 'samping' : 'atas'} />}
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
