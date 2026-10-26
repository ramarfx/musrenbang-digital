import { configRowSchema, parseConfigRows } from '@musrenbang/shared';
import { z } from 'zod';
import { parseWith, unwrap } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export async function getAppConfig() {
  const data = await unwrap(supabase.from('config').select('kunci, nilai'), 'config');
  const rows = parseWith(z.array(configRowSchema), data, 'config');
  return parseConfigRows(rows);
}
