import { useEffect, useRef, useState } from 'react';

/**
 * True sekali saat elemen pertama kali masuk area pandang, lalu observer dilepas (animasi
 * masuk tidak perlu berulang setiap kali di-scroll bolak-balik). Dipakai untuk bagian landing
 * yang memudar naik saat discroll; lihat kelas `.masuk`/`.masuk-stagger` di index.css.
 * `prefers-reduced-motion` ditangani di CSS (transisi jadi instan), bukan di sini, supaya
 * elemen tetap "tampak" dan tidak tersembunyi permanen bila observer tidak sempat memicu.
 */
export function useMasukTerlihat<T extends HTMLElement>(ambang = 0.2) {
  const ref = useRef<T>(null);
  const [tampak, setTampak] = useState(false);

  useEffect(() => {
    const elemen = ref.current;
    if (!elemen) return;
    if (typeof IntersectionObserver === 'undefined') {
      setTampak(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setTampak(true);
          observer.disconnect();
        }
      },
      { threshold: ambang, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(elemen);
    return () => observer.disconnect();
  }, [ambang]);

  return [ref, tampak] as const;
}
