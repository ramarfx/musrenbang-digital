import { resolveAiConfig } from '../_shared/ai.ts';
import { createHandler } from './core.ts';
import { createChatProvider } from './provider.ts';
import { withBoundedRetries } from './retry.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const publicKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const origin = Deno.env.get('MUSRENAI_ALLOWED_ORIGIN') ?? '';
const approved = Deno.env.get('MUSRENAI_FAQ_APPROVED') === 'true';
// Nama baru lebih netral; nama lama tetap dibaca agar deployment lama tidak rusak.
const enabled =
  Deno.env.get('MUSRENAI_AI_ENABLED') === 'true' ||
  Deno.env.get('MUSRENAI_GEMINI_ENABLED') === 'true';
const config = resolveAiConfig((name) => Deno.env.get(name), 'chat');
const reserve = async () => {
  if (!url || !serviceKey) throw new Error('provider quota unavailable');
  const response = await fetch(`${url}/rest/v1/rpc/reserve_musrenai_provider_attempt`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_feature: 'warga' }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('provider quota unavailable');
  return (await response.json()) === true;
};
const provider =
  enabled && config
    ? withBoundedRetries(createChatProvider(config), reserve)
    : async () => {
        throw new Error('not configured');
      };
Deno.serve(
  createHandler({
    origin,
    log: (stage, code) => console.error('musrenai-chat gagal', stage, code),
    faqApproved: approved && enabled && !!config,
    provider,
    reserveProvider: reserve,
    authenticate: async (token) => {
      if (!url || !publicKey) throw new Error('auth unavailable');
      const response = await fetch(`${url}/auth/v1/user`, {
        headers: { apikey: publicKey, Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) throw new Error('auth unavailable');
      const user = (await response.json()) as {
        id?: unknown;
        role?: unknown;
        is_anonymous?: unknown;
      };
      return typeof user.id === 'string' &&
        /^[0-9a-f-]{36}$/i.test(user.id) &&
        user.role === 'authenticated' &&
        user.is_anonymous !== true
        ? user.id
        : null;
    },
    consume: async (userId) => {
      if (!url || !serviceKey) throw new Error('limiter unavailable');
      const response = await fetch(`${url}/rest/v1/rpc/consume_musrenai_quota`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_user_id: userId }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('limiter unavailable');
      const value: unknown = await response.json();
      return typeof value === 'string' ? value : 'unavailable';
    },
  }),
);
