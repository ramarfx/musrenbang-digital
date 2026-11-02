import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/cn';
import { useTutupDiLuar } from '@/lib/useTutupDiLuar';

const baris =
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] font-semibold text-ink transition-[background-color] duration-150 ease-out hover:bg-active focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-warga';

/**
 * Tombol akun di pojok kanan atas halaman depan untuk yang sudah masuk: avatar, nama depan,
 * dan daftar berisi beranda, profil, dan keluar. Tombol "Masuk" digantikan olehnya, jadi
 * pengunjung langsung tahu dirinya sudah masuk.
 */
export function MenuAkun() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [buka, setBuka] = useState(false);
  const [keluar, setKeluar] = useState(false);
  const akar = useRef<HTMLDivElement>(null);
  const tutup = useCallback(() => setBuka(false), []);
  useTutupDiLuar(buka, akar, tutup);

  const nama = profile?.nama ?? user?.email ?? 'Warga';
  const namaDepan = nama.trim().split(/\s+/)[0] ?? nama;

  const keluarAkun = async () => {
    setKeluar(true);
    try {
      await signOut();
      toast.success('Kamu sudah keluar.');
      setBuka(false);
      navigate('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal keluar.');
    } finally {
      setKeluar(false);
    }
  };

  return (
    <div ref={akar} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={buka}
        aria-label={`Menu akun ${nama}`}
        onClick={() => setBuka((nilai) => !nilai)}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-edge bg-surface py-1 pr-2.5 pl-1.5 text-[15px] font-semibold text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-active active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warga"
      >
        <span className="relative">
          <Avatar nama={nama} />
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-zamrud ring-2 ring-[var(--surface)]"
          />
        </span>
        <span className="hidden max-w-[10ch] truncate sm:block">{namaDepan}</span>
        <span
          className={cn('grid transition-transform duration-200 ease-out', buka && 'rotate-180')}
        >
          <Icon name="panahBawah" size={14} />
        </span>
      </button>

      {buka && (
        <div
          role="menu"
          className="daftar-wilayah absolute top-full right-0 z-50 mt-2 w-64 rounded-2xl border border-border bg-surface p-1.5 shadow-lg"
          style={{ transformOrigin: 'top right' }}
        >
          <div className="flex items-center gap-3 px-2.5 pt-2 pb-3">
            <Avatar nama={nama} ukuran="besar" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[14px] font-bold">{nama}</span>
              <span className="block text-xs text-muted">
                {isAdmin ? 'Admin' : 'Warga'} · sudah masuk
              </span>
            </span>
          </div>
          <div className="border-t border-border pt-1.5">
            <Link to="/beranda" state={{ masukApp: true }} role="menuitem" className={baris}>
              <Icon name="beranda" size={17} />
              Buka beranda
            </Link>
            <Link to="/profil" role="menuitem" className={baris}>
              <Icon name="profil" size={17} />
              Profil
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => void keluarAkun()}
              disabled={keluar}
              className={cn(baris, 'disabled:opacity-60')}
            >
              <Icon name="tutup" size={17} />
              Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
