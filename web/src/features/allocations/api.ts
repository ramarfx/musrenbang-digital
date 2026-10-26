import {
  allocationPayloadSchema,
  allocationReadSchema,
  type AllocationAmount,
} from '@musrenbang/shared';
import { z } from 'zod';
import { parseWith, requireUser, toAppError, unwrap } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export async function listUserAllocations(userId: string) {
  const data = await unwrap(
    supabase.from('allocations').select('kategori, jumlah').eq('user_id', userId),
    'alokasi',
  );
  return parseWith(z.array(allocationReadSchema), data, 'alokasi');
}

export async function saveAllocations(items: AllocationAmount[]) {
  await requireUser();
  const payload = parseWith(allocationPayloadSchema, items, 'alokasi');
  const { error } = await supabase.rpc('save_allocations', { p_rows: payload });
  if (error) throw toAppError(error, 'Gagal menyimpan alokasi.');
}
