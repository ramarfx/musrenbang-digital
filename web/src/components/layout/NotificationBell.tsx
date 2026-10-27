import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/features/auth';
import { StatusBadge } from '@/features/proposals/components/StatusBadge';
import { useMyStatusChangesQuery } from '@/features/proposals/queries';
import { cn } from '@/lib/cn';
import { formatTanggalWaktu } from '@/lib/format';

const kunci = (userId: string) => `musrenbang:notif-dibaca:${userId}`;

/** Waktu terakhir daftar dibuka di perangkat ini (ms). Nol kalau belum pernah atau penyimpanan diblokir. */
function bacaTerakhir(userId: string): number {
  try {
    return Number(window.localStorage.getItem(kunci(userId))) || 0;
  } catch {
    return 0;
  }
}

function simpanTerakhir(userId: string, waktu: number) {
  try {
    window.localStorage.setItem(kunci(userId), String(waktu));
  } catch {
    // Penyimpanan diblokir: tanda belum dibaca akan muncul lagi di muatan berikutnya.
  }
}

/**
 * Lonceng pemberitahuan di bar atas: perubahan status pada usulan milik pengguna.
 * Dibaca dari riwayat status yang sudah ada, tanpa tabel baru. Tanda "sudah dibaca" disimpan
 * per perangkat (localStorage), jadi di perangkat lain angkanya bisa muncul lagi.
 */
type NotificationBellProps = {
  /** `dark` = di atas sidebar hijau. */
  dark?: boolean;
  /** `samping`: daftar muncul di kanan tombol (sidebar). `atas`: muncul di atas tombol (menu HP). */
  tempat?: 'samping' | 'atas';
};

export function NotificationBell({ dark = false, tempat = 'atas' }: NotificationBellProps) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const query = useMyStatusChangesQuery(userId);
  const [buka, setBuka] = useState(false);
  const [dibacaPada, setDibacaPada] = useState(0);
  // Batas yang dipakai untuk menandai baris baru selama daftar terbuka.
  const [batasBuka, setBatasBuka] = useState(0);
  const wadah = useRef<HTMLDivElement>(null);
  const tombol = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (userId) setDibacaPada(bacaTerakhir(userId));
  }, [userId]);

  useEffect(() => {
    if (!buka) return;
    const tutupLuar = (event: MouseEvent) => {
      if (wadah.current && !wadah.current.contains(event.target as Node)) setBuka(false);
    };
    const tutupEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setBuka(false);
        tombol.current?.focus();
      }
    };
    document.addEventListener('mousedown', tutupLuar);
    document.addEventListener('keydown', tutupEsc);
    return () => {
      document.removeEventListener('mousedown', tutupLuar);
      document.removeEventListener('keydown', tutupEsc);
    };
  }, [buka]);

  if (!userId) return null;

  const perubahan = query.data ?? [];
  const baru = perubahan.filter((item) => new Date(item.diubah_pada).getTime() > dibacaPada);

  const toggle = () => {
    if (!buka) {
      setBatasBuka(dibacaPada);
      const sekarang = Date.now();
      setDibacaPada(sekarang);
      simpanTerakhir(userId, sekarang);
    }
    setBuka((nilai) => !nilai);
  };

  // Di sidebar, daftar berpatokan pada tepi sidebar (bukan tombol), jadi pembungkus tidak diberi `relative`.
  return (
    <div ref={wadah} className={tempat === 'samping' ? undefined : 'relative'}>
      <button
        ref={tombol}
        type="button"
        onClick={toggle}
        aria-expanded={buka}
        aria-controls="daftar-pemberitahuan"
        aria-label={
          baru.length > 0
            ? `Pemberitahuan, ${baru.length} belum dibaca`
            : 'Pemberitahuan, tidak ada yang baru'
        }
        className={cn(
          'relative grid size-9 flex-none place-items-center rounded-xl border transition-[scale,background-color] duration-150 ease-out active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2',
          dark
            ? 'border-white/25 text-white hover:bg-white/15 focus-visible:outline-white'
            : 'border-border bg-surface text-ink hover:bg-active focus-visible:outline-warga',
        )}
      >
        <Icon name="lonceng" size={19} />
        {baru.length > 0 && (
          <span
            aria-hidden="true"
            className={cn(
              'absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold',
              dark ? 'bg-white text-hijau' : 'bg-hijau text-white',
            )}
          >
            {baru.length > 9 ? '9+' : baru.length}
          </span>
        )}
      </button>

      {buka && (
        <div
          id="daftar-pemberitahuan"
          className={cn(
            'anim-popover absolute z-40 w-[380px] max-w-[calc(100vw-2rem)] rounded-3xl border border-border bg-surface p-2 text-ink',
            tempat === 'samping' ? 'bottom-0 left-full ml-4' : 'right-0 bottom-12',
          )}
        >
          <p className="px-3 pt-2 pb-1 text-[13px] font-semibold text-muted">
            Perubahan status usulanmu
          </p>
          {query.isPending ? (
            <p className="px-3 py-4 text-sm text-muted">Memuat...</p>
          ) : query.isError ? (
            <p className="px-3 py-4 text-sm text-red-700">
              Pemberitahuan gagal dimuat. Coba lagi sebentar.
            </p>
          ) : perubahan.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">
              Belum ada perubahan status. Kalau admin mengubah status usulanmu, kabarnya muncul di
              sini.
            </p>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto">
              {perubahan.map((item) => {
                const baruItem = new Date(item.diubah_pada).getTime() > batasBuka;
                return (
                  <li key={item.id}>
                    <Link
                      to={`/usulan/${item.proposal_id}`}
                      onClick={() => setBuka(false)}
                      className={cn(
                        'flex gap-3 rounded-2xl px-3 py-2.5 transition-colors duration-150 hover:bg-active focus-visible:outline-2 focus-visible:outline-warga',
                        baruItem && 'bg-ground',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'mt-2 size-2 flex-none rounded-full',
                          baruItem ? 'bg-hijau' : 'bg-transparent',
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{item.judul}</span>
                        <span className="mt-1 flex items-center gap-2 text-[12.5px] text-muted">
                          Status jadi <StatusBadge status={item.status_baru} />
                        </span>
                        <span className="mt-1 block text-[12.5px] text-muted">
                          {formatTanggalWaktu(item.diubah_pada)} ·{' '}
                          {item.diubah_oleh_nama ?? 'Sistem'}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
