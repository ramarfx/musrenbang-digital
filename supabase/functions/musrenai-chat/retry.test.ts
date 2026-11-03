import { describe, expect, test } from 'bun:test';
import { ProviderTemporaryError, withBoundedRetries } from './retry';
import { geminiProvider, type ChatInput } from './provider';
const input: ChatInput = { message: 'synthetic', history: [] };
describe('provider retries', () => {
  test('gangguan sementara mencoba maksimal dua kali dengan reservasi tambahan', async () => {
    let calls = 0,
      reservations = 0;
    const run = withBoundedRetries(
      async () => {
        calls++;
        if (calls === 1) throw new ProviderTemporaryError('x');
        return 'ok';
      },
      async () => {
        reservations++;
        return true;
      },
      { wait: async () => {}, random: () => 0 },
    );
    expect(await run(input, new AbortController().signal)).toBe('ok');
    expect(calls).toBe(2);
    expect(reservations).toBe(1);
  });
  test('429 tidak diulang dan rahasia provider tidak bocor', async () => {
    let calls = 0,
      reservations = 0;
    const provider = geminiProvider('synthetic-key', 'synthetic-model', async () => {
      calls++;
      return new Response('secret', { status: 429 });
    });
    const run = withBoundedRetries(
      provider,
      async () => {
        reservations++;
        return true;
      },
      { wait: async () => {} },
    );
    await expect(run(input, new AbortController().signal)).rejects.toThrow('provider unavailable');
    expect(calls).toBe(1);
    expect(reservations).toBe(0);
  });
  test('kuota habis atau timeout mencegah retry jaringan', async () => {
    let calls = 0;
    const run = withBoundedRetries(
      async () => {
        calls++;
        throw new ProviderTemporaryError('x');
      },
      async () => false,
      { wait: async () => {} },
    );
    await expect(run(input, new AbortController().signal)).rejects.toThrow();
    expect(calls).toBe(1);
    const controller = new AbortController();
    controller.abort();
    await expect(run(input, controller.signal)).rejects.toThrow();
    expect(calls).toBe(1);
  });
});
