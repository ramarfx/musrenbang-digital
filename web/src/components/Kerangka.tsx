import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import logoPutih from '../assets/logo/mb-lockup-horizontal-putih.svg';
import logoWarna from '../assets/logo/mb-lockup-horizontal-warna.svg';
import { ambilConfig, keluar } from '../lib/data';
import { modeContoh } from '../lib/supabase';
import { Ikon, type NamaIkon } from './Ikon';
import { LingkaranDekorasi } from './Kartu';

type ItemNav = { ke: string; label: string; ikon: NamaIkon };
type GrupNav = { judul?: string; item: ItemNav[] };

function susunNav(admin: boolean): GrupNav[] {
  const grup: GrupNav[] = [
    { item: [{ ke: '/', label: 'Beranda', ikon: 'beranda' }] },
    {
      judul: 'Ikut serta',
      item: [
        { ke: '/simulator', label: 'Simulator', ikon: 'simulator' },
        { ke: '/usulan', label: 'Usulan', ikon: 'usulan' },
      ],
    },
    {
      judul: 'Pantau',
      item: [
        { ke: '/bandingkan', label: 'Bandingkan', ikon: 'bandingkan' },
        { ke: '/apbd', label: 'APBD', ikon: 'apbd' },
      ],
    },
  ];
  if (admin) {
    grup.push({ judul: 'Admin', item: [{ ke: '/admin', label: 'Kelola usulan', ikon: 'admin' }] });
  }
  return grup;
}

/** Wilayah dan tahun dibaca dari tabel config, bukan ditulis tetap. */
function useWilayah() {
  const [wilayah, setWilayah] = useState({ kota: 'DKI Jakarta', tahun: '2026' });
  useEffect(() => {
    ambilConfig()
      .then((c) => setWilayah({ kota: c.kota ?? 'DKI Jakarta', tahun: c.tahun_anggaran ?? '2026' }))
      .catch(() => {});
  }, []);
  return wilayah;
}

function inisial(nama: string): string {
  const kata = nama.trim().split(/\s+/);
  return ((kata[0]?.[0] ?? '') + (kata[1]?.[0] ?? '')).toUpperCase() || 'W';
}

