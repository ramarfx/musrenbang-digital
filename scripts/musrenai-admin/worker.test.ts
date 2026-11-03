import { describe, expect, test } from 'bun:test';
import { rules, runOnce, validateResult, type Job, type Result } from './worker';
const job: Job = {
  reviewId: 1,
  token: 'fixture',
  judul: 'Jalan rusak',
  deskripsi: 'Tolong pemerintah perbaiki jalan berlubang',
  kategori: 'Infrastruktur',
};
describe('worker auto-flag', () => {
  test('kritik dan bahasa informal tidak otomatis spam', () => expect(rules(job)).toBeNull());
  test('promosi berupa indikasi perlu tinjauan', () =>
    expect(rules({ ...job, deskripsi: 'promo diskon beli sekarang' })?.flags).toContain(
      'needs_review',
    ));
  test('menolak output provider tidak valid', () =>
    expect(() => validateResult({ flags: ['approved'], reason: 'x', model: null })).toThrow());
  test('tanpa provider memakai hasil perlu tinjauan', async () => {
    const output: (Result | null)[] = [];
    await runOnce({
      claim: async () => job,
      finish: async (_, r) => {
        output.push(r);
      },
    });
    expect(output[0]?.flags).toContain('needs_review');
  });
  test('provider gagal dijadwalkan ulang', async () => {
    let failed = false;
    await runOnce(
      {
        claim: async () => job,
        finish: async (_, r) => {
          failed = r === null;
        },
      },
      async () => {
        throw new Error('mock');
      },
    );
    expect(failed).toBe(true);
  });
  test('kegagalan database tidak ditulis ulang sebagai kegagalan provider', async () => {
    let attempts = 0;
    await expect(
      runOnce({
        claim: async () => job,
        finish: async () => {
          attempts++;
          throw new Error('database unavailable');
        },
      }),
    ).rejects.toThrow('database unavailable');
    expect(attempts).toBe(1);
  });
});
