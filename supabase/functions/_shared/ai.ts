// Klien tipis untuk API chat completions yang kompatibel dengan OpenAI.
// Satu lapisan ini dipakai MusrenAI Warga, triage admin, dan saran biaya, sehingga
// penyedia dapat diganti tanpa mengubah handler. Gemini dipakai lewat endpoint
// /v1beta/openai, OpenRouter lewat /api/v1, dan penyedia lain cukup lewat AI_BASE_URL.
//
// Sengaja tidak memakai paket `openai`: Edge Function Deno dan tes Bun berbagi berkas
// yang sama, sedangkan spesifier `npm:` tidak dapat di-resolve Bun. Bentuk permintaan
// dan balasan tetap mengikuti Chat Completions API.

export type AiProviderName = 'gemini' | 'openai' | 'openrouter' | 'custom';
export type AiStructuredOutput = 'json_schema' | 'json_object';
export type AiFeature = 'chat' | 'triage' | 'cost_hint';

export type AiConfig = {
  provider: AiProviderName;
  baseUrl: string;
  apiKey: string;
  model: string;
  structuredOutput: AiStructuredOutput;
  referer?: string;
  title: string;
};

export type AiMessage = { role: 'user' | 'assistant'; content: string };
export type AiSchema = { name: string; schema: Record<string, unknown> };
export type AiCompletionRequest = {
  system: string;
  messages: AiMessage[];
  schema: AiSchema;
  maxTokens: number;
  maxResponseChars?: number;
};
export type AiCompletion = { data: unknown; finishReason: string };
export type AiClient = (request: AiCompletionRequest, signal: AbortSignal) => Promise<AiCompletion>;

// Hanya gangguan sesaat yang boleh diulang: 5xx penyedia atau kegagalan jaringan.
export class AiTemporaryError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'AiTemporaryError';
  }
}

const PRESETS: Record<
  Exclude<AiProviderName, 'custom'>,
  { baseUrl: string; structuredOutput: AiStructuredOutput }
> = {
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    structuredOutput: 'json_schema',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    structuredOutput: 'json_schema',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    structuredOutput: 'json_schema',
  },
};

const PROVIDER_ALIASES: Record<string, AiProviderName> = {
  gemini: 'gemini',
  google: 'gemini',
  openai: 'openai',
  openrouter: 'openrouter',
  custom: 'custom',
  compatible: 'custom',
};

const FEATURE_KEYS: Record<AiFeature, string> = {
  chat: 'CHAT',
  triage: 'TRIAGE',
  cost_hint: 'COST_HINT',
};

// Nama model OpenRouter memakai awalan organisasi (`google/gemini-2.5-flash`),
// jadi garis miring dan titik dua harus diizinkan.
const MODEL = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,160}$/;
const MAX_KEY_LENGTH = 4096;

type Env = (name: string) => string | undefined;

function first(env: Env, names: string[]): string {
  for (const name of names) {
    const value = env(name)?.trim();
    if (value) return value;
  }
  return '';
}

function normalizeBaseUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return null;
  if (url.username || url.password) return null;
  return value.replace(/\/+$/, '');
}

function headerValue(value: string, max: number): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max || /[\r\n]/.test(trimmed)) return undefined;
  return trimmed;
}

function normalizeProvider(value: string): AiProviderName | null {
  if (!value) return 'gemini';
  return PROVIDER_ALIASES[value.toLowerCase()] ?? null;
}

function normalizeStructured(value: string, fallback: AiStructuredOutput): AiStructuredOutput {
  const normalized = value.toLowerCase();
  if (!normalized) return fallback;
  if (normalized === 'json_schema') return 'json_schema';
  if (normalized === 'json_object' || normalized === 'json') return 'json_object';
  return fallback;
}

