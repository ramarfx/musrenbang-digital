import { useCallback, useEffect, useRef, useState } from 'react';
import { cariAlamat } from './geocode';

/** Jeda setelah klik terakhir sebelum alamat dicari, supaya klik beruntun jadi satu permintaan. */
const JEDA_MS = 700;

/**
 * Alamat dari titik di peta. `minta` menunggu sebentar lalu mencari alamatnya dan memanggil
 * `saatKetemu`; permintaan sebelumnya dibatalkan, jadi hanya titik terakhir yang dicari.
 * `tetapkan` mengisi alamat yang sudah diketahui (mis. dari hasil cari tanpa permintaan baru).
 */
export function useAlamatTitik() {
  const [alamat, setAlamat] = useState<string | null>(null);
  const [mencari, setMencari] = useState(false);
  const [gagal, setGagal] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const kontrol = useRef<AbortController | null>(null);

  const batal = useCallback(() => {
    window.clearTimeout(timer.current);
    kontrol.current?.abort();
  }, []);

  useEffect(() => batal, [batal]);

  const minta = useCallback(
    (lat: number, lng: number, saatKetemu?: (alamat: string) => void) => {
      batal();
      setMencari(true);
      setGagal(false);
      timer.current = window.setTimeout(() => {
        const saya = new AbortController();
        kontrol.current = saya;
        cariAlamat(lat, lng, saya.signal)
          .then((hasil) => {
            if (saya.signal.aborted) return;
            setAlamat(hasil);
            if (hasil) saatKetemu?.(hasil);
          })
          .catch(() => {
            if (!saya.signal.aborted) setGagal(true);
          })
          .finally(() => {
            if (!saya.signal.aborted) setMencari(false);
          });
      }, JEDA_MS);
    },
    [batal],
  );

  const tetapkan = useCallback(
    (nilai: string | null) => {
      batal();
      setMencari(false);
      setGagal(false);
      setAlamat(nilai);
    },
    [batal],
  );

  return { alamat, mencari, gagal, minta, tetapkan };
}
