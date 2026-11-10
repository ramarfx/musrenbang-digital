import { useSyncExternalStore } from 'react';

// Jumlah tombol "?" (TurHalaman) yang sedang terpasang. Tombol asisten melayang bergeser dari
// pojok hanya bila halaman punya tombol "?", supaya tidak ada celah kosong di halaman tanpa tur.
let jumlah = 0;
const pendengar = new Set<() => void>();

function beri() {
  for (const dengar of pendengar) dengar();
}

/** Dipanggil TurHalaman saat terpasang; hasilnya dipanggil saat dilepas. */
export function daftarkanTur(): () => void {
  jumlah += 1;
  beri();
  return () => {
    jumlah -= 1;
    beri();
  };
}

function langgan(dengar: () => void) {
  pendengar.add(dengar);
  return () => pendengar.delete(dengar);
}

export function useAdaTur(): boolean {
  return useSyncExternalStore(
    langgan,
    () => jumlah > 0,
    () => false,
  );
}
