import { apbdItemSchema } from '@musrenbang/shared';
import { z } from 'zod';
import { parseWith, unwrap } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export async function listApbd() {
  const data = await unwrap(supabase.from('apbd_items').select('*').order('kategori'), 'data APBD');
  return parseWith(z.array(apbdItemSchema), data, 'data APBD');
}
