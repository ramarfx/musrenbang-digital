import { describe, expect, test } from 'bun:test';
import { createHandler, redact, validateReview } from './core';

describe('admin AI triage', () => {
  test('validates provider output and redacts common identifiers', () => {
    expect(
      validateReview({ flags: ['needs_review'], reason: 'Perlu pemeriksaan.' }, 'mock').flags,
    ).toEqual(['needs_review']);
    expect(() => validateReview({ flags: ['approved'], reason: 'x' }, 'mock')).toThrow();
    expect(redact('hubungi saya@example.com atau 081234567890')).not.toContain('saya@example.com');
    expect(redact('hubungi 081234567890')).not.toContain('081234567890');
  });
  test('rejects each invalid shape with a fixed rule code', () => {
    const cases: [unknown, string][] = [
      [null, 'not_object'],
      [[{ flags: [], reason: 'x' }], 'not_object'],
      [{ flags: 'spam', reason: 'x' }, 'flags_type'],
      [{ flags: ['spam', 'promotion', 'irrelevant', 'needs_review'], reason: 'x' }, 'flags_count'],
      [{ flags: ['approved'], reason: 'x' }, 'flags_value'],
      [{ flags: ['spam', 'spam'], reason: 'x' }, 'flags_duplicate'],
      [{ flags: [], reason: 1 }, 'reason_type'],
      [{ flags: [], reason: '  ' }, 'reason_empty'],
      [{ flags: [], reason: 'x'.repeat(501) }, 'reason_long'],
    ];
    for (const [value, code] of cases) expect(() => validateReview(value, 'mock')).toThrow(code);
  });
  test('admin receives analysis and results are persisted', async () => {
    let saved: unknown;
    const handler = createHandler({
      origin: 'http://localhost',
      authenticate: async () => 'admin',
      claim: async () => ({
        review_id: 1,
        token: 'lease',
        judul: 'Jalan',
        deskripsi: 'Rusak',
        kategori: 'Jalan',
      }),
      reserve: async () => true,
      analyze: async () => ({ flags: [], reason: 'Relevan', model: 'mock' }),
      finish: async (_id, _job, result) => {
        saved = result;
        return 'completed';
      },
    });
    const response = await handler(
      new Request('http://localhost', {
        method: 'POST',
        headers: { authorization: 'Bearer test', origin: 'http://localhost' },
        body: JSON.stringify({ proposal_id: 1 }),
      }),
    );
    expect(response.status).toBe(200);
    expect(saved).toEqual({ flags: [], reason: 'Relevan', model: 'mock' });
  });
  test('logs only the failed stage and a safe code, never proposal text', async () => {
    const logs: string[][] = [];
    const call = async (message: string) => {
      const handler = createHandler({
        origin: 'http://localhost',
        authenticate: async () => 'admin',
        claim: async () => ({
          review_id: 1,
          token: 'lease',
          judul: 'Judul rahasia',
          deskripsi: 'Isi rahasia 081234567890',
          kategori: 'Jalan',
        }),
        reserve: async () => true,
        analyze: async () => {
          throw new Error(message);
        },
        finish: async () => 'failed',
        log: (stage, code) => logs.push([stage, code]),
      });
      return handler(
        new Request('http://localhost', {
          method: 'POST',
          headers: { authorization: 'Bearer test' },
          body: JSON.stringify({ proposal_id: 1 }),
        }),
      );
    };
    expect((await call('provider_status=400')).status).toBe(503);
    expect((await call('Isi rahasia 081234567890')).status).toBe(503);
    expect(logs).toEqual([
      ['analyze', 'provider_status=400'],
      ['analyze', 'unknown'],
    ]);
  });
  test('logs reserve stage when the shared quota is exhausted', async () => {
    const logs: string[][] = [];
    const handler = createHandler({
      origin: 'http://localhost',
      authenticate: async () => 'admin',
      claim: async () => ({ review_id: 1, token: 't', judul: 'a', deskripsi: 'b', kategori: 'c' }),
      reserve: async () => false,
      analyze: async () => {
        throw new Error('unreachable');
      },
      finish: async () => 'failed',
      log: (stage, code) => logs.push([stage, code]),
    });
    const response = await handler(
      new Request('http://localhost', {
        method: 'POST',
        headers: { authorization: 'Bearer test' },
        body: JSON.stringify({ proposal_id: 1 }),
      }),
    );
    expect(response.status).toBe(503);
    expect(logs).toEqual([['reserve', 'quota']]);
  });
  describe('retry', () => {
    const run = async (errors: string[]) => {
      const calls = { reserve: 0, analyze: 0, finish: 0 };
      const logs: string[][] = [];
      let saved: unknown = 'unset';
      const handler = createHandler({
        origin: 'http://localhost',
        authenticate: async () => 'admin',
        claim: async () => ({
          review_id: 1,
          token: 't',
          judul: 'a',
          deskripsi: 'b',
          kategori: 'c',
        }),
        reserve: async () => {
          calls.reserve += 1;
          return calls.reserve <= (errors.includes('noquota') ? 1 : 9);
        },
        analyze: async () => {
          const next = errors[calls.analyze];
          calls.analyze += 1;
          if (next && next !== 'noquota') throw new Error(next);
          return { flags: [], reason: 'Relevan', model: 'mock' };
        },
        finish: async (_id, _job, result) => {
          calls.finish += 1;
          saved = result;
          return result ? 'completed' : 'failed';
        },
        log: (stage, code) => logs.push([stage, code]),
        wait: async () => {},
      });
      const response = await handler(
        new Request('http://localhost', {
          method: 'POST',
          headers: { authorization: 'Bearer test' },
          body: JSON.stringify({ proposal_id: 1 }),
        }),
      );
      return { status: response.status, calls, logs, saved };
    };
    test('retries once after a transient provider error and reserves quota again', async () => {
      const out = await run(['provider_status=503']);
      expect(out.status).toBe(200);
      expect(out.calls).toEqual({ reserve: 2, analyze: 2, finish: 1 });
      expect(out.logs).toEqual([['analyze_retry', 'provider_status=503']]);
      expect(out.saved).toEqual({ flags: [], reason: 'Relevan', model: 'mock' });
    });
    test('gives up after one retry', async () => {
      const out = await run(['provider_status=503', 'provider_status=502']);
      expect(out.status).toBe(503);
      expect(out.calls).toEqual({ reserve: 2, analyze: 2, finish: 1 });
      expect(out.saved).toBeNull();
      expect(out.logs.at(-1)).toEqual(['analyze', 'provider_status=502']);
    });
    test('does not retry quota, client, or malformed responses', async () => {
      for (const code of ['provider_status=429', 'provider_status=400', 'bad_json:finish=stop']) {
        const out = await run([code]);
        expect(out.status).toBe(503);
        expect(out.calls).toEqual({ reserve: 1, analyze: 1, finish: 1 });
      }
    });
    test('stops when the shared quota is exhausted before the retry', async () => {
      const out = await run(['provider_status=503', 'noquota']);
      expect(out.status).toBe(503);
      expect(out.calls).toEqual({ reserve: 2, analyze: 1, finish: 1 });
      expect(out.logs.at(-1)).toEqual(['reserve', 'quota']);
    });
  });
  test('rejects unauthenticated and non-admin requests without calling provider', async () => {
    let called = false;
    const handler = createHandler({
      origin: 'http://localhost',
      authenticate: async (token) => (token === 'user' ? 'user' : null),
      claim: async () => {
        throw new Error('not admin');
      },
      reserve: async () => {
        called = true;
        return true;
      },
      analyze: async () => {
        throw new Error('unreachable');
      },
      finish: async () => 'completed',
    });
    for (const token of ['bad', 'user']) {
      const response = await handler(
        new Request('http://localhost', {
          method: 'POST',
          headers: { authorization: 'Bearer ' + token },
          body: JSON.stringify({ proposal_id: 1 }),
        }),
      );
      expect([401, 403]).toContain(response.status);
    }
    expect(called).toBe(false);
  });
});
