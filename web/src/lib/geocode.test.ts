import { describe, expect, test } from 'bun:test';
import { bacaHasilCari } from './geocode';

describe('bacaHasilCari', () => {
  test('mengubah balasan Nominatim dan menyingkat nama', () => {
    const hasil = bacaHasilCari([
      { display_name: 'Kramat Jati, Jakarta Timur, DKI Jakarta, Indonesia', lat: '-6.27', lon: '106.87' },
    ]);
    expect(hasil).toEqual([
      { nama: 'Kramat Jati, Jakarta Timur, DKI Jakarta, Indonesia', singkat: 'Kramat Jati, Jakarta Timur', lat: -6.27, lng: 106.87 },
    ]);
  });

  test('membuang baris kembar dan membatasi lima hasil', () => {
    const kembar = { display_name: 'Kramat Jati, Jakarta Timur, DKI Jakarta', lat: '-6.27', lon: '106.87' };
    const banyak = Array.from({ length: 8 }, (_, i) => ({
      display_name: `Tempat ${i}, Jakarta`,
      lat: '-6.2',
      lon: '106.8',
    }));
    expect(bacaHasilCari([kembar, { ...kembar, lat: '-6.28' }])).toHaveLength(1);
    expect(bacaHasilCari(banyak)).toHaveLength(5);
  });

  test('membuang balasan yang bentuknya salah atau koordinat di luar batas', () => {
    expect(bacaHasilCari({ error: 'x' })).toEqual([]);
    expect(bacaHasilCari([{ display_name: 'A', lat: '999', lon: '106' }])).toEqual([]);
  });
});
