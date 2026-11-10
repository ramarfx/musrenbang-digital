import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApbdPorsi } from './ApbdPorsi';
import type { PorsiApbd } from '../lib';

const porsi: PorsiApbd = {
  rows: [
    { kategori: 'Pendidikan', nominal: 600, persen: 60 },
    { kategori: 'Kesehatan', nominal: 400, persen: 40 },
  ],
  total: 1000,
  belum: ['Transportasi Publik'],
};

describe('ApbdPorsi', () => {
  test('menampilkan persen, rupiah, dan bidang yang belum masuk hitungan', () => {
    const html = renderToStaticMarkup(<ApbdPorsi porsi={porsi} />);
    expect(html).toContain('60%');
    expect(html).toContain('Rp600');
    expect(html).toContain('1 bidang belum masuk hitungan');
    expect(html).toContain('Transportasi Publik');
  });

  test('tanpa angka terverifikasi tidak menggambar batang palsu', () => {
    const html = renderToStaticMarkup(
      <ApbdPorsi porsi={{ rows: [], total: 0, belum: ['Pendidikan'] }} />,
    );
    expect(html).toContain('Belum ada angka APBD yang terverifikasi');
    expect(html).not.toContain('bar-in');
  });
});
