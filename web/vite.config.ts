import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Mode data contoh membaca berkas seed di ../db/seeds (hanya dibaca, tidak diubah).
    // Izin dibatasi ke folder web dan folder seed saja, bukan seluruh repo.
    fs: { allow: ['.', '../db/seeds'] },
  },
});
