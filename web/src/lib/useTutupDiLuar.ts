import { useEffect, type RefObject } from 'react';

/** Menutup daftar yang sedang terbuka saat klik di luar `akar` atau tombol Esc ditekan. */
export function useTutupDiLuar(buka: boolean, akar: RefObject<HTMLElement | null>, tutup: () => void) {
  useEffect(() => {
    if (!buka) return;
    const diLuar = (event: PointerEvent) => {
      if (!akar.current?.contains(event.target as Node)) tutup();
    };
    const esc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') tutup();
    };
    document.addEventListener('pointerdown', diLuar);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', diLuar);
      document.removeEventListener('keydown', esc);
    };
  }, [buka, akar, tutup]);
}
