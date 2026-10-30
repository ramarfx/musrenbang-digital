import { useSyncExternalStore } from 'react';

export type Tema = 'terang' | 'gelap';

const KUNCI = 'mb-tema';
const pendengar = new Set<() => void>();
/** Durasi transisi `.tema-ganti` di index.css; dua angka ini harus tetap sama. */
const LAMA_TRANSISI_MS = 260;
let timerTransisi: ReturnType<typeof setTimeout> | undefined;

function bacaTema(): Tema {
  return document.documentElement.dataset.theme === 'dark' ? 'gelap' : 'terang';
}

/**
 * Tema awal sudah dipasang skrip kecil di index.html sebelum React jalan (supaya tidak ada
 * kedipan terang). Di sini tema hanya dibaca dan diganti; pilihan disimpan di localStorage.
 */
export function pasangTema(tema: Tema) {
  const html = document.documentElement;
  // Kelas ini memberi semua elemen transisi warna yang seragam sesaat (lihat index.css),
  // supaya ganti tema terasa memudar bersama, bukan berpindah seketika. Dilepas lagi setelah
  // transisinya selesai supaya animasi hover dan sejenisnya kembali ke durasinya sendiri.
  html.classList.add('tema-ganti');
  clearTimeout(timerTransisi);
  timerTransisi = setTimeout(() => html.classList.remove('tema-ganti'), LAMA_TRANSISI_MS);
  html.dataset.theme = tema === 'gelap' ? 'dark' : 'light';
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
