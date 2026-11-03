import { describe, expect, test } from 'bun:test';
import { validateLocalDatabaseUrl } from './local-worker';
describe('local worker target guard', () => {
  test('mengizinkan hanya database pengujian lokal bernama eksplisit', () => {
    expect(
      validateLocalDatabaseUrl(
        'postgres://user:password@127.0.0.1:54322/musrenai_admin_test_example',
      ),
    ).toContain('127.0.0.1');
  });
  test('menolak remote, database lain dan parameter koneksi', () => {
    for (const target of [
      'postgres://user:password@remote.example/musrenai_admin_test_example',
      'postgres://user:password@localhost/postgres',
      'postgres://user:password@localhost/musrenai_admin_test_example?host=remote.example',
      'not-a-url',
    ])
      expect(() => validateLocalDatabaseUrl(target)).toThrow();
  });
});
