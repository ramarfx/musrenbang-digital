import { gapItemSchema, sortGapByMagnitude } from '@musrenbang/shared';
import { z } from 'zod';
import { parseWith, unwrap } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export async function listGap() {
  const data = await unwrap(supabase.from('v_gap').select('*'), 'gap warga-APBD');
  const items = parseWith(z.array(gapItemSchema), data, 'gap warga-APBD');
  return sortGapByMagnitude(items);
}
