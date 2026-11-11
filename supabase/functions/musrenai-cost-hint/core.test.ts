import { describe, expect, test } from 'bun:test';
import { createHandler, parseInput, redact, validateHint } from './core';

const body = { judul: 'Perbaikan got', deskripsi: 'Got mampet di depan pasar', kategori: 'Jalan' };

describe('validateHint', () => {
  test('menerima rentang yang masuk akal', () => {
    expect(
      validateHint({ min: 80_000_000, max: 150_000_000, alasan: 'Asumsi panjang 50 m.' }),
    ).toEqual({
      min: 80_000_000,
      max: 150_000_000,
      alasan: 'Asumsi panjang 50 m.',
    });
  });
  test('menolak angka pasti, rentang terbalik, atau di luar batas', () => {
    const bad = [
      { min: 100_000_000, max: 100_000_000, alasan: 'x' },
      { min: 150_000_000, max: 80_000_000, alasan: 'x' },
      { min: -5, max: 10, alasan: 'x' },
      { min: 1_000, max: 5_000, alasan: 'x' },
      { min: 10_000_000, max: 1_000_000_000, alasan: 'x' },
      { min: 1.5e6, max: 3e6 + 0.5, alasan: 'x' },
      { min: '1000000', max: '2000000', alasan: 'x' },
      { min: 1_000_000, max: 2_000_000, alasan: '' },
      { min: 1_000_000, max: 2_000_000, alasan: 'lihat https://contoh.com' },
      { min: 1_000_000, max: 2_000_000, alasan: '<b>x</b>' },
      null,
    ];
    for (const value of bad) expect(() => validateHint(value)).toThrow();
  });
});

describe('parseInput dan redact', () => {
  test('hanya menerima judul, deskripsi, kategori yang valid', () => {
    expect(parseInput(body)).toEqual(body);
    expect(parseInput({ ...body, extra: 1 })).toBeNull();
    expect(parseInput({ ...body, judul: 'ab' })).toBeNull();
    expect(parseInput({ ...body, deskripsi: 'pendek' })).toBeNull();
    expect(parseInput('x')).toBeNull();
  });
  test('menyamarkan email dan telepon', () => {
    expect(redact('hubungi a@b.com atau 081234567890')).not.toMatch(/a@b\.com|081234567890/);
  });
});

describe('handler', () => {
  const make = (over: Partial<Parameters<typeof createHandler>[0]> = {}) => {
    const calls = { suggest: 0, reserve: 0, sent: undefined as unknown };
    const handler = createHandler({
      origin: 'http://localhost',
      authenticate: async (t) => (t === 'bad' ? null : 'user'),
      consume: async () => 'ok',
      reserve: async () => {
        calls.reserve += 1;
        return true;
      },
      suggest: async (input) => {
        calls.suggest += 1;
        calls.sent = input;
        return { min: 2_000_000, max: 5_000_000, alasan: 'Asumsi umum.' };
      },
      ...over,
    });
    const call = (token: string, payload: unknown = body) =>
      handler(
        new Request('http://localhost', {
          method: 'POST',
          headers: { authorization: 'Bearer ' + token },
          body: JSON.stringify(payload),
        }),
      );
    return { call, calls };
  };

  test('berhasil dan menyertakan label perkiraan', async () => {
    const { call } = make();
    const response = await call('ok');
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.min).toBe(2_000_000);
    expect(json.max).toBe(5_000_000);
    expect(json.label).toContain('bukan angka resmi');
  });
  test('data pribadi disamarkan sebelum dikirim ke penyedia', async () => {
    const { call, calls } = make();
    await call('ok', { ...body, deskripsi: 'Hubungi saya@contoh.com untuk got mampet' });
    expect(JSON.stringify(calls.sent)).not.toContain('saya@contoh.com');
  });
  test('menolak tanpa sesi dan tidak memanggil penyedia', async () => {
    const { call, calls } = make();
    expect((await call('bad')).status).toBe(401);
    expect(calls.reserve + calls.suggest).toBe(0);
  });
  test('input tidak valid ditolak sebelum kuota dipakai', async () => {
    const { call, calls } = make();
    expect((await call('ok', { judul: 'x' })).status).toBe(400);
    expect(calls.reserve + calls.suggest).toBe(0);
  });
  test('batas per warga dan kuota penyedia menghasilkan 429', async () => {
    expect((await make({ consume: async () => 'minute' }).call('ok')).status).toBe(429);
    const full = make({ reserve: async () => false });
    expect((await full.call('ok')).status).toBe(429);
    expect(full.calls.suggest).toBe(0);
  });
  test('gangguan sesaat penyedia diulang sekali dan memakai kuota sendiri', async () => {
    let tries = 0;
    const logs: string[][] = [];
    const { call, calls } = make({
      suggest: async () => {
        tries += 1;
        if (tries === 1) throw new Error('provider_status=503');
        return { min: 2_000_000, max: 5_000_000, alasan: 'Asumsi umum.' };
      },
      log: (s, c) => logs.push([s, c]),
      wait: async () => {},
    });
    const response = await call('ok');
    expect(response.status).toBe(200);
    expect(tries).toBe(2);
    expect(calls.reserve).toBe(2);
    expect(logs).toEqual([['suggest_retry', 'provider_status=503']]);
  });
  test('gangguan yang berulang berhenti setelah satu ulangan', async () => {
    let tries = 0;
    const { call } = make({
      suggest: async () => {
        tries += 1;
        throw new Error('provider_status=503');
      },
      wait: async () => {},
    });
    expect((await call('ok')).status).toBe(503);
    expect(tries).toBe(2);
  });
  test('kesalahan permanen penyedia tidak diulang', async () => {
    let tries = 0;
    const { call } = make({
      suggest: async () => {
        tries += 1;
        throw new Error('provider_status=400');
      },
      wait: async () => {},
    });
    expect((await call('ok')).status).toBe(503);
    expect(tries).toBe(1);
  });
  test('ulangan berhenti bila kuota penyedia habis', async () => {
    let reserves = 0;
    let tries = 0;
    const { call } = make({
      reserve: async () => (++reserves, reserves === 1),
      suggest: async () => {
        tries += 1;
        throw new Error('provider_status=503');
      },
      wait: async () => {},
    });
    expect((await call('ok')).status).toBe(503);
    expect(tries).toBe(1);
  });
  test('balasan model tidak sah menjadi 503 dan tidak bocor ke warga', async () => {
    const logs: string[][] = [];
    const { call } = make({
      suggest: async () => ({ min: 5_000_000, max: 5_000_000, alasan: 'pasti' }),
      log: (s, c) => logs.push([s, c]),
    });
    const response = await call('ok');
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('5000000');
    expect(logs).toEqual([['suggest', 'bad_schema']]);
  });
});
