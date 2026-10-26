import { categorySchema } from '@musrenbang/shared';
import { z } from 'zod';
import { parseWith, unwrap } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export async function listCategories() {
  const data = await unwrap(
    supabase.from('categories').select('id, nama').order('nama'),
    'kategori',
  );
  return parseWith(z.array(categorySchema), data, 'kategori');
}
