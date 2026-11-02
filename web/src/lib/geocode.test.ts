import { describe, expect, test } from 'bun:test';
import { bacaAlamat, bacaHasilCari } from './geocode';

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

describe('bacaAlamat', () => {
  test('menyusun jalan, kelurahan, kecamatan, dan kota', () => {
    expect(
      bacaAlamat({
        address: {
          road: 'Jalan Suwiryo',
          village: 'Gondangdia',
          suburb: 'Menteng',
          city_district: 'Jakarta Pusat',
          city: 'Daerah Khusus Ibukota Jakarta',
        },
      }),
    ).toBe('Jalan Suwiryo, Gondangdia, Menteng, Jakarta Pusat');
  });

  test('memakai nama lengkap bila rincian alamat tidak ada', () => {
    expect(bacaAlamat({ display_name: 'Kramat Jati, Jakarta Timur, DKI Jakarta, Indonesia' })).toBe(
      'Kramat Jati, Jakarta Timur, DKI Jakarta',
    );
  });

  test('kosong untuk balasan yang tidak berisi alamat atau bentuknya salah', () => {
    expect(bacaAlamat({ error: 'Unable to geocode' })).toBeNull();
    expect(bacaAlamat('x')).toBeNull();
  });
});
