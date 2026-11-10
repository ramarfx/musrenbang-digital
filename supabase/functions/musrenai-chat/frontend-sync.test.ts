import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { faq, routes } from './knowledge';

// Penjaga kesesuaian antara tampilan aplikasi dan pengetahuan MusrenAI. Asisten hanya boleh
// menjawab dari `faq`, jadi bila frontend mengganti nama menu atau menambah contoh pertanyaan
// tanpa memperbarui `knowledge.ts`, asisten menjawab "tidak memiliki informasi". Tes ini
// membuat ketidakcocokan itu merah di CI, bukan baru terlihat saat demo.
const web = join(import.meta.dir, '../../../web/src');
const baca = (path: string) => readFileSync(join(web, path), 'utf8');
const faqKecil = faq.toLowerCase();

// Menu warga: pasangan alamat dan nama dari buildNav. Menu admin dan Beranda bukan bahan FAQ.
function menuWarga(): { to: string; label: string }[] {
  const sumber = baca('components/layout/nav.tsx');
  return [...sumber.matchAll(/\{ to: '([^']+)', label: '([^']+)'/g)]
    .map(([, to, label]) => ({ to: to ?? '', label: label ?? '' }))
    .filter((item) => !item.to.startsWith('/admin') && item.to !== '/beranda');
}

// Istilah khusus dalam contoh pertanyaan: kata berhuruf besar di tengah kalimat, mis. "Prioritasku".
function contohPertanyaan(): string[] {
  const sumber = baca('features/musrenai/AsistenMelayang.tsx');
  const blok = /CONTOH_PERTANYAAN\s*=\s*\[([\s\S]*?)\]/.exec(sumber)?.[1] ?? '';
  return [...blok.matchAll(/'([^']+)'/g)].map(([, teks]) => teks ?? '');
}

describe('MusrenAI sejalan dengan tampilan aplikasi', () => {
  test('menu dan contoh pertanyaan berhasil dibaca dari frontend', () => {
    expect(menuWarga().length).toBeGreaterThanOrEqual(4);
    expect(contohPertanyaan().length).toBeGreaterThanOrEqual(1);
  });

  test('setiap nama menu warga disebut di FAQ', () => {
    const hilang = menuWarga()
      .map((item) => item.label)
      .filter((label) => !faqKecil.includes(label.toLowerCase()));
    expect(hilang).toEqual([]);
  });

  test('label tautan rute sama dengan nama menu bagi halaman yang sama', () => {
    const beda = menuWarga().flatMap((item) => {
      const rute = Object.values(routes).find((r) => r.path === item.to);
      return rute && rute.label !== item.label ? [`${item.to}: ${rute.label} != ${item.label}`] : [];
    });
    expect(beda).toEqual([]);
  });

  test('istilah khusus dalam contoh pertanyaan dikenal FAQ', () => {
    const istilah = contohPertanyaan().flatMap((tanya) =>
      tanya
        .replace(/[?!.,]/g, '')
        .split(/\s+/)
        .slice(1)
        .filter((kata) => /^[A-Z]/.test(kata)),
    );
    const hilang = istilah.filter((kata) => !faqKecil.includes(kata.toLowerCase()));
    expect(hilang).toEqual([]);
  });
});
