import { PROPOSAL_STATUSES } from '@musrenbang/shared';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/features/auth';
import { StatusBadge, WARNA_STATUS } from '@/features/proposals/components/StatusBadge';
import { useMyStatusChangesQuery } from '@/features/proposals/queries';
import type { StatusChange } from '@/features/proposals/api';
import { cn } from '@/lib/cn';
import { formatTanggalWaktu } from '@/lib/format';

const kunci = (userId: string) => `musrenbang:notif-dibaca:${userId}`;
const kunciTutup = (userId: string) => `musrenbang:notif-ditutup:${userId}`;

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

/** Id kabar yang sudah ditutup warga di perangkat ini. */
function bacaDitutup(userId: string): number[] {
  try {
    const nilai: unknown = JSON.parse(window.localStorage.getItem(kunciTutup(userId)) ?? '[]');
    return Array.isArray(nilai)
      ? nilai.filter((item): item is number => typeof item === 'number')
      : [];
  } catch {
    return [];
  }
}

function simpanDitutup(userId: string, id: number[]) {
  try {
    window.localStorage.setItem(kunciTutup(userId), JSON.stringify(id));
  } catch {
    // Diblokir: kabar yang ditutup muncul lagi saat halaman dimuat ulang.
  }
}

/** Satu usulan, diwakili perubahan statusnya yang terbaru. Daftar sudah terurut terbaru dulu. */
function terbaruPerUsulan(perubahan: StatusChange[]): StatusChange[] {
  const lihat = new Set<number>();
  return perubahan.filter((item) => {
    if (lihat.has(item.proposal_id)) return false;
    lihat.add(item.proposal_id);
    return true;
  });
}

/** Lima ruas kecil: terisi warna tahap sampai tahap sekarang. */
export function RuasTahap({ status }: { status: string }) {
  const tahap = Math.max(
    0,
    PROPOSAL_STATUSES.indexOf(status as (typeof PROPOSAL_STATUSES)[number]),
  );
  const warna = WARNA_STATUS[status as keyof typeof WARNA_STATUS] ?? '#E4DDCF';
  return (
    <div aria-hidden="true" className="mt-2.5 flex gap-[3px]">
      {PROPOSAL_STATUSES.map((nama, index) => (
        <i
          key={nama}
          style={index <= tahap ? ({ backgroundColor: warna } as CSSProperties) : undefined}
          className={cn(
            'h-[5px] flex-1 rounded-[2px]',
            index <= tahap ? 'shadow-[inset_0_0_0_1px_var(--ink)]' : 'bg-track',
          )}
        />
      ))}
    </div>
  );
}