/**
 * Baca konfigurasi penyedia dari environment. Urutan prioritas tiap nilai:
 * `AI_<FITUR>_*` -> `AI_*` -> nama lama `GEMINI_*` (hanya untuk key dan model).
 *
 * Fitur opsional memungkinkan campuran penyedia, misalnya triage di OpenRouter
 * sementara chat tetap di Gemini. Mengembalikan `null` bila konfigurasi belum
 * lengkap, sehingga handler tetap gagal tertutup.
 */
export function resolveAiConfig(env: Env, feature?: AiFeature): AiConfig | null {
  const prefix = feature ? `AI_${FEATURE_KEYS[feature]}_` : '';
  const scoped = (suffix: string) =>
    prefix ? [`${prefix}${suffix}`, `AI_${suffix}`] : [`AI_${suffix}`];

  const provider = normalizeProvider(first(env, scoped('PROVIDER')));
  if (!provider) return null;

  const baseUrlValue =
    first(env, scoped('BASE_URL')) || (provider === 'custom' ? '' : PRESETS[provider].baseUrl);
  const baseUrl = baseUrlValue ? normalizeBaseUrl(baseUrlValue) : null;
  if (!baseUrl) return null;

  const apiKey = first(env, [...scoped('API_KEY'), 'GEMINI_API_KEY']);
  const model = first(env, [...scoped('MODEL'), 'GEMINI_MODEL']);
  if (!apiKey || apiKey.length > MAX_KEY_LENGTH || !MODEL.test(model)) return null;

  const structuredOutput = normalizeStructured(
    first(env, scoped('STRUCTURED_OUTPUT')),
    provider === 'custom' ? 'json_object' : PRESETS[provider].structuredOutput,
  );

  return {
    provider,
    baseUrl,
    apiKey,
    model,
    structuredOutput,
    referer: headerValue(
      first(env, scoped('REFERER')) || env('MUSRENAI_ALLOWED_ORIGIN') || '',
      500,
    ),
    title: headerValue(first(env, scoped('TITLE')), 120) ?? 'Musrenbang Digital',
  };
}

function responseFormat(config: AiConfig, schema: AiSchema) {
  if (config.structuredOutput === 'json_object') return { type: 'json_object' };
  return {
    type: 'json_schema',
    json_schema: { name: schema.name, strict: true, schema: schema.schema },
  };
}

function messageText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) =>
      part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string'
        ? (part as { text: string }).text
        : '',
    )
    .join('');
}

function finishReason(value: unknown): string {
  return (
    String(value ?? 'none')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '') || 'none'
  );
}

export function createAiClient(config: AiConfig, fetcher: typeof fetch = fetch): AiClient {
  return async (request, signal) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };
    // OpenRouter memakai header ini untuk atribusi; penyedia lain mengabaikannya.
    if (config.provider === 'openrouter') {
      if (config.referer) headers['HTTP-Referer'] = config.referer;
      headers['X-Title'] = config.title;
    }

    // Model reasoning OpenAI menolak `max_tokens`; penyedia lain memakai nama lama.
    const tokenField = config.provider === 'openai' ? 'max_completion_tokens' : 'max_tokens';
    const response = await fetcher(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'system', content: request.system }, ...request.messages],
        [tokenField]: request.maxTokens,
        response_format: responseFormat(config, request.schema),
      }),
    });

    if ([500, 502, 503, 504].includes(response.status))
      throw new AiTemporaryError(`provider_status=${response.status}`);
    if (!response.ok) throw new Error(`provider_status=${response.status}`);

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error('bad_envelope');
    }
    const choice = (
      body as { choices?: { message?: { content?: unknown }; finish_reason?: unknown }[] }
    )?.choices?.[0];
    const finish = finishReason(choice?.finish_reason);
    const text = messageText(choice?.message?.content);
    const limit = request.maxResponseChars ?? 4000;
    if (!text.trim() || text.length > limit) throw new Error(`bad_text:finish=${finish}`);

    try {
      return { data: JSON.parse(text), finishReason: finish };
    } catch {
      throw new Error(`bad_json:finish=${finish}`);
    }
  };
}
