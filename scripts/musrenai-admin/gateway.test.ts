import { describe, expect, test } from 'bun:test';
import { createGuardedGateway } from './gateway';
import type { Job } from './worker';
const job: Job = {
  reviewId: 1,
  token: 'fixture',
  judul: 'Jalan rusak',
  deskripsi: 'Jalan berlubang',
  kategori: 'Pendidikan',
};
describe('gateway provider mock', () => {
  test('mencadangkan kuota sebelum memanggil provider', async () => {
    const calls: string[] = [];
    const gateway = createGuardedGateway({
      reserveAttempt: async () => {
        calls.push('reserve');
        return true;
      },
      invokeMock: async () => {
        calls.push('provider');
        return { flags: ['needs_review'], reason: 'Perlu tinjauan', model: 'mock' };
      },
    });
    expect((await gateway(job)).flags).toEqual(['needs_review']);
    expect(calls).toEqual(['reserve', 'provider']);
  });
  test('menutup akses ketika kuota habis atau limiter gagal', async () => {
    let calls = 0;
    for (const reserveAttempt of [
      async () => false,
      async () => {
        throw new Error('limiter gagal');
      },
    ]) {
      const gateway = createGuardedGateway({
        reserveAttempt,
        invokeMock: async () => {
          calls++;
          return {};
        },
      });
      await expect(gateway(job)).rejects.toThrow();
    }
    expect(calls).toBe(0);
  });
  test('menolak hasil provider tidak valid', async () => {
    const gateway = createGuardedGateway({
      reserveAttempt: async () => true,
      invokeMock: async () => ({ flags: ['approved'] }),
    });
    await expect(gateway(job)).rejects.toThrow();
  });
});
