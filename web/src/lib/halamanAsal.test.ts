import { describe, expect, test } from 'bun:test';
import { tujuanSetelahLogin } from './halamanAsal';

describe('tujuanSetelahLogin', () => {
  test('ke beranda bila tanpa asal', () => {
    expect(tujuanSetelahLogin()).toBe('/beranda');
  });

  test('ke beranda bila asal adalah landing atau login', () => {
    expect(tujuanSetelahLogin('/')).toBe('/beranda');
    expect(tujuanSetelahLogin('/login')).toBe('/beranda');
  });

  test('ke halaman tujuan bila diminta khusus', () => {
    expect(tujuanSetelahLogin('/usulan/baru')).toBe('/usulan/baru');
    expect(tujuanSetelahLogin('/profil')).toBe('/profil');
  });
});
