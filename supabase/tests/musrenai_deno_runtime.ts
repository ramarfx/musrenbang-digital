import { createHandler } from '../functions/musrenai-chat/core.ts';

type Overrides = Record<string, unknown>;
function handler(overrides: Overrides = {}) {
  return createHandler({
    origin: 'https://frontend.example.invalid',
    faqApproved: true,
    authenticate: async (token: string) => (token === 'fixture-valid' ? 'fixture-user' : null),
    consume: async () => 'ok',
    reserveProvider: async () => true,
    provider: async () => ({
      answer: 'Jawaban sintetis',
      route_ids: [],
      disclaimer: null,
    }),
    ...overrides,
  } as Parameters<typeof createHandler>[0]);
}
async function request(
  overrides: Overrides,
  body: unknown,
  token = 'fixture-valid',
  origin = 'https://frontend.example.invalid',
) {
  const controller = new AbortController();
  const server = Deno.serve(
    {
      hostname: '127.0.0.1',
      port: 0,
      signal: controller.signal,
      onListen: () => {},
    },
    handler(overrides),
  );
  try {
    const address = server.addr as Deno.NetAddr;
    const response = await fetch(`http://127.0.0.1:${address.port}/`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        origin,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      body: await response.text(),
      cors: response.headers.get('access-control-allow-origin'),
    };
  } finally {
    controller.abort();
    await server.finished;
  }
}
function assert(value: boolean, message: string) {
  if (!value) throw new Error(message);
}
Deno.test('Deno HTTP: synthetic authenticated request and CORS', async () => {
  const r = await request({}, { message: 'Jalan rusak' });
  assert(r.status === 200 && r.cors === 'https://frontend.example.invalid', 'expected success');
});
Deno.test('Deno HTTP: invalid JWT and denied origin', async () => {
  assert((await request({}, { message: 'halo' }, 'expired')).status === 401, 'expected 401');
  assert(
    (await request({}, { message: 'halo' }, 'fixture-valid', 'https://other.example.invalid'))
      .status === 403,
    'expected 403',
  );
});
Deno.test('Deno HTTP: invalid input, history, and private data', async () => {
  for (const body of [
    { message: '' },
    { message: 'a'.repeat(1501) },
    {
      message: 'halo',
      history: [{ role: 'system', content: 'x' }],
    },
    { message: 'NIK 1234567890123456' },
  ])
    assert((await request({}, body)).status === 400, 'expected 400');
});
Deno.test('Deno HTTP: message and provider quota fail closed', async () => {
  assert(
    (await request({ consume: async () => 'day' }, { message: 'halo' })).status === 429,
    'message quota',
  );
  assert(
    (await request({ reserveProvider: async () => false }, { message: 'halo' })).status === 429,
    'provider quota',
  );
  assert(
    (
      await request(
        {
          reserveProvider: async () => {
            throw Error('fixture-secret');
          },
        },
        { message: 'halo' },
      )
    ).status === 503,
    'quota unavailable',
  );
});
Deno.test('Deno HTTP: FAQ disabled and provider errors do not leak', async () => {
  assert((await request({ faqApproved: false }, { message: 'halo' })).status === 503, 'disabled');
  const r = await request(
    {
      provider: async () => {
        throw Error('fixture-secret');
      },
    },
    { message: 'halo' },
  );
  assert(r.status === 503 && !r.body.includes('fixture-secret'), 'provider error');
});
Deno.test('Deno HTTP: provider timeout', async () => {
  const r = await request(
    {
      timeoutMs: 10,
      provider: async () => new Promise(() => {}),
    },
    { message: 'halo' },
  );
  assert(r.status === 504, 'expected timeout');
});
