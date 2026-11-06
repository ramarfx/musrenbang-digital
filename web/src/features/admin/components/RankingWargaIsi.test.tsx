import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { RankingWargaIsi } from './RankingWargaIsi';

const tampil = (baris: Parameters<typeof RankingWargaIsi>[0]['baris']) =>
  renderToStaticMarkup(<RankingWargaIsi baris={baris} memuat={false} galat={false} />);

describe('RankingWargaIsi', () => {
  test('menampilkan bidang dari skor terbesar beserta jumlah warga', () => {
    const html = tampil([
      { kategori: 'Kesehatan', skor: 52, jumlah_partisipan: 6 },
      { kategori: 'Pendidikan', skor: 41, jumlah_partisipan: 6 },
    ]);
    expect(html).toContain('6 warga ikut mengurutkan');
    expect(html.indexOf('Kesehatan')).toBeLessThan(html.indexOf('Pendidikan'));
    expect(html).toContain('52');
  });

  test('menjelaskan kenapa kosong bila partisipan kurang dari dua', () => {
    const html = tampil([]);
    expect(html).toContain('minimal dua warga');
    expect(html).not.toContain('ikut mengurutkan');
  });

  test('menampilkan keadaan memuat dan galat tanpa daftar', () => {
    const memuat = renderToStaticMarkup(<RankingWargaIsi baris={[]} memuat galat={false} />);
    const galat = renderToStaticMarkup(<RankingWargaIsi baris={[]} memuat={false} galat />);
    expect(memuat).toContain('Memuat');
    expect(galat).toContain('belum bisa dimuat');
  });
});
