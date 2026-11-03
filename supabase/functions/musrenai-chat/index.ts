import { createHandler } from './core.ts';
import { geminiProvider } from './provider.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const publicKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const key = Deno.env.get('GEMINI_API_KEY') ?? '';
const model = Deno.env.get('GEMINI_MODEL') ?? '';
const origin = Deno.env.get('MUSRENAI_ALLOWED_ORIGIN') ?? '';
const approved = Deno.env.get('MUSRENAI_FAQ_APPROVED') === 'true';
const provider =
  key && model
    ? geminiProvider(key, model)
    : async () => {
        throw new Error('not configured');
      };

Deno.serve(
  createHandler({
    origin,
    faqApproved: approved,
    provider,
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
