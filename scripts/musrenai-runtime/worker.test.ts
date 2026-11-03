import { describe, expect, test } from 'bun:test';
import { runScheduler } from './worker';
import type { RuntimeConfig, WorkerActions } from './config';
const config: RuntimeConfig = {
  enabled: true,
  intervalMs: 30000,
  retentionDays: null,
  basicLog: false,
};
describe('scheduler', () => {
  test('tidak berjalan ketika nonaktif', async () => {
    let calls = 0;
    const action = async () => {
      calls++;
    };
    await runScheduler(
      { ...config, enabled: false },
      { reconcile: action, proposal: action, summary: action, prune: action },
      new AbortController().signal,
    );
    expect(calls).toBe(0);
  });
  test('satu siklus selesai sebelum siklus berikutnya dan berhenti saat dibatalkan', async () => {
    const calls: string[] = [];
    const controller = new AbortController();
    const actions: WorkerActions = {
      reconcile: async () => {
        calls.push('reconcile');
      },
      proposal: async () => {
        calls.push('proposal');
      },
      summary: async () => {
        calls.push('summary');
        controller.abort();
      },
      prune: async () => {
        calls.push('prune');
      },
    };
    await runScheduler(config, actions, controller.signal);
    expect(calls).toEqual(['reconcile', 'proposal', 'summary']);
  });
  test('kesalahan worker menghentikan scheduler', async () => {
    let calls = 0;
    const actions: WorkerActions = {
      reconcile: async () => {
        throw Error('fixture');
      },
      proposal: async () => {
        calls++;
      },
      summary: async () => {
        calls++;
      },
      prune: async () => {
        calls++;
      },
    };
    await expect(runScheduler(config, actions, new AbortController().signal)).rejects.toThrow();
    expect(calls).toBe(0);
  });
});
