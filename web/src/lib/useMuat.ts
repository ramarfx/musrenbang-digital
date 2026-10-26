import { useCallback, useEffect, useState } from 'react';

/** Memuat data sekali, dengan status memuat, pesan galat, dan fungsi ulangi. */
export function useMuat<T>(ambil: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const jalankan = useCallback(ambil, deps);

  const ulangi = useCallback(() => {
    setMemuat(true);
    setGalat(null);
    jalankan()
      .then(setData)
      .catch((e: unknown) => setGalat(e instanceof Error ? e.message : String(e)))
      .finally(() => setMemuat(false));
  }, [jalankan]);

  useEffect(ulangi, [ulangi]);

  return { data, memuat, galat, ulangi, setData };
}
