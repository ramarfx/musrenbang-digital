import { describe, expect, test } from 'bun:test';
import { assertSeedSchemaReady } from './seed-preflight';

describe('seed preflight schema', () => {
  test('mengizinkan seed hanya setelah semua endpoint migration MVP tersedia', () => {
    expect(() =>
      assertSeedSchemaReady([
        { resource: 'apbd_items provenance', error: null },
        { resource: 'proposal status notes', error: null },
        { resource: 'v_gap statistics', error: null },
      ]),
    ).not.toThrow();
  });

  test('menghentikan seed sebelum perubahan bila satu endpoint masih memakai schema lama', () => {
    expect(() =>
      assertSeedSchemaReady([
        { resource: 'apbd_items provenance', error: null },
        { resource: 'proposal status notes', error: { code: 'PGRST204' } },
        { resource: 'v_gap statistics', error: null },
      ]),
    ).toThrow('Seed dibatalkan sebelum data diubah.');
  });
});
