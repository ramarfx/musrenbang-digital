import { describe, expect, test } from 'bun:test';
import {
  AiTemporaryError,
  createAiClient,
  resolveAiConfig,
  type AiCompletionRequest,
  type AiConfig,
} from './ai';

const env = (values: Record<string, string>) => (name: string) => values[name];
const gemini = { GEMINI_API_KEY: 'legacy-key', GEMINI_MODEL: 'gemini-2.5-flash' };
const request: AiCompletionRequest = {
  system: 'Balas JSON saja.',
  messages: [{ role: 'user', content: 'synthetic' }],
  schema: {
    name: 'synthetic',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: { answer: { type: 'string' } },
      required: ['answer'],
    },
  },
  maxTokens: 100,
};
const config: AiConfig = {
  provider: 'openrouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: 'synthetic-key',
  model: 'google/gemini-2.5-flash',
  structuredOutput: 'json_schema',
  referer: 'https://site.example',
  title: 'Musrenbang Digital',
};

describe('resolveAiConfig', () => {
  test('nama lama GEMINI_* tetap menjadi konfigurasi default Gemini', () => {
    expect(resolveAiConfig(env(gemini))).toEqual({
      provider: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: 'legacy-key',
      model: 'gemini-2.5-flash',
      structuredOutput: 'json_schema',
      referer: undefined,
      title: 'Musrenbang Digital',
    });
  });
  test('override per fitur memungkinkan campuran penyedia', () => {
    const values = {
      ...gemini,
      AI_TRIAGE_PROVIDER: 'openrouter',
      AI_TRIAGE_API_KEY: 'or-key',
      AI_TRIAGE_MODEL: 'google/gemini-2.5-flash',
    };
    const chat = resolveAiConfig(env(values), 'chat');
    const triage = resolveAiConfig(env(values), 'triage');
    expect(chat?.provider).toBe('gemini');
    expect(chat?.baseUrl).toBe('https://generativelanguage.googleapis.com/v1beta/openai');
    expect(triage).toMatchObject({
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: 'or-key',
      model: 'google/gemini-2.5-flash',
    });
  });
  test('penyedia custom wajib punya base URL https', () => {
    const base = { AI_PROVIDER: 'custom', AI_API_KEY: 'k', AI_MODEL: 'local-model' };
    expect(resolveAiConfig(env(base))).toBeNull();
    expect(
      resolveAiConfig(env({ ...base, AI_BASE_URL: 'http://localhost:11434/v1' })),
    ).not.toBeNull();
    expect(resolveAiConfig(env({ ...base, AI_BASE_URL: 'http://gateway.example/v1' }))).toBeNull();
    expect(
      resolveAiConfig(env({ ...base, AI_BASE_URL: 'https://gateway.example/v1' }))?.baseUrl,
    ).toBe('https://gateway.example/v1');
  });
  test('konfigurasi tidak lengkap atau tidak dikenal gagal tertutup', () => {
    expect(resolveAiConfig(env({}))).toBeNull();
    expect(
      resolveAiConfig(env({ AI_PROVIDER: 'unknown', AI_API_KEY: 'k', AI_MODEL: 'm' })),
    ).toBeNull();
    expect(resolveAiConfig(env({ AI_PROVIDER: 'openai', AI_MODEL: 'gpt-4.1' }))).toBeNull();
    expect(resolveAiConfig(env({ AI_PROVIDER: 'openai', AI_API_KEY: 'k' }))).toBeNull();
    expect(
      resolveAiConfig(env({ AI_PROVIDER: 'openai', AI_API_KEY: 'k', AI_MODEL: 'bad model' })),
    ).toBeNull();
  });
  test('json_object dapat dipilih untuk model yang tidak mendukung skema ketat', () => {
    expect(
      resolveAiConfig(
        env({
          ...gemini,
          AI_STRUCTURED_OUTPUT: 'json_object',
          AI_MODEL: 'google/gemini-2.5-flash',
        }),
      )?.structuredOutput,
    ).toBe('json_object');
  });
});

describe('createAiClient', () => {
  const ok = (content: string, finish = 'stop') =>
    Response.json({ choices: [{ finish_reason: finish, message: { content } }] });

  test('mengirim bentuk Chat Completions dengan bearer dan skema JSON', async () => {
    let url = '';
    let init: RequestInit | undefined;
    const client = createAiClient(config, (async (input, options) => {
      url = String(input);
      init = options;
      return ok('{"answer":"ok"}');
    }) as typeof fetch);
    const result = await client(request, new AbortController().signal);
    const body = JSON.parse(String(init?.body));
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer synthetic-key');
    expect(new Headers(init?.headers).get('x-title')).toBe('Musrenbang Digital');
    expect(new Headers(init?.headers).get('http-referer')).toBe('https://site.example');
    expect(body.messages[0]).toEqual({ role: 'system', content: 'Balas JSON saja.' });
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(result).toEqual({ data: { answer: 'ok' }, finishReason: 'stop' });
  });
  test('preset OpenAI memakai max_completion_tokens', async () => {
    let body: Record<string, unknown> = {};
    const client = createAiClient({ ...config, provider: 'openai' }, (async (_input, init) => {
      body = JSON.parse(String(init?.body));
      return ok('{"answer":"ok"}');
    }) as typeof fetch);
    await client(request, new AbortController().signal);
    expect(body.max_completion_tokens).toBe(100);
    expect(body.max_tokens).toBeUndefined();
  });
  test('json_object hanya meminta JSON valid tanpa skema', async () => {
    let body: { response_format?: unknown } = {};
    const client = createAiClient({ ...config, structuredOutput: 'json_object' }, (async (
      _input,
      init,
    ) => {
      body = JSON.parse(String(init?.body));
      return ok('{"answer":"ok"}');
    }) as typeof fetch);
    await client(request, new AbortController().signal);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });
  test('5xx menjadi error sementara, 429 dan 4xx tidak diulang', async () => {
    for (const status of [500, 502, 503, 504]) {
      const client = createAiClient(
        config,
        (async () => new Response('x', { status })) as typeof fetch,
      );
      await expect(client(request, new AbortController().signal)).rejects.toBeInstanceOf(
        AiTemporaryError,
      );
    }
    for (const status of [400, 401, 429]) {
      const client = createAiClient(
        config,
        (async () => new Response('x', { status })) as typeof fetch,
      );
      const failure = await client(request, new AbortController().signal).catch((error) => error);
      expect(failure).toBeInstanceOf(Error);
      expect(failure.message).toBe(`provider_status=${status}`);
      expect(failure).not.toBeInstanceOf(AiTemporaryError);
    }
  });
  test('isi tidak valid atau JSON rusak tidak membocorkan teks mentah', async () => {
    const empty = createAiClient(config, (async () => ok('')) as typeof fetch);
    await expect(empty(request, new AbortController().signal)).rejects.toThrow(
      'bad_text:finish=stop',
    );
    const broken = createAiClient(config, (async () => ok('bukan json')) as typeof fetch);
    await expect(broken(request, new AbortController().signal)).rejects.toThrow(
      'bad_json:finish=stop',
    );
  });
  test('menerima content berbentuk array bagian teks', async () => {
    const client = createAiClient(config, (async () =>
      Response.json({
        choices: [
          {
            finish_reason: 'stop',
            message: { content: [{ type: 'text', text: '{"answer":"ok"}' }] },
          },
        ],
      })) as typeof fetch);
    expect(await client(request, new AbortController().signal)).toEqual({
      data: { answer: 'ok' },
      finishReason: 'stop',
    });
  });
});
