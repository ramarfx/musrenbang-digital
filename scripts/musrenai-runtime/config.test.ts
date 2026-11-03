import { describe, expect, test } from 'bun:test';
import { parseConfig, tick, type WorkerActions } from './config';
const ref = 'abcdefghijklmnopqrst';
const valid = {
  MUSRENAI_WORKER_ENABLED: 'true',
  MUSRENAI_WORKER_MODE: 'mock',
  MUSRENAI_WORKER_PROJECT_REF: ref,
  MUSRENAI_WORKER_DATABASE_URL: `postgres://musrenai_worker_login:fake@db.${ref}.supabase.co/postgres`,
};
describe('runtime guard', () => {
  test('default off dan tidak memanggil dependensi', async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
    };
    expect(
      await tick(parseConfig({}), { reconcile: fn, proposal: fn, summary: fn, prune: fn }),
    ).toBe(false);
    expect(calls).toBe(0);
  });
  test('menolak target production, URL asing, user terlalu tinggi dan konfigurasi belum lengkap', () => {
    for (const env of [
      { ...valid, MUSRENAI_WORKER_PROJECT_REF: 'dogyibbzwfslspflsidm' },
      { ...valid, MUSRENAI_WORKER_DATABASE_URL: 'postgres://postgres:fake@localhost/postgres' },
      {
        ...valid,
        MUSRENAI_WORKER_DATABASE_URL: `postgres://postgres:fake@db.${ref}.supabase.co/postgres`,
      },
      {
        ...valid,
        MUSRENAI_WORKER_DATABASE_URL: `postgres://musrenai_worker_login:fake@db.${ref}.supabase.co:9999/postgres`,
      },
      { ...valid, MUSRENAI_WORKER_MODE: 'gemini' },
      { ...valid, MUSRENAI_WORKER_DATABASE_URL: '' },
      { ...valid, MUSRENAI_RETENTION_ENABLED: 'true', MUSRENAI_RETENTION_DAYS: '1' },
    ])
      expect(() => parseConfig(env)).toThrow();
  });
  test('satu siklus berurutan, retensi default mati', async () => {
    const calls: string[] = [];
    const actions: WorkerActions = {
      reconcile: async () => {
        calls.push('reconcile');
      },
      proposal: async () => {
        calls.push('proposal');
      },
      summary: async () => {
        calls.push('summary');
      },
      prune: async () => {
        calls.push('prune');
      },
    };
    expect(await tick(parseConfig(valid), actions)).toBe(true);
    expect(calls).toEqual(['reconcile', 'proposal', 'summary']);
  });
  test('error menghentikan siklus sebelum tahap berikutnya', async () => {
    let next = 0;
    await expect(
      tick(parseConfig(valid), {
        reconcile: async () => {
          throw Error('secret');
        },
        proposal: async () => {
          next++;
        },
        summary: async () => {
          next++;
        },
        prune: async () => {
          next++;
        },
      }),
    ).rejects.toThrow();
    expect(next).toBe(0);
  });
  test('retensi dan logging butuh konfigurasi eksplisit', () => {
    const defaults = parseConfig(valid);
    expect(defaults.retentionDays).toBeNull();
    expect(defaults.basicLog).toBe(false);
    const enabled = parseConfig({
      ...valid,
      MUSRENAI_RETENTION_ENABLED: 'true',
      MUSRENAI_RETENTION_DAYS: '90',
      MUSRENAI_WORKER_LOG_LEVEL: 'basic',
    });
    expect(enabled.retentionDays).toBe(90);
    expect(enabled.basicLog).toBe(true);
    expect(() => parseConfig({ ...valid, MUSRENAI_WORKER_LOG_LEVEL: 'verbose' })).toThrow();
  });
});
