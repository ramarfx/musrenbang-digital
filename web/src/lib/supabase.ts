import type { Database } from '@musrenbang/shared';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Satu-satunya client Supabase untuk browser. Hanya anon key yang dipakai;
 * service role key tidak pernah masuk bundle frontend.
 */
export const supabase = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
