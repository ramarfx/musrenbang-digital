import { useNavigate, Link, useLocation, useMatch } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PemuatLayar } from '@/components/brand/PemuatLayar';
import { toastGagalMasuk, toastSudahKeluar } from '@/components/ui/ToastMasuk';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuth } from '@/features/auth';
import { useAppConfigQuery } from '@/features/config/queries';
import { useProposalQuery } from '@/features/proposals/queries';
import { NotificationBell } from './NotificationBell';
import { cn } from '@/lib/cn';

type NavItem = { to: string; label: string; icon: IconName; end?: boolean };
type NavGroup = { title?: string; items: NavItem[] };

/**
 * Menu mengikuti urutan langkah warga di Beranda. Metodologi tidak di menu karena sudah
 * ditautkan dari halaman APBD, Warga vs APBD, dan footer; Buat usulan ada di Usulan warga.
 * Admin mendapat kelompok sendiri tepat di bawah Beranda, karena pekerjaan admin adalah
 * tujuan utamanya saat masuk.
 */
export function buildNav(isAdmin: boolean, sudahMasuk = false): NavGroup[] {
  const groups: NavGroup[] = [{ items: [{ to: '/beranda', label: 'Beranda', icon: 'beranda' }] }];
  if (isAdmin) {
    groups.push({
      title: 'Admin',
      items: [
        { to: '/admin', label: 'Ringkasan', icon: 'beranda', end: true },
        { to: '/admin/perlu-diperiksa', label: 'Perlu diperiksa', icon: 'lonceng' },
        { to: '/admin/usulan', label: 'Semua usulan', icon: 'daftar' },
        { to: '/admin/laporan', label: 'Laporan', icon: 'bandingkan' },
      ],
    });
  }
  groups.push(
    {
      title: 'Langkahmu',
      items: [
        ...(isAdmin
          ? []
          : [{ to: '/simulator', label: 'Prioritasku', icon: 'simulator' } satisfies NavItem]),
        { to: '/usulan', label: 'Usulan warga', icon: 'usulan' },
        ...(sudahMasuk && !isAdmin
          ? [{ to: '/usulan-saya', label: 'Usulanku', icon: 'daftar' } satisfies NavItem]
          : []),
      ],
    },
    {
      title: 'Hasil',
      items: [
        { to: '/bandingkan', label: 'Warga vs APBD', icon: 'bandingkan' },
        { to: '/apbd', label: 'APBD', icon: 'apbd' },
      ],
    },
  );
  if (sudahMasuk) {
    groups.push({ title: 'Akun', items: [{ to: '/profil', label: 'Profil', icon: 'profil' }] });
  }
  return groups;
}

// Alas tuts hijau tua: lebih lembut dari tinta supaya tuts aktif menyatu dengan sidebar hijau.
const ALAS = '#035C42';

/**
 * Menu aktif ditentukan NavList, bukan dicocokkan alamatnya sendiri-sendiri, karena halaman
 * detail usulan bisa milik Usulan warga atau Usulanku tergantung siapa pemiliknya.
 */
function useMenuAktif() {
  const { pathname, state } = useLocation();
  const { user } = useAuth();
  const detail = useMatch('/usulan/:id');
  const idDetail = detail ? Number(detail.params.id) : NaN;
  const proposal = useProposalQuery(Number.isInteger(idDetail) ? idDetail : null);
  // Detail usulan milik sendiri: dari penanda saat baru dikirim, atau dari data usulannya.
  const detailMilikku =
    Number.isInteger(idDetail) &&
    ((state as { milikku?: boolean } | null)?.milikku === true ||
      (user !== null && proposal.data?.pengusul_id === user.id));

  const aktif = (item: NavItem): boolean => {
    if (item.to === '/usulan') {
      return pathname === '/usulan' || pathname.startsWith('/usulan/') ? !detailMilikku : false;
    }
    if (item.to === '/usulan-saya') return pathname === '/usulan-saya' || detailMilikku;
    return item.end
      ? pathname === item.to
      : pathname === item.to || pathname.startsWith(`${item.to}/`);
  };
  return { aktif, kunci: `${pathname}|${detailMilikku}` };
}

