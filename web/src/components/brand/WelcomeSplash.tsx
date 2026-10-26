import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { AnimatedLogo } from './AnimatedLogo';

/**
 * Layar sambutan: animasi logo resmi dan bar loading. Muncul dua kali:
 * 1. saat web pertama dibuka di tab itu (sekali per sesi tab, jadi pindah
 *    halaman atau refresh tidak mengulangnya);
 * 2. setelah login atau daftar berhasil.
 * Tampil minimal 2,4 detik (huruf terakhir selesai sekitar 2,35 detik) dan
 * baru hilang setelah pemeriksaan sesi login selesai. Batas atas 6 detik
 * supaya layar tidak menahan kalau Supabase lambat atau tidak terjangkau.
 */
const MIN_MS = 2400;
const MIN_REDUCED_MS = 700;
const MAX_MS = 6000;
const EXIT_MS = 220;
const SEEN_KEY = 'musrenbang:sambutan-dilihat';

type SplashContextValue = { play: () => void };

const SplashContext = createContext<SplashContextValue | null>(null);

function alreadySeen(): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Penyimpanan diblokir: splash boleh tampil lagi di muatan berikutnya.
  }
}

export function WelcomeSplashProvider({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  // Fase awal dihitung sebelum render pertama supaya tidak ada kilatan isi web.
  const [phase, setPhase] = useState<'hidden' | 'visible' | 'leaving'>(() =>
    alreadySeen() ? 'hidden' : 'visible',
  );
  const [minDone, setMinDone] = useState(false);

  const play = useCallback(() => setPhase('visible'), []);

  // Pratinjau saat pengembangan saja: buka /?sambutan untuk memutar animasi
  // tanpa harus login. Tidak ikut ke hasil build produksi.
  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('sambutan')) {
      play();
    }
  }, [play]);

  useEffect(() => {
    if (phase !== 'visible') return;
    markSeen();
    setMinDone(false);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.body.style.overflow = 'hidden';
    const minTimer = window.setTimeout(() => setMinDone(true), reduced ? MIN_REDUCED_MS : MIN_MS);
    const maxTimer = window.setTimeout(() => setPhase('leaving'), MAX_MS);
    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
      document.body.style.overflow = '';
    };
  }, [phase]);

  // Pergi setelah waktu minimal lewat dan pemeriksaan sesi login selesai.
  useEffect(() => {
    if (phase === 'visible' && minDone && !loading) setPhase('leaving');
  }, [phase, minDone, loading]);

  useEffect(() => {
    if (phase !== 'leaving') return;
    const timer = window.setTimeout(() => setPhase('hidden'), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  return (
    <SplashContext.Provider value={{ play }}>
      {children}
      {phase !== 'hidden' && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-ground px-4 transition-opacity ease-out data-[leaving=true]:opacity-0"
          style={{ transitionDuration: `${EXIT_MS}ms` }}
          data-leaving={phase === 'leaving'}
          aria-busy={phase === 'visible'}
        >
          <div className="flex flex-col items-center gap-7 text-center">
            <AnimatedLogo className="block h-auto w-[min(380px,72vw)]" />
            <div
              aria-hidden="true"
              className="h-1 w-[min(220px,50vw)] overflow-hidden rounded-full bg-track"
            >
              <i className="logo-anim-bar block h-full w-2/5 rounded-full bg-warga" />
            </div>
            {/* Hanya untuk pembaca layar; tidak tampil di layar. */}
            <p role="status" className="sr-only">
              Memuat
            </p>
          </div>
        </div>
      )}
    </SplashContext.Provider>
  );
}

/** Panggil `play()` tepat setelah login atau daftar berhasil. */
export function useWelcomeSplash(): SplashContextValue {
  const context = useContext(SplashContext);
  if (!context) throw new Error('useWelcomeSplash harus dipakai di dalam WelcomeSplashProvider.');
  return context;
}
