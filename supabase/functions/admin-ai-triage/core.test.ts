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
