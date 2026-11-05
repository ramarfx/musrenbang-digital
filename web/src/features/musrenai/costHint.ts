import { supabase } from '@/lib/supabase';
import {
  parseSaranBiaya,
  saranBiayaGalat,
  type MasukanSaran,
  type SaranBiaya,
} from './costHintContract';

export async function mintaSaranBiaya(masukan: MasukanSaran): Promise<SaranBiaya> {
  const { data, error } = await supabase.functions.invoke('musrenai-cost-hint', {
    body: masukan,
  });
  if (error) {
    const status = error.context instanceof Response ? error.context.status : 0;
    throw new Error(saranBiayaGalat(status));
  }
  try {
    return parseSaranBiaya(data);
  } catch {
    throw new Error(saranBiayaGalat(0));
  }
}