/**
 * Lonceng pemberitahuan di bar atas: perubahan status pada usulan milik pengguna.
 * Dibaca dari riwayat status yang sudah ada, tanpa tabel baru. Satu usulan satu kartu (status
 * terbarunya), dan tiap kartu bisa ditutup. Tanda "sudah dibaca" dan kabar yang ditutup disimpan
 * per perangkat (localStorage), jadi di perangkat lain bisa muncul lagi. Kartu yang ditutup
 * muncul kembali bila usulannya berganti status lagi.
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
  // Batas yang dipakai untuk menandai kartu baru selama daftar terbuka.
  const [batasBuka, setBatasBuka] = useState(0);
  const [ditutup, setDitutup] = useState<number[]>([]);
  const wadah = useRef<HTMLDivElement>(null);
  const tombol = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!userId) return;
    setDibacaPada(bacaTerakhir(userId));
    setDitutup(bacaDitutup(userId));
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

  const kartu = useMemo(
    () => terbaruPerUsulan(query.data ?? []).filter((item) => !ditutup.includes(item.id)),
    [query.data, ditutup],
  );

  if (!userId) return null;

  const baru = kartu.filter((item) => new Date(item.diubah_pada).getTime() > dibacaPada);

  const toggle = () => {
    if (!buka) {
      setBatasBuka(dibacaPada);
      const sekarang = Date.now();
      setDibacaPada(sekarang);
      simpanTerakhir(userId, sekarang);
    }
    setBuka((nilai) => !nilai);
  };

  const tutupKartu = (daftar: StatusChange[]) => {
    // Hanya id yang masih ada di data yang disimpan, supaya daftar tersimpan tidak menumpuk.
    const ada = new Set((query.data ?? []).map((item) => item.id));
    const berikut = [...new Set([...ditutup, ...daftar.map((item) => item.id)])].filter((id) =>
      ada.has(id),
    );
    setDitutup(berikut);
    simpanDitutup(userId, berikut);
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
            'anim-popover kartu-cap absolute z-40 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[20px] bg-surface text-ink',
            tempat === 'samping' ? 'bottom-0 left-full ml-4' : 'right-0 bottom-12',
          )}
        >
          <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-2">
            <h2 className="text-[15.5px] font-bold">Kabar usulanmu</h2>
            {kartu.length > 1 ? (
              <button
                type="button"
                onClick={() => tutupKartu(kartu)}
                className="text-[12.5px] font-semibold text-muted underline-offset-2 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-warga"
              >
                Tutup semua
              </button>
            ) : (
              baru.length > 0 && (
                <span className="text-[12.5px] text-muted">{baru.length} baru</span>
              )
            )}
          </div>

          {query.isPending ? (
            <p className="px-4 pt-1 pb-5 text-sm text-muted">Memuat...</p>
          ) : query.isError ? (
            <p className="px-4 pt-1 pb-5 text-sm text-red-700">
              Pemberitahuan gagal dimuat. Coba lagi sebentar.
            </p>
          ) : kartu.length === 0 ? (
            <p className="px-4 pt-1 pb-5 text-sm text-muted">
              {(query.data ?? []).length === 0
                ? 'Belum ada perubahan status. Kalau admin mengubah status usulanmu, kabarnya muncul di sini.'
                : 'Tidak ada kabar. Semua sudah kamu tutup.'}
            </p>
          ) : (
            <ul className="stagger grid max-h-[380px] gap-2.5 overflow-y-auto px-3 pt-1 pb-3.5 [scrollbar-color:var(--ink)_transparent] [scrollbar-width:thin]">
              {kartu.map((item) => {
                const baruItem = new Date(item.diubah_pada).getTime() > batasBuka;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      'relative rounded-[14px] border-[1.5px] border-edge',
                      baruItem ? 'bg-ground' : 'bg-surface',
                    )}
                  >
                    <Link
                      to={`/usulan/${item.proposal_id}`}
                      onClick={() => setBuka(false)}
                      className="block rounded-[13px] px-3.5 pt-3 pr-11 pb-3 transition-colors duration-150 hover:bg-active focus-visible:outline-2 focus-visible:outline-warga"
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold">{item.judul}</span>
                        {baruItem && (
                          <span className="flex-none rounded-md bg-ink px-1.5 py-px text-[11px] font-bold text-on-ink">
                            Baru
                          </span>
                        )}
                      </span>
                      <span className="mt-1.5 block text-[13px]">
                        <StatusBadge status={item.status_baru} />{' '}
                        <span className="text-[12px] text-muted">
                          · {formatTanggalWaktu(item.diubah_pada)}
                        </span>
                      </span>
                      {item.status_lama && (
                        <span className="mt-1.5 block text-[12px] text-muted">
                          Sebelumnya: {item.status_lama}
                        </span>
                      )}
                      <RuasTahap status={item.status_baru} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => tutupKartu([item])}
                      aria-label={`Tutup kabar ${item.judul}`}
                      className="absolute top-2 right-2 grid size-7 place-items-center rounded-lg text-muted transition-[scale,background-color,color] duration-150 ease-out hover:bg-active hover:text-ink active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-warga"
                    >
                      <Icon name="tutup" size={15} />
                    </button>
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