/**
 * Satu menu sidebar. Tuts aktifnya bukan milik menu ini, melainkan satu tuts bersama yang
 * meluncur di belakang semua menu (lihat NavList). Menu aktif hanya mengganti warna teks dan
 * bulatan ikonnya, lalu ikut turun 4px saat ditekan seperti tombol.
 */
function TutsMenu({ item, aktif, ringkas }: { item: NavItem; aktif: boolean; ringkas: boolean }) {
  return (
    <Link
      to={item.to}
      aria-current={aktif ? 'page' : undefined}
      title={ringkas ? item.label : undefined}
      className={cn(
        'group relative isolate flex h-[46px] items-center rounded-[14px] pb-1 text-[15px] font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2',
        // Tertutup: bulatan ikon (30px) tepat di tengah tuts selebar 44px.
        ringkas ? 'px-[7px]' : 'pr-3 pl-[9px]',
        aktif
          ? 'text-ink'
          : // Latar hover hanya seluas muka tuts, tidak menutupi bagian alas 4px di bawahnya.
            'text-white after:absolute after:inset-x-0 after:top-0 after:bottom-1 after:-z-10 after:rounded-[14px] after:bg-white/15 after:opacity-0 after:transition-opacity after:duration-150 hover:after:opacity-100',
      )}
    >
      <span
        className={cn(
          'flex items-center gap-2.5 transition-transform duration-[80ms] motion-reduce:transition-none',
          aktif && 'group-active:translate-y-1',
        )}
      >
        <span
          className={cn(
            'grid size-[30px] flex-none place-items-center rounded-full transition-colors duration-200',
            aktif && 'bg-zamrud text-white',
          )}
        >
          <Icon name={item.icon} />
        </span>
        <span className={cn('whitespace-nowrap', ringkas && 'sr-only')}>{item.label}</span>
      </span>
    </Link>
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
  kunciAktif,
}: {
  /** Berubah saat daftar menu berubah (mis. sesudah masuk), supaya posisi diukur ulang. */
  kunciMenu: string;
  /** Berubah saat menu aktif berganti, termasuk di halaman yang alamatnya sama. */
  kunciAktif: string;
}) {
  const tutsRef = useRef<HTMLSpanElement>(null);
  const [posisi, setPosisi] = useState<number | null>(null);
  const [siap, setSiap] = useState(false);

  // Menu aktif dicari lewat induk tuts (elemen nav), karena ref milik nav belum terpasang saat
  // efek anak ini pertama kali jalan.
  useLayoutEffect(() => {
    const aktif =
      tutsRef.current?.parentElement?.querySelector<HTMLElement>('a[aria-current="page"]');
    setPosisi(aktif ? aktif.offsetTop : null);
  }, [kunciAktif, kunciMenu]);

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
export function NavList({
  groups,
  dark,
  ringkas = false,
}: {
  groups: NavGroup[];
  dark: boolean;
  /** Hanya ikon (sidebar dikecilkan): nama menu jadi teks tersembunyi, judul grup jadi garis. */
  ringkas?: boolean;
}) {
  const { aktif, kunci } = useMenuAktif();
  return (
    <nav aria-label="Navigasi utama" className="relative isolate flex flex-col">
      {dark && (
        <TutsMeluncur
          kunciMenu={`${ringkas}|${groups.flatMap((group) => group.items.map((item) => item.to)).join('|')}`}
          kunciAktif={kunci}
        />
      )}
      {groups.map((group, index) => (
        <div
          key={group.title ?? index}
          className={
            group.title ? (ringkas ? 'mt-3 border-t border-white/25 pt-3' : 'mt-5') : undefined
          }
        >
          {group.title && !ringkas && (
            <p className={cn('px-3 pb-2 text-[13px]', dark ? 'text-white/90' : 'text-muted')}>
              {group.title}
            </p>
          )}
          <ul className={cn('flex flex-col', dark ? 'gap-2' : 'gap-0.5')}>
            {group.items.map((item) => (
              <li key={item.to}>
                {dark ? (
                  <TutsMenu item={item} aktif={aktif(item)} ringkas={ringkas} />
                ) : (
                  <Link
                    to={item.to}
                    aria-current={aktif(item) ? 'page' : undefined}
                    className={cn(
                      'relative flex h-11 items-center gap-3 rounded-[14px] px-3 text-[15px] font-medium text-ink transition-colors duration-150 ease-out hover:bg-active',
                      aktif(item) && 'bg-active font-bold',
                    )}
                  >
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
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
export function RegionBox({ dark, ringkas = false }: { dark: boolean; ringkas?: boolean }) {
  const { data } = useAppConfigQuery();
  if (ringkas) {
    return (
      <div
        title={`${data?.kota ?? 'DKI Jakarta'}, APBD ${data?.tahunAnggaran ?? 2025}`}
        className="grid h-11 w-11 place-items-center rounded-2xl border border-white/25 bg-black/15 text-white"
      >
        <span className="grid size-8 place-items-center rounded-[10px] bg-hijau text-hijau-terang">
          <Icon name="lokasi" />
        </span>
        <span className="sr-only">
          Wilayah {data?.kota ?? 'DKI Jakarta'}, APBD {data?.tahunAnggaran ?? 2025}
        </span>
      </div>
    );
  }
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
          APBD {data?.tahunAnggaran ?? 2025}
        </span>
      </span>
    </div>
  );
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || 'W';
}

export function UserRow({ dark, ringkas = false }: { dark: boolean; ringkas?: boolean }) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const name = profile?.nama ?? user?.email ?? 'Warga';

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      toastSudahKeluar(name.trim().split(/\s+/)[0] ?? name);
      navigate('/');
    } catch (error) {
      toastGagalMasuk(error instanceof Error ? error.message : undefined, 'Gagal keluar');
    } finally {
      setIsSigningOut(false);
    }
  };

  const actionClass = cn(
    'inline-flex h-9 flex-none items-center rounded-xl px-4 text-[13px] font-bold transition-[scale,background-color] duration-150 ease-out active:scale-[0.96] disabled:opacity-60',
    dark ? 'bg-white text-hitam hover:bg-white/85' : 'bg-ink text-on-ink hover:bg-ink-tekan',
  );

  if (ringkas) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[18px] bg-black/15 py-2">
        {isSigningOut && <PemuatLayar label="Keluar dari akun" />}
        {user ? (
          <>
            <Link
              to="/profil"
              aria-label={`Buka profil ${name}`}
              title={name}
              className="grid size-9 place-items-center rounded-full bg-hijau-terang text-xs font-bold text-hitam focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {initials(name)}
            </Link>
            <NotificationBell dark tempat="samping" />
            <button
              type="button"
              aria-label="Keluar"
              title="Keluar"
              disabled={isSigningOut}
              onClick={handleSignOut}
              className="grid size-9 place-items-center rounded-xl border border-white/25 text-white transition-[scale,background-color] duration-150 ease-out hover:bg-white/15 active:scale-[0.95] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Icon name="keluar" size={19} />
            </button>
          </>
        ) : (
          <Link
            to="/login"
            aria-label="Masuk"
            title="Masuk"
            className="grid size-9 place-items-center rounded-xl bg-white text-hitam transition-[scale,background-color] duration-150 ease-out hover:bg-white/85 active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Icon name="keluar" size={19} />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-[18px] px-2 py-2.5',
        dark ? 'bg-black/15' : 'border border-border bg-surface',
      )}
    >
      {isSigningOut && <PemuatLayar label="Keluar dari akun" />}
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