function DaftarNav({ grup, gelap }: { grup: GrupNav[]; gelap: boolean }) {
  const kelasLink = ({ isActive }: { isActive: boolean }) => {
    const dasar =
      'relative flex h-11 items-center gap-3 rounded-[14px] px-3 text-[15px] transition-colors duration-150 ease-out';
    if (gelap) {
      return `${dasar} text-white ${
        isActive
          ? 'bg-white/20 font-bold before:absolute before:top-2.5 before:bottom-2.5 before:-left-3.5 before:w-1 before:rounded-r before:bg-mint'
          : 'font-medium hover:bg-white/10'
      }`;
    }
    return `${dasar} text-ink ${isActive ? 'bg-active font-bold' : 'font-medium hover:bg-active'}`;
  };
  return (
    <nav aria-label="Menu utama" className="flex flex-col">
      {grup.map((g, i) => (
        <div key={g.judul ?? i} className={g.judul ? 'mt-5' : ''}>
          {g.judul && (
            <p className={`px-3 pb-2 text-[13px] ${gelap ? 'text-white/70' : 'text-muted'}`}>
              {g.judul}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {g.item.map((it) => (
              <li key={it.ke}>
                <NavLink to={it.ke} end={it.ke === '/'} className={kelasLink}>
                  <Ikon nama={it.ikon} />
                  <span>{it.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function KotakWilayah({ gelap }: { gelap: boolean }) {
  const { kota, tahun } = useWilayah();
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 ${
        gelap ? 'border-white/25 bg-white/15 text-white' : 'border-border bg-surface'
      }`}
    >
      <span
        className={`grid size-9 flex-none place-items-center rounded-[11px] ${
          gelap ? 'bg-white/20' : 'bg-[#d5ede3] text-[#0b4a36]'
        }`}
      >
        <Ikon nama="lokasi" />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={`text-xs ${gelap ? 'text-white/75' : 'text-muted'}`}>Wilayah</span>
        <span className="text-[15px] font-bold">{kota}</span>
        <span className={`text-xs ${gelap ? 'text-white/75' : 'text-muted'}`}>APBD {tahun}</span>
      </span>
    </div>
  );
}

function BarisPengguna({ gelap }: { gelap: boolean }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const nama = profile?.nama ?? user?.email ?? 'Warga';
  const tombol = gelap
    ? 'bg-white text-[#0a5a47] hover:bg-ground'
    : 'bg-hijau text-white hover:bg-hijau-tekan';
  const kelasTombol = `inline-flex h-9 flex-none items-center rounded-full px-4 text-[13px] font-bold transition-[transform,background-color] duration-150 ease-out active:scale-[0.96] ${tombol}`;

  return (
    <div
      className={`flex items-center gap-2.5 rounded-[18px] px-2 py-2.5 ${
        gelap ? 'bg-black/20' : 'border border-border bg-surface'
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid size-8 flex-none place-items-center rounded-full text-xs font-bold ${
          gelap ? 'bg-white/20 text-white' : 'bg-[#d5ede3] text-[#0b4a36]'
        }`}
      >
        {user ? inisial(nama) : 'W'}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[14px] font-bold">{user ? nama : 'Warga'}</span>
        <span className={`block text-xs ${gelap ? 'text-white/75' : 'text-muted'}`}>
          {user ? (profile?.peran === 'admin' ? 'Admin' : 'Warga') : 'Belum masuk'}
        </span>
      </span>
      {user ? (
        <button
          type="button"
          className={kelasTombol}
          onClick={async () => {
            await keluar();
            navigate('/');
          }}
        >
          Keluar
        </button>
      ) : (
        <Link to="/login" className={kelasTombol}>
          Masuk
        </Link>
      )}
    </div>
  );
}

/** Sidebar hijau melayang (layar lebar). */
function SidebarHijau({ grup }: { grup: GrupNav[] }) {
  return (
    <aside className="sticky top-4 m-4 mr-0 hidden h-[calc(100dvh-32px)] w-[272px] flex-none flex-col overflow-hidden rounded-[30px] border border-white/15 bg-hijau px-3.5 pt-5 pb-4 text-white lg:flex">
      <LingkaranDekorasi className="-right-[70px] bottom-[120px] size-[200px] shadow-[0_0_0_38px_rgb(255_255_255/0.05),0_0_0_78px_rgb(255_255_255/0.03)]" />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <Link to="/" className="mb-5 self-start rounded-lg px-2.5 py-1">
          {/* Di latar hijau, panduan logo meminta versi satu warna (putih). */}
          <img src={logoPutih} alt="Musrenbang Digital, ke beranda" className="h-[34px] w-auto" />
        </Link>
        <KotakWilayah gelap />
        <div className="mt-1 min-h-0 flex-1 overflow-y-auto">
          <DaftarNav grup={grup} gelap />
        </div>
        <div className="mt-3">
          <BarisPengguna gelap />
        </div>
      </div>
    </aside>
  );
}

/** Bar atas dan menu layar penuh untuk HP dan tablet. */
function TopbarHp({ grup }: { grup: GrupNav[] }) {
  const [buka, setBuka] = useState(false);
  const lokasi = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const tombolRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setBuka(false), [lokasi.pathname]);

  useEffect(() => {
    if (!buka) return;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    const tekan = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBuka(false);
        tombolRef.current?.focus();
      }
    };
    window.addEventListener('keydown', tekan);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', tekan);
    };
  }, [buka]);

  return (
    <div className="lg:hidden">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rule bg-ground px-4">
        <Link to="/" className="rounded-lg">
          <img src={logoWarna} alt="Musrenbang Digital, ke beranda" className="h-[34px] w-auto" />
        </Link>
        <button
          ref={tombolRef}
          type="button"
          aria-expanded={buka}
          aria-controls="menu-hp"
          onClick={() => setBuka((b) => !b)}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          <Ikon nama={buka ? 'tutup' : 'menu'} />
          {buka ? 'Tutup' : 'Menu'}
        </button>
      </header>
      {buka && (
        <div
          ref={panelRef}
          id="menu-hp"
          className="fixed inset-x-0 top-14 bottom-0 z-20 flex flex-col gap-4 overflow-y-auto bg-ground px-4 pt-4 pb-6"
        >
          <KotakWilayah gelap={false} />
          <DaftarNav grup={grup} gelap={false} />
          <div className="mt-auto">
            <BarisPengguna gelap={false} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Kerangka({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const grup = susunNav(profile?.peran === 'admin');

  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#isi"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-ground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Lewati ke isi
      </a>
      <TopbarHp grup={grup} />
      <SidebarHijau grup={grup} />
      <main id="isi" className="min-w-0 flex-1 px-4 pt-5 pb-10 sm:px-6 lg:px-10 lg:pt-8 lg:pb-14">
        <div className="mx-auto max-w-[1160px]">
          {modeContoh && (
            <p className="mb-6 rounded-2xl bg-mustard-pucat px-4 py-3 text-sm text-mustard-tua">
              Mode contoh: data diambil dari berkas seed tim backend karena aplikasi belum
              tersambung ke Supabase. Perubahan tidak disimpan.
            </p>
          )}
          {children}
          <p className="mt-12 text-sm text-muted">
            Musrenbang Digital adalah prototipe partisipasi warga, bukan sistem pemerintah.
          </p>
        </div>
      </main>
    </div>
  );
}
