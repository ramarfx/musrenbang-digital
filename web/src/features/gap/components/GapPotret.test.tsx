import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { GapPotret } from './GapPotret';
import { siapkanGap } from '../lib';

const baris = (kategori: string, warga: number, apbd: number) => ({
  kategori,
  persen_warga: warga,
  persen_apbd: apbd,
  gap_poin_persen: warga - apbd,
  nominal_apbd: 100,
  total_alokasi_warga: 100,
  jumlah_partisipan: 4,
  apbd_tersedia: true,
});

describe('GapPotret', () => {
  test('menyebut jumlah bidang yang sama-sama masuk tiga teratas', () => {
    const ringkasan = siapkanGap([
      baris('Pendidikan', 40, 10),
      baris('Kesehatan', 30, 25),
      baris('Infrastruktur dan Jalan', 20, 5),
      baris('Transportasi Publik', 10, 40),
    ]);
    const html = renderToStaticMarkup(<GapPotret ringkasan={ringkasan} />);
    expect(html).toContain('Dua dari tiga prioritas teratas warga');
  });

  test('tanpa pilihan warga kartu tidak dirender', () => {
    const ringkasan = siapkanGap([baris('Pendidikan', 0, 100)]);
    expect(renderToStaticMarkup(<GapPotret ringkasan={ringkasan} />)).toBe('');
  });
});
