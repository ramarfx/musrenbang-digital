import { describe, expect, test } from 'bun:test';
import { arahSelisih } from './lib';

describe('arahSelisih', () => {
  test('selisih positif besar berarti perlu ditambah', () => {
    expect(arahSelisih(12.2).kunci).toBe('tambah');
    expect(arahSelisih(2).kunci).toBe('tambah');
  });

  test('selisih negatif besar berarti terlalu besar', () => {
    expect(arahSelisih(-25.3).kunci).toBe('kurang');
    expect(arahSelisih(-2).kunci).toBe('kurang');
  });

  test('selisih kecil dianggap hampir pas, ditentukan setelah dibulatkan', () => {
    expect(arahSelisih(1.1).kunci).toBe('pas');
    expect(arahSelisih(-1.94).kunci).toBe('pas');
    expect(arahSelisih(0).kunci).toBe('pas');
  });
});
