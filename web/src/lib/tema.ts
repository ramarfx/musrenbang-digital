import { useSyncExternalStore } from 'react';

export type Tema = 'terang' | 'gelap';

const KUNCI = 'mb-tema';
const pendengar = new Set<() => void>();

function bacaTema(): Tema {
  return document.documentElement.dataset.theme === 'dark' ? 'gelap' : 'terang';
}

/**
 * Tema awal sudah dipasang skrip kecil di index.html sebelum React jalan (supaya tidak ada
 * kedipan terang). Di sini tema hanya dibaca dan diganti; pilihan disimpan di localStorage.
 */
export function pasangTema(tema: Tema) {
  const html = document.documentElement;
  // Transisi warna dimatikan sesaat supaya semua elemen berganti tema bersamaan, bukan
  // bertahap (tombol dengan transisi latar sempat tertinggal di warna tema lama).
  html.classList.add('tema-ganti');
  html.dataset.theme = tema === 'gelap' ? 'dark' : 'light';
  void html.offsetHeight;
  requestAnimationFrame(() => html.classList.remove('tema-ganti'));
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', tema === 'gelap' ? '#0F1A21' : '#F7F4EF');
  try {
    localStorage.setItem(KUNCI, tema);
  } catch {
    // Penyimpanan bisa ditolak (mode privat); tema tetap berlaku untuk sesi ini.
  }
  for (const dengar of pendengar) dengar();
}

function langgan(dengar: () => void) {
  pendengar.add(dengar);
  return () => pendengar.delete(dengar);
}

export function useTema(): [Tema, (tema: Tema) => void] {
  const tema = useSyncExternalStore(langgan, bacaTema, () => 'terang' as Tema);
  return [tema, pasangTema];
}
