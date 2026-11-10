import { useSyncExternalStore } from 'react';

const KUNCI = 'mb-sidebar-ringkas';
const pendengar = new Set<() => void>();

function baca(): boolean {
  try {
    return localStorage.getItem(KUNCI) === '1';
  } catch {
    return false;
  }
}

let nilai = baca();

function atur(ringkas: boolean) {
  nilai = ringkas;
  try {
    localStorage.setItem(KUNCI, ringkas ? '1' : '0');
  } catch {
    // Penyimpanan bisa ditolak (mode privat); pilihan tetap berlaku untuk sesi ini.
  }
  for (const dengar of pendengar) dengar();
}

function langgan(dengar: () => void) {
  pendengar.add(dengar);
  return () => pendengar.delete(dengar);
}

/** Sidebar layar lebar bisa dikecilkan jadi deretan ikon; pilihannya diingat di browser. */
export function useSidebarRingkas(): [boolean, (ringkas: boolean) => void] {
  const ringkas = useSyncExternalStore(
    langgan,
    () => nilai,
    () => false,
  );
  return [ringkas, atur];
}
